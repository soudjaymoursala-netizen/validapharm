import { IndisponibleAuthError, ReponseInvalideAuthError, TimeoutAuthError } from './erreurs'

export interface UtilisateurWire {
  id: string
  email: string
  nom: string
  prenom: string
  role: 'admin' | 'utilisateur'
  statut: 'actif' | 'desactive'
  createdAt: string
}

export interface ClientWire {
  id: string
  name: string
  adresse: string | null
  secteur: 'pharmaceutique' | 'dispositif_medical' | 'autre' | null
  details: string | null
  statut: 'actif' | 'archive'
  archivedAt: string | null
  archivedBy: string | null
  createdByUserId: string
  sharedWith: string[]
  createdAt: string
  updatedAt: string
}

export interface EntreeAuditWire {
  id: string
  acteurUserId: string
  acteurEmail: string
  action: string
  targetType: string
  targetId: string
  justification: string | null
  timestamp: string
}

export interface ParametreInstallationWire {
  cle: string
  valeur: Record<string, string>
  updatedAt: string
  updatedBy: string
}

export interface DocumentNormatifWire {
  id: string
  category: string
  titre: string
  filename: string
  source: string
  sourceRef: string | null
  extractedText: string
  mimeType: string
  hasBinaryContent: boolean
  uploadedAt: string
  uploadedBy: string
}

export interface NiveauHierarchieWire {
  key: string
  label: Record<'fr' | 'en' | 'de', string>
  numberingPattern: string
}

export interface AssetHierarchySchemaWire {
  clientId: string
  levels: NiveauHierarchieWire[]
}

export interface AssetNodeWire {
  id: string
  clientId: string
  workspaceId: string | null
  levelKey: string
  name: string
  code: string
  parentId: string | null
  associatedNodes: string[]
  source: 'manuel' | 'qms_pull' | 'import_fichier'
  qmsConnectorId: string | null
  periodicQualification: { applicable: boolean; deadline: string | null }
  qualificationStatus: string
  auditLog: { timestamp: string; actor: string; action: string }[]
  createdAt: string
  updatedAt: string
}

export interface RelationTechniqueWire {
  id: string
  clientId: string
  typeRelation: string
  noeudSourceId: string
  noeudCibleId: string
  createdAt: string
}

export interface SaisieCreationNoeudWire {
  /** Réservé à l'import en lot (`creerNoeudsEnLot`) — voir sa documentation pour pourquoi le client impose l'identifiant dans ce cas précis. Ignoré par `creerNoeud` (création manuelle). */
  id?: string
  levelKey: string
  name: string
  code: string
  parentId: string | null
  workspaceId?: string | null
}

export interface OrganizationWire {
  id: string
  nom: string
  createdAt: string
}

export interface WorkspaceWire {
  id: string
  organizationId: string
  type: string
  nom: string
  parentWorkspaceId: string | null
  createdAt: string
}

export interface SaisieCreationDocumentNormatif {
  category: string
  titre: string
  filename: string
  source: string
  sourceRef?: string | null
  mimeType: string
  texte: string
  contenu?: Blob
}

export type ResultatApi<T> =
  { ok: true; donnees: T } | { ok: false; erreur: string; status: number }

const DELAI_MAX_PAR_DEFAUT_MS = 15_000

/**
 * Client du Worker d'authentification — mêmes principes que
 * `RelayProviderAdapter`/`OcrRelayAdapter` : n'expose que l'URL du relais,
 * jamais l'implémentation D1 sous-jacente. Renvoie un `ResultatApi<T>`
 * typé pour tout échec métier attendu (identifiants invalides, rôle
 * insuffisant, justification manquante...) — jamais une exception pour un
 * cas prévu par la conception (même discipline que
 * `archiverClient`/`modifierClient`) ; les erreurs levées
 * (`IndisponibleAuthError`/`TimeoutAuthError`/`ReponseInvalideAuthError`)
 * restent réservées aux échecs de connectivité réels.
 */
export class AuthApiClient {
  constructor(
    private readonly relayUrl: string,
    private readonly delaiMaxMs: number = DELAI_MAX_PAR_DEFAUT_MS,
  ) {}

  // --- Vérification de connexion (« Tester la connexion », avant toute
  // authentification réelle — voir routeur.ts du Worker) ---

  verifierSante(): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('GET', '/sante')
  }

  // --- Authentification ---

  login(
    email: string,
    motDePasse: string,
  ): Promise<ResultatApi<{ jeton: string; utilisateur: UtilisateurWire }>> {
    return this.requete('POST', '/auth/login', { body: { email, motDePasse } })
  }

  me(jeton: string): Promise<ResultatApi<{ utilisateur: UtilisateurWire }>> {
    return this.requete('GET', '/auth/me', { jeton })
  }

  modifierProfil(
    jeton: string,
    changements: { nom?: string; prenom?: string },
  ): Promise<ResultatApi<{ utilisateur: UtilisateurWire }>> {
    return this.requete('PATCH', '/auth/me', { jeton, body: changements })
  }

  changerMotDePasse(
    jeton: string,
    motDePasseActuel: string,
    nouveauMotDePasse: string,
  ): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('POST', '/auth/change-password', {
      jeton,
      body: { motDePasseActuel, nouveauMotDePasse },
    })
  }

  verifierMotDePasse(jeton: string, motDePasse: string): Promise<ResultatApi<{ valide: boolean }>> {
    return this.requete('POST', '/auth/verify-password', { jeton, body: { motDePasse } })
  }

  // --- Administration des comptes ---

  listerUtilisateurs(jeton: string): Promise<ResultatApi<{ utilisateurs: UtilisateurWire[] }>> {
    return this.requete('GET', '/admin/utilisateurs', { jeton })
  }

  creerUtilisateur(
    jeton: string,
    saisie: {
      email: string
      motDePasse: string
      nom: string
      prenom: string
      role: 'admin' | 'utilisateur'
    },
  ): Promise<ResultatApi<{ utilisateur: UtilisateurWire }>> {
    return this.requete('POST', '/admin/utilisateurs', { jeton, body: saisie })
  }

  modifierUtilisateur(
    jeton: string,
    id: string,
    changements: { role?: 'admin' | 'utilisateur'; statut?: 'actif' | 'desactive' },
  ): Promise<ResultatApi<{ utilisateur: UtilisateurWire }>> {
    return this.requete('PATCH', `/admin/utilisateurs/${id}`, { jeton, body: changements })
  }

  // --- Audit ---

  listerAudit(jeton: string, limite = 50): Promise<ResultatApi<{ entrees: EntreeAuditWire[] }>> {
    return this.requete('GET', `/admin/audit?limite=${limite}`, { jeton })
  }

  autoriserAction(
    jeton: string,
    saisie: { action: string; targetType: string; targetId: string; justification: string },
  ): Promise<ResultatApi<{ authorized: true; auditId: string }>> {
    return this.requete('POST', '/audit/authorize-action', { jeton, body: saisie })
  }

  // --- Clients (D1 = source de vérité) ---

  listerClients(jeton: string): Promise<ResultatApi<{ clients: ClientWire[] }>> {
    return this.requete('GET', '/clients', { jeton })
  }

  creerClient(
    jeton: string,
    saisie: {
      name: string
      adresse?: string | null
      secteur?: ClientWire['secteur']
      details?: string | null
    },
  ): Promise<ResultatApi<{ client: ClientWire }>> {
    return this.requete('POST', '/clients', { jeton, body: saisie })
  }

  obtenirClient(jeton: string, id: string): Promise<ResultatApi<{ client: ClientWire }>> {
    return this.requete('GET', `/clients/${id}`, { jeton })
  }

  modifierClient(
    jeton: string,
    id: string,
    changements: Partial<{
      name: string
      adresse: string | null
      secteur: ClientWire['secteur']
      details: string | null
      statut: ClientWire['statut']
      sharedWith: string[]
    }>,
  ): Promise<ResultatApi<{ client: ClientWire }>> {
    return this.requete('PATCH', `/clients/${id}`, { jeton, body: changements })
  }

  supprimerClientDefinitivement(
    jeton: string,
    id: string,
    justification: string,
  ): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('DELETE', `/clients/${id}`, { jeton, body: { justification } })
  }

  // --- Structure Système (référentiel d'actifs, D1 = source de vérité, Phase 1 du chantier de migration D1) ---

  obtenirStructureSysteme(
    jeton: string,
    clientId: string,
  ): Promise<
    ResultatApi<{
      schema: AssetHierarchySchemaWire
      noeuds: AssetNodeWire[]
      relationsTechniques: RelationTechniqueWire[]
    }>
  > {
    return this.requete('GET', `/clients/${clientId}/structure-systeme`, { jeton })
  }

  enregistrerSchemaHierarchie(
    jeton: string,
    clientId: string,
    levels: NiveauHierarchieWire[],
  ): Promise<ResultatApi<{ schema: AssetHierarchySchemaWire }>> {
    return this.requete('PUT', `/clients/${clientId}/structure-systeme/schema`, {
      jeton,
      body: { levels },
    })
  }

  creerNoeud(
    jeton: string,
    clientId: string,
    saisie: SaisieCreationNoeudWire,
  ): Promise<ResultatApi<{ noeud: AssetNodeWire }>> {
    return this.requete('POST', `/clients/${clientId}/structure-systeme/noeuds`, {
      jeton,
      body: saisie,
    })
  }

  creerNoeudsEnLot(
    jeton: string,
    clientId: string,
    noeuds: SaisieCreationNoeudWire[],
    action: string,
  ): Promise<ResultatApi<{ noeuds: AssetNodeWire[] }>> {
    return this.requete('POST', `/clients/${clientId}/structure-systeme/noeuds/lot`, {
      jeton,
      body: { noeuds, action },
    })
  }

  modifierNoeud(
    jeton: string,
    clientId: string,
    noeudId: string,
    changements: {
      parentId?: string | null
      qualificationStatus?: string
      periodicQualification?: { applicable: boolean; deadline: string | null }
      action?: string
    },
  ): Promise<ResultatApi<{ noeud: AssetNodeWire }>> {
    return this.requete('PATCH', `/clients/${clientId}/structure-systeme/noeuds/${noeudId}`, {
      jeton,
      body: changements,
    })
  }

  /** Réservé au filet de sécurité de migration locale — voir la documentation de la route Worker `gererMigrerNoeudsLocaux` : seule voie qui accepte un nœud déjà complet (statut de qualification/périodicité/journal d'audit/horodatages d'origine), jamais fabriqués ici. */
  migrerNoeudsLocaux(
    jeton: string,
    clientId: string,
    noeuds: Omit<AssetNodeWire, 'clientId'>[],
  ): Promise<ResultatApi<{ noeuds: AssetNodeWire[] }>> {
    return this.requete('POST', `/clients/${clientId}/structure-systeme/noeuds/migration-locale`, {
      jeton,
      body: { noeuds },
    })
  }

  creerRelationTechnique(
    jeton: string,
    clientId: string,
    saisie: { typeRelation: string; noeudSourceId: string; noeudCibleId: string },
  ): Promise<ResultatApi<{ relation: RelationTechniqueWire }>> {
    return this.requete('POST', `/clients/${clientId}/structure-systeme/relations-techniques`, {
      jeton,
      body: saisie,
    })
  }

  // --- Organization/Workspace (Phase 2 du chantier de migration D1) ---

  obtenirOrganisation(
    jeton: string,
    clientId: string,
  ): Promise<ResultatApi<{ organization: OrganizationWire | null; workspaces: WorkspaceWire[] }>> {
    return this.requete('GET', `/clients/${clientId}/organisation`, { jeton })
  }

  migrerClientVersOrganisation(
    jeton: string,
    clientId: string,
  ): Promise<ResultatApi<{ organization: OrganizationWire; workspaceRacine: WorkspaceWire }>> {
    return this.requete('POST', `/clients/${clientId}/organisation/migrer`, { jeton })
  }

  creerWorkspace(
    jeton: string,
    clientId: string,
    saisie: { nom: string; parentWorkspaceId: string },
  ): Promise<ResultatApi<{ workspace: WorkspaceWire }>> {
    return this.requete('POST', `/clients/${clientId}/organisation/workspaces`, {
      jeton,
      body: saisie,
    })
  }

  // --- Paramètres d'installation (dépôt GitHub, Relais IA, Drive normes — globaux, partagés par tous les comptes) ---

  obtenirParametreInstallation(
    jeton: string,
    cle: string,
  ): Promise<ResultatApi<{ parametre: ParametreInstallationWire | null }>> {
    return this.requete('GET', `/parametres-installation/${cle}`, { jeton })
  }

  enregistrerParametreInstallation(
    jeton: string,
    cle: string,
    valeur: Record<string, string>,
  ): Promise<ResultatApi<{ parametre: ParametreInstallationWire }>> {
    return this.requete('PUT', `/parametres-installation/${cle}`, { jeton, body: { valeur } })
  }

  effacerParametreInstallation(jeton: string, cle: string): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('DELETE', `/parametres-installation/${cle}`, { jeton })
  }

  // --- OAuth Google (Drive normes) — jeton de rafraîchissement longue durée, remplace la copie manuelle depuis l'OAuth Playground (voir #35/#36/#37) ---

  /** Réservé à un admin (même exigence que `enregistrerParametreInstallation`, dont cette connexion tient lieu) — l'appelant doit rediriger `window.location.href` vers l'URL renvoyée, jamais la charger en `fetch`. */
  demarrerConnexionOAuthDrive(jeton: string): Promise<ResultatApi<{ urlAutorisation: string }>> {
    return this.requete('GET', '/drive-oauth/demarrer', { jeton })
  }

  /** Jeton d'accès frais (jamais persisté par l'appelant, valable ~1h) à partir du jeton de rafraîchissement déjà connecté — `oauth_non_connecte` si `connecterDriveAvecGoogle` n'a jamais été fait. */
  rafraichirJetonOAuthDrive(
    jeton: string,
  ): Promise<ResultatApi<{ jeton: string; expiresIn: number }>> {
    return this.requete('POST', '/drive-oauth/rafraichir-jeton', { jeton })
  }

  // --- Documents normatifs (Bibliothèque de normes — global à l'installation) ---

  listerDocumentsNormatifs(
    jeton: string,
  ): Promise<ResultatApi<{ documents: DocumentNormatifWire[] }>> {
    return this.requete('GET', '/documents-normatifs', { jeton })
  }

  /** Corps `multipart/form-data` (jamais JSON) — le texte extrait et le contenu binaire éventuel peuvent être volumineux, jamais adaptés à un `JSON.stringify`. */
  creerDocumentNormatif(
    jeton: string,
    saisie: SaisieCreationDocumentNormatif,
  ): Promise<ResultatApi<{ document: DocumentNormatifWire }>> {
    const formData = new FormData()
    formData.set(
      'metadata',
      JSON.stringify({
        category: saisie.category,
        titre: saisie.titre,
        filename: saisie.filename,
        source: saisie.source,
        sourceRef: saisie.sourceRef ?? undefined,
        mimeType: saisie.mimeType,
      }),
    )
    formData.set('texte', saisie.texte)
    if (saisie.contenu) formData.set('contenu', saisie.contenu, saisie.filename)
    return this.requeteFormData('POST', '/documents-normatifs', jeton, formData)
  }

  renommerDocumentNormatif(
    jeton: string,
    id: string,
    titre: string,
  ): Promise<ResultatApi<{ document: DocumentNormatifWire }>> {
    return this.requete('PATCH', `/documents-normatifs/${id}`, { jeton, body: { titre } })
  }

  supprimerDocumentNormatif(jeton: string, id: string): Promise<ResultatApi<{ ok: true }>> {
    return this.requete('DELETE', `/documents-normatifs/${id}`, { jeton })
  }

  /** Recale `hasBinaryContent` sur le contenu réellement présent côté serveur pour ce lot de documents (voir #35/#36 : un ancien import de masse a pu marquer un fichier disponible à tort). */
  diagnostiquerContenuDocumentsNormatifs(
    jeton: string,
    ids: string[],
  ): Promise<
    ResultatApi<{ resultats: { id: string; hasBinaryContent: boolean; corrige: boolean }[] }>
  > {
    return this.requete('POST', '/documents-normatifs/diagnostiquer', { jeton, body: { ids } })
  }

  /** Contenu binaire brut d'un document — jamais du JSON, contourne `requete()`. */
  async obtenirContenuDocumentNormatif(
    jeton: string,
    id: string,
  ): Promise<{ ok: true; blob: Blob } | { ok: false; erreur: string }> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)
    let reponse: Response
    try {
      reponse = await fetch(`${this.relayUrl}/documents-normatifs/${id}/contenu`, {
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${jeton}` },
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }
    if (reponse.status >= 500) throw new IndisponibleAuthError()
    if (!reponse.ok) {
      const corps = await reponse.json().catch(() => null)
      const erreur =
        corps && typeof corps === 'object' && 'erreur' in corps && typeof corps.erreur === 'string'
          ? corps.erreur
          : 'erreur_inconnue'
      return { ok: false, erreur }
    }
    return { ok: true, blob: await reponse.blob() }
  }

  /**
   * Remplace le contenu binaire d'un document déjà existant (jamais ses
   * métadonnées) — corps brut, jamais du JSON ni du multipart : contourne
   * `requete()`/`requeteFormData()` comme `obtenirContenuDocumentNormatif`.
   * Réservé à la réparation d'un document dont le contenu s'est révélé
   * vide après coup (voir #35) — jamais un chemin de création.
   */
  async repararContenuDocumentNormatif(
    jeton: string,
    id: string,
    contenu: Blob,
    mimeType: string,
  ): Promise<ResultatApi<{ document: DocumentNormatifWire }>> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)
    let reponse: Response
    try {
      reponse = await fetch(`${this.relayUrl}/documents-normatifs/${id}/contenu`, {
        method: 'PUT',
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': mimeType },
        body: contenu,
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }
    if (reponse.status >= 500) throw new IndisponibleAuthError()
    const corps = await reponse.json().catch(() => null)
    if (!reponse.ok) {
      const erreur =
        corps && typeof corps === 'object' && 'erreur' in corps && typeof corps.erreur === 'string'
          ? corps.erreur
          : 'erreur_inconnue'
      return { ok: false, erreur, status: reponse.status }
    }
    return { ok: true, donnees: corps as { document: DocumentNormatifWire } }
  }

  // --- Aide ---

  private async requeteFormData<T>(
    methode: string,
    chemin: string,
    jeton: string,
    formData: FormData,
  ): Promise<ResultatApi<T>> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      // Jamais de `Content-Type` explicite ici : le navigateur doit poser
      // lui-même l'en-tête `multipart/form-data; boundary=...` — un
      // `Content-Type` manuel casserait le découpage des parties.
      reponse = await fetch(`${this.relayUrl}${chemin}`, {
        method: methode,
        signal: controleur.signal,
        headers: { Authorization: `Bearer ${jeton}` },
        body: formData,
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }

    if (reponse.status >= 500) throw new IndisponibleAuthError()

    let corps: unknown
    try {
      corps = await reponse.json()
    } catch {
      throw new ReponseInvalideAuthError()
    }
    if (typeof corps !== 'object' || corps === null) {
      throw new ReponseInvalideAuthError()
    }

    if (!reponse.ok) {
      const erreur =
        'erreur' in corps && typeof (corps as { erreur?: unknown }).erreur === 'string'
          ? (corps as { erreur: string }).erreur
          : 'erreur_inconnue'
      return { ok: false, erreur, status: reponse.status }
    }
    return { ok: true, donnees: corps as T }
  }

  private async requete<T>(
    methode: string,
    chemin: string,
    options: { jeton?: string; body?: unknown } = {},
  ): Promise<ResultatApi<T>> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    let reponse: Response
    try {
      reponse = await fetch(`${this.relayUrl}${chemin}`, {
        method: methode,
        signal: controleur.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.jeton ? { Authorization: `Bearer ${options.jeton}` } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutAuthError()
      throw new IndisponibleAuthError()
    } finally {
      clearTimeout(minuteur)
    }

    if (reponse.status >= 500) throw new IndisponibleAuthError()

    let corps: unknown
    try {
      corps = await reponse.json()
    } catch {
      throw new ReponseInvalideAuthError()
    }
    if (typeof corps !== 'object' || corps === null) {
      throw new ReponseInvalideAuthError()
    }

    if (!reponse.ok) {
      const erreur =
        'erreur' in corps && typeof (corps as { erreur?: unknown }).erreur === 'string'
          ? (corps as { erreur: string }).erreur
          : 'erreur_inconnue'
      return { ok: false, erreur, status: reponse.status }
    }
    return { ok: true, donnees: corps as T }
  }
}

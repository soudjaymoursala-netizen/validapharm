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
  secteur: 'pharma' | 'dispositif_medical' | 'autre' | null
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

export type ResultatApi<T> =
  { ok: true; donnees: T } | { ok: false; erreur: string; status: number }

const DELAI_MAX_PAR_DEFAUT_MS = 15_000

/**
 * Client du Worker d'authentification (TD-046) — mêmes principes que
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

  // --- Clients (D1 = source de vérité, TD-046) ---

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

  // --- Aide ---

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

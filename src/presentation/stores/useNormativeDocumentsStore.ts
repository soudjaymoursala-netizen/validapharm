import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocumentNormatifWire } from '../../connecteurs/auth/AuthApiClient'
import { extraireTexteDocx } from '../../connecteurs/office/DocxNatifAdapter'
import { extraireTextePdf } from '../../connecteurs/pdf/PdfNatifAdapter'
import {
  DriveReaderConnector,
  MIME_TYPES_GOOGLE_NATIFS,
  type FichierDrive,
} from '../../connecteurs/drive/DriveReaderConnector'
import type { EntreeArborescence } from '../../connecteurs/github/GitHubConnector'
import { documentsNormatifsAMigrer } from '../../persistance/db'
import type {
  CategorieDocumentNormatif,
  NormativeDocument,
  SourceDocumentNormatif,
} from '../../logique-metier/domaine/types'
import { useAuthStore } from './useAuthStore'
import { useConnexionGitHubStore } from './useConnexionGitHubStore'

/** Extensions dont l'extraction native (locale, sans réseau) est supportée par ce chantier. */
const EXTENSIONS_TEXTE_BRUT = ['.txt', '.md']

const CLE_PARAMETRE_DRIVE_NORMES = 'drive-normes'

interface ConnexionDriveLectureNormes {
  dossierId: string
  jeton: string
}

/**
 * `refreshToken` n'apparaît que pour une connexion établie via
 * `connecterDriveAvecGoogle` (OAuth, #37 bis) — jamais pour l'ancienne
 * configuration manuelle (jeton d'accès recopié depuis l'OAuth Playground,
 * valable 1h, cause du #35/#36/#37). Sa présence déclenche un
 * renouvellement systématique du jeton avant tout usage : jamais de risque
 * de jeton expiré en cours d'un import/réparation de masse.
 */
async function obtenirConnexionDriveNormes(): Promise<ConnexionDriveLectureNormes | null> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) return null
  const resultat = await api.obtenirParametreInstallation(
    authStore.jeton,
    CLE_PARAMETRE_DRIVE_NORMES,
  )
  if (!resultat.ok || !resultat.donnees.parametre) return null
  const valeur = resultat.donnees.parametre.valeur as unknown as ConnexionDriveLectureNormes & {
    refreshToken?: string
  }
  if (!valeur.refreshToken) return valeur

  const frais = await api.rafraichirJetonOAuthDrive(authStore.jeton)
  if (!frais.ok) throw new Error(`Échec du renouvellement du jeton Drive : ${frais.erreur}`)
  return { dossierId: valeur.dossierId, jeton: frais.donnees.jeton }
}

export type ResultatConnexionOAuthDrive =
  { ok: true; urlAutorisation: string } | { ok: false; erreur: string }

/**
 * Démarre la connexion Google Drive par OAuth (jeton de rafraîchissement
 * longue durée) — l'appelant doit naviguer le navigateur vers
 * `urlAutorisation` (`window.location.href = ...`), jamais un `fetch` : la
 * suite se passe entièrement sur les domaines Google puis le Worker
 * (`/drive-oauth/callback`), hors de la SPA.
 */
async function connecterDriveAvecGoogle(): Promise<ResultatConnexionOAuthDrive> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) {
    return { ok: false, erreur: "Relais d'authentification non configuré (Configuration client)." }
  }
  const resultat = await api.demarrerConnexionOAuthDrive(authStore.jeton)
  if (!resultat.ok) return { ok: false, erreur: resultat.erreur }
  return { ok: true, urlAutorisation: resultat.donnees.urlAutorisation }
}

export type ResultatConnexionDriveNormes =
  { ok: true; nbFichiers: number } | { ok: false; message: string }

async function extraireTexteSelonExtension(
  nomFichier: string,
  contenu: ArrayBuffer,
): Promise<string> {
  const nom = nomFichier.toLowerCase()
  if (nom.endsWith('.pdf')) return (await extraireTextePdf(contenu)).texte
  if (nom.endsWith('.docx')) return (await extraireTexteDocx(contenu)).texte
  return new TextDecoder('utf-8').decode(contenu)
}

function wireVersDomaine(wire: DocumentNormatifWire): NormativeDocument {
  return {
    id: wire.id,
    category: wire.category as CategorieDocumentNormatif,
    titre: wire.titre,
    filename: wire.filename,
    source: wire.source as SourceDocumentNormatif,
    source_ref: wire.sourceRef,
    extracted_text: wire.extractedText,
    has_binary_content: wire.hasBinaryContent,
    mime_type: wire.mimeType,
    uploaded_at: wire.uploadedAt,
    uploaded_by: wire.uploadedBy,
  }
}

/**
 * Bibliothèque de normes — documents importés (§4.5, chantier "Normes &
 * Guidelines") : téléversement direct, lecture d'un dépôt GitHub (le dépôt
 * unique déjà configuré pour toute l'installation, `useConnexionGitHubStore`
 * — Worker/D1), lecture d'un dossier Google Drive dédié (paramètre
 * d'installation `drive-normes`, également Worker/D1 — une configuration
 * globale distincte du miroir d'écriture par client). Les documents
 * eux-mêmes (texte extrait + fichier binaire d'origine) vivent désormais
 * côté Worker (D1 pour les métadonnées, R2 pour le contenu volumineux) —
 * jamais IndexedDB seule : un stockage local ne survivait jamais à un
 * changement d'appareil (même correctif que la config GitHub/Relais IA/
 * Drive plus tôt).
 *
 * **Limite assumée pour la lecture GitHub** : `GitHubConnector.lire` décode
 * son contenu en UTF-8 (conçu pour les fichiers de données texte de
 * l'application) — un fichier binaire (`.docx`/`.pdf`) lu par cette voie
 * serait corrompu silencieusement. Seuls `.md`/`.txt` sont donc acceptés
 * depuis GitHub dans ce lot ; `.docx`/`.pdf` restent réservés au
 * téléversement direct et à Google Drive (`DriveReaderConnector.
 * telechargerContenu`, un vrai flux binaire) — jamais une conversion
 * approximative pour contourner cette limite.
 *
 * @requirement Bibliothèque de normes — import multi-format
 */
export const useNormativeDocumentsStore = defineStore('normativeDocuments', () => {
  const documents = ref<NormativeDocument[]>([])
  const enChargement = ref(false)

  /**
   * Envoie au serveur les documents capturés depuis l'ancienne table
   * IndexedDB locale (`db.documentsNormatifsAMigrer`) juste avant sa
   * suppression — n'a d'effet réel qu'une seule fois, sur le premier
   * navigateur qui ouvre l'application avec ce code (voir migration
   * Dexie v33, `persistance/db.ts`) : sans ce filet, ces documents
   * n'existant qu'en local seraient perdus définitivement. Retire chaque
   * document de la file uniquement après son envoi réussi, pour réessayer
   * automatiquement au prochain chargement en cas d'échec réseau/serveur
   * (ex. relais d'authentification pas encore joignable).
   */
  async function migrerDocumentsLocauxVersServeur(): Promise<void> {
    while (documentsNormatifsAMigrer.length > 0) {
      const ancien = documentsNormatifsAMigrer[0]
      if (!ancien) break
      await envoyerDocument({
        category: ancien.category as CategorieDocumentNormatif,
        titre: ancien.titre,
        filename: ancien.filename,
        source: ancien.source as SourceDocumentNormatif,
        sourceRef: ancien.source_ref ?? undefined,
        mimeType: ancien.mime_type,
        texte: ancien.extracted_text,
        ...(ancien.content ? { contenu: ancien.content } : {}),
      })
      documentsNormatifsAMigrer.shift()
    }
  }

  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) {
        documents.value = []
        return
      }
      try {
        await migrerDocumentsLocauxVersServeur()
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const resultat = await api.listerDocumentsNormatifs(authStore.jeton)
      documents.value = resultat.ok ? resultat.donnees.documents.map(wireVersDomaine) : []
    } finally {
      enChargement.value = false
    }
  }

  async function envoyerDocument(saisie: {
    category: CategorieDocumentNormatif
    titre: string
    filename: string
    source: SourceDocumentNormatif
    sourceRef?: string | null
    mimeType: string
    texte: string
    contenu?: Blob
  }): Promise<NormativeDocument> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    const resultat = await api.creerDocumentNormatif(authStore.jeton, saisie)
    if (!resultat.ok) throw new Error(`Échec de l'import : ${resultat.erreur}`)
    const document = wireVersDomaine(resultat.donnees.document)
    documents.value = [...documents.value, document]
    return document
  }

  async function importerDepuisFichier(
    fichier: File,
    category: CategorieDocumentNormatif,
    actor: string,
  ): Promise<NormativeDocument> {
    void actor // conservé au contrat public (attribution) — l'auteur réel vient désormais du jeton de session côté Worker, jamais d'une valeur fournie par l'appelant.
    const tampon = await fichier.arrayBuffer()
    const texte = await extraireTexteSelonExtension(fichier.name, tampon)
    return envoyerDocument({
      category,
      titre: fichier.name,
      filename: fichier.name,
      source: 'televersement',
      mimeType: fichier.type || 'application/octet-stream',
      texte,
      contenu: fichier,
    })
  }

  /** Liste les fichiers du dépôt GitHub déjà configuré (`useConnexionGitHubStore`, Worker/D1), sous un préfixe de chemin donné. */
  async function listerFichiersGitHub(prefixeChemin: string): Promise<EntreeArborescence[]> {
    const connecteur = await useConnexionGitHubStore().creerConnecteur()
    if (connecteur === null) {
      throw new Error('Aucune connexion GitHub configurée (Configuration client).')
    }
    const arborescence = await connecteur.chargerArborescence()
    return arborescence.filter((entree) => entree.chemin.startsWith(prefixeChemin))
  }

  async function importerDepuisGitHub(
    chemin: string,
    category: CategorieDocumentNormatif,
    actor: string,
  ): Promise<NormativeDocument> {
    void actor
    const nomFichier = chemin.split('/').pop() ?? chemin
    if (!EXTENSIONS_TEXTE_BRUT.some((extension) => nomFichier.toLowerCase().endsWith(extension))) {
      throw new Error(
        'Import GitHub limité aux fichiers texte (.md, .txt) dans ce chantier — utiliser le téléversement direct ou Google Drive pour un .docx/.pdf.',
      )
    }
    const connecteur = await useConnexionGitHubStore().creerConnecteur()
    if (connecteur === null) {
      throw new Error('Aucune connexion GitHub configurée (Configuration client).')
    }
    const { contenu } = await connecteur.lire(chemin)

    return envoyerDocument({
      category,
      titre: nomFichier,
      filename: nomFichier,
      source: 'github',
      sourceRef: chemin,
      mimeType: 'text/plain',
      texte: contenu,
    })
  }

  /**
   * Préserve un éventuel `refreshToken` déjà connecté via
   * `connecterDriveAvecGoogle` (OAuth) — jamais un remplacement complet de
   * la valeur stockée : ce formulaire ne sert plus qu'à ajuster
   * `dossierId` une fois l'OAuth en place, la réécriture complète
   * effacerait silencieusement la connexion Google déjà établie.
   */
  async function configurerConnexionDriveLectureNormes(
    dossierId: string,
    jeton: string,
  ): Promise<{ ok: true } | { ok: false; erreur: string }> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { ok: false, erreur: 'relais_non_configure' }

    const existant = await api.obtenirParametreInstallation(
      authStore.jeton,
      CLE_PARAMETRE_DRIVE_NORMES,
    )
    const refreshToken = existant.ok ? existant.donnees.parametre?.valeur.refreshToken : undefined
    const valeur: Record<string, string> = {
      dossierId: dossierId.trim(),
      jeton: jeton.trim(),
      ...(refreshToken ? { refreshToken } : {}),
    }
    const resultat = await api.enregistrerParametreInstallation(
      authStore.jeton,
      CLE_PARAMETRE_DRIVE_NORMES,
      valeur,
    )
    if (!resultat.ok) return { ok: false, erreur: resultat.erreur }
    return { ok: true }
  }

  async function testerConnexionDriveLectureNormes(): Promise<ResultatConnexionDriveNormes> {
    let connexion: ConnexionDriveLectureNormes | null
    try {
      connexion = await obtenirConnexionDriveNormes()
    } catch (erreur) {
      return { ok: false, message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.' }
    }
    if (connexion === null) {
      return {
        ok: false,
        message: 'Aucune configuration Drive enregistrée pour la bibliothèque de normes.',
      }
    }
    try {
      const connecteur = new DriveReaderConnector(connexion)
      const fichiers = await connecteur.listerFichiers()
      return { ok: true, nbFichiers: fichiers.length }
    } catch (erreur) {
      return { ok: false, message: erreur instanceof Error ? erreur.message : 'Erreur inconnue.' }
    }
  }

  async function listerFichiersDrive(): Promise<FichierDrive[]> {
    const connexion = await obtenirConnexionDriveNormes()
    if (connexion === null) {
      throw new Error('Aucune configuration Drive enregistrée pour la bibliothèque de normes.')
    }
    const connecteur = new DriveReaderConnector(connexion)
    return connecteur.listerFichiers()
  }

  async function importerDepuisDrive(
    fichier: FichierDrive,
    category: CategorieDocumentNormatif,
    actor: string,
  ): Promise<NormativeDocument> {
    void actor
    const connexion = await obtenirConnexionDriveNormes()
    if (connexion === null) {
      throw new Error('Aucune configuration Drive enregistrée pour la bibliothèque de normes.')
    }
    const connecteur = new DriveReaderConnector(connexion)

    const estNatif = connecteur.estDocumentGoogleNatif(fichier.mimeType)
    const contenuBinaire = estNatif ? null : await connecteur.telechargerContenu(fichier.id)
    const texte = estNatif
      ? await connecteur.lireTexteExporte(fichier.id)
      : await extraireTexteSelonExtension(fichier.nom, contenuBinaire as ArrayBuffer)

    return envoyerDocument({
      category,
      titre: fichier.nom,
      filename: fichier.nom,
      source: 'drive',
      sourceRef: fichier.id,
      mimeType: fichier.mimeType,
      texte,
      ...(contenuBinaire
        ? { contenu: new Blob([contenuBinaire], { type: fichier.mimeType }) }
        : {}),
    })
  }

  /** Récupère le contenu binaire d'origine à la demande — jamais préchargé avec la liste (voir `NormativeDocument.has_binary_content`). */
  async function telechargerContenu(documentId: string): Promise<Blob> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    const resultat = await api.obtenirContenuDocumentNormatif(authStore.jeton, documentId)
    if (!resultat.ok) throw new Error(`Échec du téléchargement : ${resultat.erreur}`)
    return resultat.blob
  }

  async function renommerDocument(documentId: string, nouveauTitre: string): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    const resultat = await api.renommerDocumentNormatif(authStore.jeton, documentId, nouveauTitre)
    if (!resultat.ok) throw new Error(`Échec du renommage : ${resultat.erreur}`)
    const document = wireVersDomaine(resultat.donnees.document)
    documents.value = documents.value.map((d) => (d.id === documentId ? document : d))
  }

  /**
   * Un document Google natif (Docs/Sheets/Slides) n'a jamais de fichier
   * d'origine — sa `has_binary_content: false` est correcte et attendue,
   * jamais un candidat de réparation. Seul un document `source: 'drive'`
   * non natif, sans contenu binaire alors qu'un identifiant Drive est
   * connu, indique une perte réelle (voir #35 : jeton Drive expiré en
   * cours d'un import de masse).
   */
  function necessiteReparationContenu(document: NormativeDocument): boolean {
    return (
      document.source === 'drive' &&
      document.source_ref !== null &&
      !document.has_binary_content &&
      !MIME_TYPES_GOOGLE_NATIFS.has(document.mime_type)
    )
  }

  /**
   * Récupère à nouveau le contenu binaire d'un document depuis Drive et le
   * dépose côté serveur — jamais une recréation : le titre déjà renommé,
   * la catégorie déjà choisie restent inchangés, seul le contenu binaire
   * est remplacé (voir `gererRepararContenuDocumentNormatif`, Worker).
   */
  async function repararContenuDocument(documentId: string): Promise<void> {
    const document = documents.value.find((d) => d.id === documentId)
    if (!document) throw new Error('Document introuvable.')
    if (!necessiteReparationContenu(document)) {
      throw new Error("Ce document n'a jamais eu de fichier d'origine à réparer.")
    }
    const sourceRef = document.source_ref as string

    const connexion = await obtenirConnexionDriveNormes()
    if (connexion === null) {
      throw new Error('Aucune configuration Drive enregistrée pour la bibliothèque de normes.')
    }
    const connecteur = new DriveReaderConnector(connexion)
    const contenuBinaire = await connecteur.telechargerContenu(sourceRef)

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    const resultat = await api.repararContenuDocumentNormatif(
      authStore.jeton,
      documentId,
      new Blob([contenuBinaire], { type: document.mime_type }),
      document.mime_type,
    )
    if (!resultat.ok) throw new Error(`Échec de la réparation : ${resultat.erreur}`)
    const documentRepare = wireVersDomaine(resultat.donnees.document)
    documents.value = documents.value.map((d) => (d.id === documentId ? documentRepare : d))
  }

  /**
   * Un document Drive non natif actuellement marqué disponible (`has_
   * binary_content: true`) est un candidat au diagnostic — le drapeau peut
   * mentir pour un document importé avant #35/#36 (voir `diagnostiquerContenu`).
   * Un document déjà marqué indisponible n'a pas besoin d'être revérifié :
   * il est déjà détecté par `necessiteReparationContenu`.
   */
  function necessiteDiagnosticContenu(document: NormativeDocument): boolean {
    return (
      document.source === 'drive' &&
      document.source_ref !== null &&
      document.has_binary_content &&
      !MIME_TYPES_GOOGLE_NATIFS.has(document.mime_type)
    )
  }

  /** Nombre de documents envoyés par appel de diagnostic — jamais toute l'installation en un lot : le nombre de sous-requêtes R2 par invocation Worker est limité, voir `gererDiagnostiquerContenuDocumentsNormatifs`. */
  const TAILLE_LOT_DIAGNOSTIC = 30

  /**
   * Recale `has_binary_content` sur le contenu réellement présent côté
   * serveur (R2) pour tous les documents Drive non natifs actuellement
   * marqués disponibles — nécessaire une fois pour les documents importés
   * avant #35/#36, dont le drapeau mentait déjà en base et que la
   * réparation elle-même ne peut pas détecter (`necessiteReparationContenu`
   * exige justement `has_binary_content: false`). Recharge la liste après
   * coup pour que la détection de réparation voie l'état corrigé.
   */
  async function diagnostiquerContenu(): Promise<{ nbCorriges: number }> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    const candidats = documents.value.filter((d) => necessiteDiagnosticContenu(d))
    let nbCorriges = 0
    for (let i = 0; i < candidats.length; i += TAILLE_LOT_DIAGNOSTIC) {
      const lot = candidats.slice(i, i + TAILLE_LOT_DIAGNOSTIC)
      const resultat = await api.diagnostiquerContenuDocumentsNormatifs(
        authStore.jeton,
        lot.map((d) => d.id),
      )
      if (!resultat.ok) throw new Error(`Échec du diagnostic : ${resultat.erreur}`)
      nbCorriges += resultat.donnees.resultats.filter((r) => r.corrige).length
    }
    if (nbCorriges > 0) await charger()
    return { nbCorriges }
  }

  async function supprimerDocument(documentId: string): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (api && authStore.jeton) {
      const resultat = await api.supprimerDocumentNormatif(authStore.jeton, documentId)
      // Jamais retirer de l'écran un document que le serveur a conservé.
      if (!resultat.ok) throw new Error(`Échec de la suppression : ${resultat.erreur}`)
    }
    documents.value = documents.value.filter((d) => d.id !== documentId)
  }

  return {
    documents,
    enChargement,
    charger,
    importerDepuisFichier,
    listerFichiersGitHub,
    importerDepuisGitHub,
    configurerConnexionDriveLectureNormes,
    connecterDriveAvecGoogle,
    testerConnexionDriveLectureNormes,
    listerFichiersDrive,
    importerDepuisDrive,
    telechargerContenu,
    renommerDocument,
    necessiteReparationContenu,
    repararContenuDocument,
    necessiteDiagnosticContenu,
    diagnostiquerContenu,
    supprimerDocument,
  }
})

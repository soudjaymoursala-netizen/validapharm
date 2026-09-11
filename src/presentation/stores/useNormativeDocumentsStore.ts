import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocumentNormatifWire } from '../../connecteurs/auth/AuthApiClient'
import { extraireTexteDocx } from '../../connecteurs/office/DocxNatifAdapter'
import { extraireTextePdf } from '../../connecteurs/pdf/PdfNatifAdapter'
import {
  DriveReaderConnector,
  type FichierDrive,
} from '../../connecteurs/drive/DriveReaderConnector'
import { GitHubConnector, type EntreeArborescence } from '../../connecteurs/github/GitHubConnector'
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

async function obtenirConnexionDriveNormes(): Promise<ConnexionDriveLectureNormes | null> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  if (!api || !authStore.jeton) return null
  const resultat = await api.obtenirParametreInstallation(
    authStore.jeton,
    CLE_PARAMETRE_DRIVE_NORMES,
  )
  return resultat.ok && resultat.donnees.parametre
    ? (resultat.donnees.parametre.valeur as unknown as ConnexionDriveLectureNormes)
    : null
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
    const githubStore = useConnexionGitHubStore()
    await githubStore.charger()
    if (githubStore.connexion === null) {
      throw new Error('Aucune connexion GitHub configurée (Configuration client).')
    }
    const connecteur = new GitHubConnector(githubStore.connexion)
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
    const githubStore = useConnexionGitHubStore()
    await githubStore.charger()
    if (githubStore.connexion === null) {
      throw new Error('Aucune connexion GitHub configurée (Configuration client).')
    }
    const connecteur = new GitHubConnector(githubStore.connexion)
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

  async function configurerConnexionDriveLectureNormes(
    dossierId: string,
    jeton: string,
  ): Promise<{ ok: true } | { ok: false; erreur: string }> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return { ok: false, erreur: 'relais_non_configure' }

    const valeur: ConnexionDriveLectureNormes = { dossierId: dossierId.trim(), jeton: jeton.trim() }
    const resultat = await api.enregistrerParametreInstallation(
      authStore.jeton,
      CLE_PARAMETRE_DRIVE_NORMES,
      valeur as unknown as Record<string, string>,
    )
    if (!resultat.ok) return { ok: false, erreur: resultat.erreur }
    return { ok: true }
  }

  async function testerConnexionDriveLectureNormes(): Promise<ResultatConnexionDriveNormes> {
    const connexion = await obtenirConnexionDriveNormes()
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

  async function supprimerDocument(documentId: string): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (api && authStore.jeton) {
      await api.supprimerDocumentNormatif(authStore.jeton, documentId)
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
    testerConnexionDriveLectureNormes,
    listerFichiersDrive,
    importerDepuisDrive,
    telechargerContenu,
    supprimerDocument,
  }
})

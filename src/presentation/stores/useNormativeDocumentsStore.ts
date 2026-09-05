import { defineStore } from 'pinia'
import { ref } from 'vue'
import { extraireTexteDocx } from '../../connecteurs/office/DocxNatifAdapter'
import { extraireTextePdf } from '../../connecteurs/pdf/PdfNatifAdapter'
import { DriveReaderConnector, type FichierDrive } from '../../connecteurs/drive/DriveReaderConnector'
import { GitHubConnector, type EntreeArborescence } from '../../connecteurs/github/GitHubConnector'
import type {
  CategorieDocumentNormatif,
  NormativeDocument,
} from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'

const IDENTIFIANT_ENREGISTREMENT_UNIQUE = 'unique'

/** Extensions dont l'extraction native (locale, sans réseau) est supportée par ce chantier. */
const EXTENSIONS_TEXTE_BRUT = ['.txt', '.md']

export type ResultatConnexionDriveNormes =
  | { ok: true; nbFichiers: number }
  | { ok: false; message: string }

async function extraireTexteSelonExtension(nomFichier: string, contenu: ArrayBuffer): Promise<string> {
  const nom = nomFichier.toLowerCase()
  if (nom.endsWith('.pdf')) return (await extraireTextePdf(contenu)).texte
  if (nom.endsWith('.docx')) return (await extraireTexteDocx(contenu)).texte
  return new TextDecoder('utf-8').decode(contenu)
}

/**
 * Bibliothèque de normes — documents importés (§4.5, chantier "Normes &
 * Guidelines") : téléversement direct, lecture d'un dépôt GitHub (le dépôt
 * unique déjà configuré pour toute l'installation, `db.connexionGitHub`),
 * lecture d'un dossier Google Drive dédié (`db.connexionDriveLectureNormes`
 * — une configuration globale distincte du miroir d'écriture par client).
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

  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      documents.value = await db.normativeDocuments.toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function importerDepuisFichier(
    fichier: File,
    category: CategorieDocumentNormatif,
    actor: string,
  ): Promise<NormativeDocument> {
    const tampon = await fichier.arrayBuffer()
    const texte = await extraireTexteSelonExtension(fichier.name, tampon)
    const document: NormativeDocument = {
      id: crypto.randomUUID(),
      category,
      titre: fichier.name,
      filename: fichier.name,
      source: 'televersement',
      source_ref: null,
      extracted_text: texte,
      content: fichier,
      mime_type: fichier.type,
      uploaded_at: new Date().toISOString(),
      uploaded_by: actor,
    }
    await db.normativeDocuments.put(document)
    documents.value = [...documents.value, document]
    return document
  }

  /** Liste les fichiers du dépôt GitHub déjà configuré (`db.connexionGitHub`), sous un préfixe de chemin donné. */
  async function listerFichiersGitHub(prefixeChemin: string): Promise<EntreeArborescence[]> {
    const connexion = await db.connexionGitHub.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    if (connexion === undefined) {
      throw new Error('Aucune connexion GitHub configurée (Configuration client).')
    }
    const connecteur = new GitHubConnector(connexion)
    const arborescence = await connecteur.chargerArborescence()
    return arborescence.filter((entree) => entree.chemin.startsWith(prefixeChemin))
  }

  async function importerDepuisGitHub(
    chemin: string,
    category: CategorieDocumentNormatif,
    actor: string,
  ): Promise<NormativeDocument> {
    const nomFichier = chemin.split('/').pop() ?? chemin
    if (!EXTENSIONS_TEXTE_BRUT.some((extension) => nomFichier.toLowerCase().endsWith(extension))) {
      throw new Error(
        "Import GitHub limité aux fichiers texte (.md, .txt) dans ce chantier — utiliser le téléversement direct ou Google Drive pour un .docx/.pdf.",
      )
    }
    const connexion = await db.connexionGitHub.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    if (connexion === undefined) {
      throw new Error('Aucune connexion GitHub configurée (Configuration client).')
    }
    const connecteur = new GitHubConnector(connexion)
    const { contenu } = await connecteur.lire(chemin)

    const document: NormativeDocument = {
      id: crypto.randomUUID(),
      category,
      titre: nomFichier,
      filename: nomFichier,
      source: 'github',
      source_ref: chemin,
      extracted_text: contenu,
      content: null,
      mime_type: 'text/plain',
      uploaded_at: new Date().toISOString(),
      uploaded_by: actor,
    }
    await db.normativeDocuments.put(document)
    documents.value = [...documents.value, document]
    return document
  }

  async function configurerConnexionDriveLectureNormes(
    dossierId: string,
    jeton: string,
  ): Promise<void> {
    await db.connexionDriveLectureNormes.put({
      id: IDENTIFIANT_ENREGISTREMENT_UNIQUE,
      dossierId: dossierId.trim(),
      jeton: jeton.trim(),
    })
  }

  async function testerConnexionDriveLectureNormes(): Promise<ResultatConnexionDriveNormes> {
    const connexion = await db.connexionDriveLectureNormes.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    if (connexion === undefined) {
      return { ok: false, message: 'Aucune configuration Drive enregistrée pour la bibliothèque de normes.' }
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
    const connexion = await db.connexionDriveLectureNormes.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    if (connexion === undefined) {
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
    const connexion = await db.connexionDriveLectureNormes.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
    if (connexion === undefined) {
      throw new Error('Aucune configuration Drive enregistrée pour la bibliothèque de normes.')
    }
    const connecteur = new DriveReaderConnector(connexion)

    const texte = connecteur.estDocumentGoogleNatif(fichier.mimeType)
      ? await connecteur.lireTexteExporte(fichier.id)
      : await extraireTexteSelonExtension(fichier.nom, await connecteur.telechargerContenu(fichier.id))

    const document: NormativeDocument = {
      id: crypto.randomUUID(),
      category,
      titre: fichier.nom,
      filename: fichier.nom,
      source: 'drive',
      source_ref: fichier.id,
      extracted_text: texte,
      content: null,
      mime_type: fichier.mimeType,
      uploaded_at: new Date().toISOString(),
      uploaded_by: actor,
    }
    await db.normativeDocuments.put(document)
    documents.value = [...documents.value, document]
    return document
  }

  async function supprimerDocument(documentId: string): Promise<void> {
    await db.normativeDocuments.delete(documentId)
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
    supprimerDocument,
  }
})

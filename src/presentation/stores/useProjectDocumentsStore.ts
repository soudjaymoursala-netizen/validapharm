import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProjectDocumentWire } from '../../connecteurs/auth/AuthApiClient'
import type { ProjectDocument } from '../../logique-metier/domaine/types'
import { projectDocumentsAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export function documentProjetWireVersDomaine(wire: ProjectDocumentWire): ProjectDocument {
  return {
    id: wire.id,
    project_id: wire.projectId,
    filename: wire.filename,
    status: wire.status as ProjectDocument['status'],
    uploaded_at: wire.uploadedAt,
    uploaded_by: wire.uploadedBy,
    extracted_text: wire.extractedText,
    has_binary_content: wire.hasBinaryContent,
    mime_type: wire.mimeType,
  }
}

/**
 * Section "Documents" d'un projet (Must) —
 * chargement de fichiers de référence sous n'importe quel format (PDF,
 * Office, images, etc.). Comblait un écart connu et documenté (les seuls
 * `ProjectDocument` existants venaient du besoin ponctuel §4.1bis
 * — aucun écran générique de bibliothèque n'existait, cf.
 * `logique-metier/domaine/types.ts`).
 *
 * **Garde-fou non négociable** : chaque document est
 * toujours marqué `status: 'reference_de_travail_non_maitre'` et
 * horodaté — jamais promu "maître" du QMS du client par l'outil, aucune
 * exception.
 *
 * **Phase 3c du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité pour les métadonnées, le bucket R2 déjà utilisé par la
 * Bibliothèque de normes accueille le texte extrait et le contenu binaire
 * — jamais chargé eagerly avec la liste (voir `telechargerContenu`, même
 * patron que `useNormativeDocumentsStore`).
 */
export const useProjectDocumentsStore = defineStore('projectDocuments', () => {
  const documents = ref<ProjectDocument[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations sur `ProjectDocument` exigent désormais systématiquement le Worker/D1, même discipline que `useSectionsStore.obtenirApiSection`. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /** `null` si le relais n'est pas configuré — appel au Worker lié au projet (`Project.documents[]`, référence jamais consommée en production mais tenue à jour par continuité avec Phase 3a) alors silencieusement ignoré. */
  async function obtenirApiProjet() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return null
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les `ProjectDocument` capturés depuis l'ancienne
   * table IndexedDB locale (`projectDocumentsAMigrer`) juste avant sa
   * suppression — n'a d'effet réel qu'une seule fois, sur le premier
   * navigateur qui ouvre l'application avec ce code (voir migration Dexie
   * v38, `persistance/db.ts`). Contrairement à
   * `migrerSectionsLocalesVersServeur` (un seul appel groupé), la route
   * Worker `/project-documents/migration-locale` traite un document à la
   * fois (corps `multipart/form-data`, contenu binaire potentiellement
   * volumineux) : chaque document n'est retiré de la file qu'après
   * confirmation serveur individuelle, jamais avant — un échec isolé
   * laisse les suivants en attente du prochain appel.
   */
  async function migrerDocumentsLocauxVersServeur(): Promise<void> {
    if (projectDocumentsAMigrer.length === 0) return
    const { api, jeton } = await obtenirApi()
    while (projectDocumentsAMigrer.length > 0) {
      const ancien = projectDocumentsAMigrer[0]
      if (!ancien) break
      const resultat = await api.migrerDocumentProjetLocal(jeton, {
        id: ancien.id,
        projectId: ancien.project_id,
        filename: ancien.filename,
        status: ancien.status,
        mimeType: ancien.mime_type,
        texte: ancien.extracted_text,
        ...(ancien.content ? { contenu: ancien.content } : {}),
      })
      if (!resultat.ok) {
        throw new Error(`Échec de la migration du document : ${resultat.erreur}`)
      }
      projectDocumentsAMigrer.shift()
    }
  }

  async function charger(projectId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerDocumentsLocauxVersServeur()
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.listerDocumentsProjet(jeton, projectId)
      documents.value = resultat.ok
        ? resultat.donnees.documentsProjet.map(documentProjetWireVersDomaine)
        : []
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que `useSectionsStore.chargerSectionsDuProjet`.
      documents.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function importerDocument(
    projectId: string,
    fichier: File,
    actor: string,
  ): Promise<ProjectDocument> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerDocumentProjet(jeton, {
      projectId,
      filename: fichier.name,
      mimeType: fichier.type,
      texte: '',
      contenu: fichier,
    })
    if (!resultat.ok) throw new Error(`Échec du chargement du document : ${resultat.erreur}`)
    const document = documentProjetWireVersDomaine(resultat.donnees.documentProjet)

    const apiProjet = await obtenirApiProjet()
    if (apiProjet) {
      await apiProjet.api.ajouterDocumentProjet(apiProjet.jeton, projectId, document.id)
    }

    documents.value = [...documents.value, document]
    // `actor` conservé au contrat public (déjà consigné côté serveur via
    // le compte authentifié réel, `uploadedBy` — jamais une valeur
    // déclarée par l'appelant, même discipline que `creerSection`).
    void actor
    return document
  }

  async function supprimerDocument(documentId: string): Promise<void> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.supprimerDocumentProjet(jeton, documentId)
    if (!resultat.ok) throw new Error(`Échec de la suppression : ${resultat.erreur}`)
    documents.value = documents.value.filter((d) => d.id !== documentId)
  }

  /** Récupère le contenu binaire d'origine à la demande — jamais préchargé avec la liste (voir `ProjectDocument.has_binary_content`). */
  async function telechargerContenu(documentId: string): Promise<Blob> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.obtenirContenuDocumentProjet(jeton, documentId)
    if (!resultat.ok) throw new Error(`Échec du téléchargement : ${resultat.erreur}`)
    return resultat.blob
  }

  return {
    documents,
    enChargement,
    charger,
    importerDocument,
    supprimerDocument,
    telechargerContenu,
  }
})

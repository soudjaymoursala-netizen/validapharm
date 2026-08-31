import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProjectDocument } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'

/**
 * Section "Documents" d'un projet (FS §4.9, URS-F-000quater, Must) —
 * chargement de fichiers de référence sous n'importe quel format (PDF,
 * Office, images, etc.). Comblait un écart connu et documenté (les seuls
 * `ProjectDocument` existants venaient du besoin ponctuel §4.1bis, Phase
 * 33 — aucun écran générique de bibliothèque n'existait, cf.
 * `logique-metier/domaine/types.ts`).
 *
 * **Garde-fou non négociable (URS-F-000quater)** : chaque document est
 * toujours marqué `status: 'reference_de_travail_non_maitre'` et
 * horodaté — jamais promu "maître" du QMS du client par l'outil, aucune
 * exception.
 */
export const useProjectDocumentsStore = defineStore('projectDocuments', () => {
  const documents = ref<ProjectDocument[]>([])
  const enChargement = ref(false)

  async function charger(projectId: string): Promise<void> {
    enChargement.value = true
    try {
      documents.value = await db.projectDocuments.where('project_id').equals(projectId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function importerDocument(
    projectId: string,
    fichier: File,
    actor: string,
  ): Promise<ProjectDocument> {
    const maintenant = new Date().toISOString()
    const document: ProjectDocument = {
      id: crypto.randomUUID(),
      project_id: projectId,
      filename: fichier.name,
      status: 'reference_de_travail_non_maitre',
      uploaded_at: maintenant,
      uploaded_by: actor,
      extracted_text: '',
      content: fichier,
      mime_type: fichier.type,
    }
    await db.projectDocuments.put(document)
    documents.value = [...documents.value, document]

    const projet = await db.projects.get(projectId)
    if (projet) {
      await db.projects.put({
        ...projet,
        documents: [...projet.documents, document.id],
        updated_at: maintenant,
        audit_log: [
          ...projet.audit_log,
          { timestamp: maintenant, actor, action: 'ajout_document' },
        ],
      })
    }
    return document
  }

  async function supprimerDocument(documentId: string): Promise<void> {
    await db.projectDocuments.delete(documentId)
    documents.value = documents.value.filter((d) => d.id !== documentId)
  }

  return { documents, enChargement, charger, importerDocument, supprimerDocument }
})

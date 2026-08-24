import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Langue, Project } from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouveauProjetInput {
  name: string
  context: string
  scope_in: string
  scope_out: string
  deadline: string | null
  language_default: Langue
  client_id: string | null
}

/**
 * Store de la Couche Présentation (SDS §6) orchestrant la persistance
 * locale (`persistance/db.ts`) pour la gestion de projets (FS §4.0). Ne
 * contient aucune règle métier elle-même — les décisions restent dans
 * `logique-metier/` ; ce store ne fait qu'appeler/persister.
 *
 * @requirement URS-F-000 à 000nonies
 */
export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const enChargement = ref(false)

  async function chargerProjets(): Promise<void> {
    enChargement.value = true
    try {
      const tous = await db.projects.toArray()
      projects.value = tous.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    } finally {
      enChargement.value = false
    }
  }

  async function creerProjet(input: NouveauProjetInput): Promise<Project> {
    const maintenant = new Date().toISOString()
    const projet: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      context: input.context,
      scope_in: input.scope_in,
      scope_out: input.scope_out,
      deadline: input.deadline,
      language_default: input.language_default,
      client_id: input.client_id,
      sections: [],
      documents: [],
      links: [],
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.projects.put(projet)
    projects.value = [projet, ...projects.value]
    return projet
  }

  async function obtenirProjet(projectId: string): Promise<Project | undefined> {
    return db.projects.get(projectId)
  }

  return { projects, enChargement, chargerProjets, creerProjet, obtenirProjet }
})

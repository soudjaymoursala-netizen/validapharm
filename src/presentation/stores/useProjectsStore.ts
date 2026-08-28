import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Langue, LienProjet, Project } from '../../logique-metier/domaine/types'
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

  function memeLien(
    a: Pick<LienProjet, 'from_section_id' | 'to_section_id'>,
    fromSectionId: string,
    toSectionId: string,
  ): boolean {
    return (
      (a.from_section_id === fromSectionId && a.to_section_id === toSectionId) ||
      (a.from_section_id === toSectionId && a.to_section_id === fromSectionId)
    )
  }

  /**
   * Crée un lien non dirigé entre deux sections d'un même projet
   * (`project.links[]`, FDS §3.3/§3.6) — c'est le seul mécanisme qui permet
   * de satisfaire les garde-fous de finalisation U-01/U-02/U-03
   * (`gardesFinalisation.ts`) autrement qu'en forçant avec un motif
   * obligatoire. Absent jusqu'ici de l'interface (aucune fonction ne
   * mutait `project.links`) — trouvé en simulant un vrai parcours de
   * qualification de bout en bout : chaque finalisation OQ/IQ/PQ était
   * bloquée sans aucune voie légitime de la lever.
   *
   * Idempotent (un lien déjà existant, dans un sens ou l'autre, n'est
   * jamais dupliqué) — le lien n'est pas dirigé au sens métier
   * (`aLienVersTypeSection` accepte les deux sens), `from`/`to` ne
   * reflètent que l'ordre de création, à but d'audit uniquement.
   */
  async function ajouterLien(
    projectId: string,
    fromSectionId: string,
    toSectionId: string,
  ): Promise<void> {
    const projet = await db.projects.get(projectId)
    if (!projet) throw new Error(`Projet introuvable : ${projectId}`)
    if (projet.links.some((l) => memeLien(l, fromSectionId, toSectionId))) return
    const maintenant = new Date().toISOString()
    const lien: LienProjet = {
      from_section_id: fromSectionId,
      to_section_id: toSectionId,
      created_by: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
      created_at: maintenant,
    }
    const projetMisAJour: Project = {
      ...projet,
      links: [...projet.links, lien],
      updated_at: maintenant,
      audit_log: [
        ...projet.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: 'lien_ajoute',
        },
      ],
    }
    await db.projects.put(projetMisAJour)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
  }

  /** Retire un lien existant (symétrique d'`ajouterLien`) — pour corriger une liaison créée par erreur. */
  async function retirerLien(
    projectId: string,
    fromSectionId: string,
    toSectionId: string,
  ): Promise<void> {
    const projet = await db.projects.get(projectId)
    if (!projet) throw new Error(`Projet introuvable : ${projectId}`)
    const maintenant = new Date().toISOString()
    const projetMisAJour: Project = {
      ...projet,
      links: projet.links.filter((l) => !memeLien(l, fromSectionId, toSectionId)),
      updated_at: maintenant,
      audit_log: [
        ...projet.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: 'lien_retire',
        },
      ],
    }
    await db.projects.put(projetMisAJour)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
  }

  return {
    projects,
    enChargement,
    chargerProjets,
    creerProjet,
    obtenirProjet,
    ajouterLien,
    retirerLien,
  }
})

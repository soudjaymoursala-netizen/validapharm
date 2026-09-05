import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Langue, LienProjet, Project } from '../../logique-metier/domaine/types'
import {
  IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
  identifiantUtilisateurCourant,
} from '../identite/identiteLocale'
import { useProfilLocalStore } from './useProfilLocalStore'
import { db } from '../../persistance/db'

export type NiveauAccesPartage = 'lecture' | 'édition'
export type ErreurPartageProjet = { erreur: 'introuvable' }

export interface NouveauProjetInput {
  name: string
  context: string
  scope_in: string
  scope_out: string
  deadline: string | null
  language_default: Langue
  client_id: string | null
}

export type ErreurArchivageProjet = { erreur: 'introuvable' | 'deja_archive' | 'deja_actif' }

/**
 * Store de la Couche Présentation orchestrant la persistance
 * locale (`persistance/db.ts`) pour la gestion de projets. Ne
 * contient aucune règle métier elle-même — les décisions restent dans
 * `logique-metier/` ; ce store ne fait qu'appeler/persister.
 *
 */
export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const enChargement = ref(false)
  /**
   * Identité résolue de l'utilisateur courant — mise à
   * jour à chaque `chargerProjets`/`creerProjet`, consommée par les
   * écrans pour la garde d'affichage `peutModifierProjet`. Vaut
   * `IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1` tant qu'aucun profil local
   * n'est défini (comportement historique inchangé).
   */
  const identiteCourante = ref<string>(IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1)

  const projetsActifs = computed(() => projects.value.filter((p) => p.statut !== 'archive'))
  const projetsArchives = computed(() => projects.value.filter((p) => p.statut === 'archive'))

  async function resoudreIdentiteCourante(): Promise<string> {
    const profilStore = useProfilLocalStore()
    if (profilStore.profil === null) await profilStore.charger()
    identiteCourante.value = identifiantUtilisateurCourant(profilStore.profil)
    return identiteCourante.value
  }

  async function chargerProjets(): Promise<void> {
    enChargement.value = true
    try {
      const tous = await db.projects.toArray()
      projects.value = tous.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      await resoudreIdentiteCourante()
    } finally {
      enChargement.value = false
    }
  }

  async function creerProjet(input: NouveauProjetInput): Promise<Project> {
    const ownerId = await resoudreIdentiteCourante()
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
      statut: 'actif',
      owner_id: ownerId,
      shared_with: [],
      archived_at: null,
      archived_by: null,
      audit_log: [{ timestamp: maintenant, actor: ownerId, action: 'création' }],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.projects.put(projet)
    projects.value = [projet, ...projects.value]
    return projet
  }

  /**
   * Partage explicite d'un projet — ajoute ou met à
   * jour le niveau d'accès d'un utilisateur dans `shared_with`, jamais
   * déduit automatiquement. Le propriétaire lui-même n'a pas besoin d'un
   * enregistrement de partage — `peutModifierProjet` le reconnaît déjà
   * via `owner_id`.
   */
  async function partagerProjet(
    projectId: string,
    userId: string,
    accessLevel: NiveauAccesPartage,
  ): Promise<Project | ErreurPartageProjet> {
    const projet = await db.projects.get(projectId)
    if (!projet) return { erreur: 'introuvable' }
    const maintenant = new Date().toISOString()
    const acteur = identiteCourante.value
    const autres = projet.shared_with.filter((p) => p.user_id !== userId)
    const projetMisAJour: Project = {
      ...projet,
      shared_with: [...autres, { user_id: userId, access_level: accessLevel }],
      updated_at: maintenant,
      audit_log: [
        ...projet.audit_log,
        { timestamp: maintenant, actor: acteur, action: `partage_ajoute (${userId})` },
      ],
    }
    await db.projects.put(projetMisAJour)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  /** Retire un partage existant — le projet reste lisible par tous, seul le droit d'édition change. */
  async function retirerPartage(
    projectId: string,
    userId: string,
  ): Promise<Project | ErreurPartageProjet> {
    const projet = await db.projects.get(projectId)
    if (!projet) return { erreur: 'introuvable' }
    const maintenant = new Date().toISOString()
    const acteur = identiteCourante.value
    const projetMisAJour: Project = {
      ...projet,
      shared_with: projet.shared_with.filter((p) => p.user_id !== userId),
      updated_at: maintenant,
      audit_log: [
        ...projet.audit_log,
        { timestamp: maintenant, actor: acteur, action: `partage_retire (${userId})` },
      ],
    }
    await db.projects.put(projetMisAJour)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
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
   * (`project.links[]`) — c'est le seul mécanisme qui permet
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

  /**
   * Archivage (§4.31) — jamais une suppression physique
   * (ALCOA+) : `statut` bascule à `archive`, le projet reste lisible et
   * restaurable. La garde de confirmation (nom retapé + mot de passe
   * local) est vérifiée par l'appelant avant d'invoquer cette fonction,
   * jamais ici (même séparation que `useClientsStore.archiverClient`).
   */
  async function archiverProjet(
    projectId: string,
    identiteDeclaree: string,
  ): Promise<Project | ErreurArchivageProjet> {
    const existant = await db.projects.get(projectId)
    if (!existant) return { erreur: 'introuvable' }
    if (existant.statut === 'archive') return { erreur: 'deja_archive' }

    const maintenant = new Date().toISOString()
    const projetMisAJour: Project = {
      ...existant,
      statut: 'archive',
      archived_at: maintenant,
      archived_by: identiteDeclaree,
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        { timestamp: maintenant, actor: identiteDeclaree, action: 'archivage' },
      ],
    }
    await db.projects.put(projetMisAJour)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  async function desarchiverProjet(
    projectId: string,
    identiteDeclaree: string,
  ): Promise<Project | ErreurArchivageProjet> {
    const existant = await db.projects.get(projectId)
    if (!existant) return { erreur: 'introuvable' }
    if (existant.statut !== 'archive') return { erreur: 'deja_actif' }

    const maintenant = new Date().toISOString()
    const projetMisAJour: Project = {
      ...existant,
      statut: 'actif',
      archived_at: null,
      archived_by: null,
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        { timestamp: maintenant, actor: identiteDeclaree, action: 'désarchivage' },
      ],
    }
    await db.projects.put(projetMisAJour)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  return {
    projects,
    projetsActifs,
    projetsArchives,
    enChargement,
    identiteCourante,
    resoudreIdentiteCourante,
    chargerProjets,
    creerProjet,
    obtenirProjet,
    ajouterLien,
    retirerLien,
    archiverProjet,
    desarchiverProjet,
    partagerProjet,
    retirerPartage,
  }
})

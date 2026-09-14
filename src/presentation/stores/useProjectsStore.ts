import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ProjectWire } from '../../connecteurs/auth/AuthApiClient'
import type { Langue, PhaseProjet, Project } from '../../logique-metier/domaine/types'
import { identifiantActeurCourant } from '../identite/identiteLocale'
import { projectsAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

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
export type ErreurStatutProjet = {
  erreur: 'introuvable' | 'deja_suspendu' | 'pas_suspendu' | 'deja_supprime' | 'pas_archive'
}

/** Exporté pour `useSynchronisationStore` — le format JSON déjà poussé sur GitHub reste au format domaine (snake_case), jamais renommé par cette migration. */
export function projetWireVersDomaine(wire: ProjectWire): Project {
  return {
    id: wire.id,
    name: wire.name,
    context: wire.context,
    scope_in: wire.scopeIn,
    scope_out: wire.scopeOut,
    deadline: wire.deadline,
    language_default: wire.languageDefault,
    client_id: wire.clientId,
    sections: wire.sections,
    documents: wire.documents,
    links: wire.links.map((l) => ({
      from_section_id: l.fromSectionId,
      to_section_id: l.toSectionId,
      created_by: l.createdBy,
      created_at: l.createdAt,
    })),
    statut: wire.statut,
    phase: wire.phase,
    owner_id: wire.ownerId,
    shared_with: wire.sharedWith.map((s) => ({ user_id: s.userId, access_level: s.accessLevel })),
    archived_at: wire.archivedAt,
    archived_by: wire.archivedBy,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

/** Réservé au filet de sécurité de migration locale (`migrerProjetsLocauxVersServeur`) et à `useSynchronisationStore` (restauration depuis GitHub/fusion de conflit) — préserve tous les champs, y compris `owner_id`/`shared_with`/`audit_log`/horodatages d'origine, jamais fabriqués. */
export function projetDomaineVersWireComplet(p: Project): ProjectWire {
  return {
    id: p.id,
    name: p.name,
    context: p.context,
    scopeIn: p.scope_in,
    scopeOut: p.scope_out,
    deadline: p.deadline,
    languageDefault: p.language_default,
    clientId: p.client_id,
    sections: p.sections,
    documents: p.documents,
    links: p.links.map((l) => ({
      fromSectionId: l.from_section_id,
      toSectionId: l.to_section_id,
      createdBy: l.created_by,
      createdAt: l.created_at,
    })),
    statut: p.statut,
    phase: p.phase,
    ownerId: p.owner_id,
    sharedWith: p.shared_with.map((s) => ({ userId: s.user_id, accessLevel: s.access_level })),
    archivedAt: p.archived_at,
    archivedBy: p.archived_by,
    auditLog: p.audit_log,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

/**
 * Store de la Couche Présentation orchestrant la persistance des projets —
 * **Phase 3a du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité (Worker `auth-worker`, routes `/projects/...`), jamais plus
 * `persistance/db.ts` (`db.projects`, retiré). La logique métier reste
 * côté client (audit_log/identité/idempotence des liens) — les handlers du
 * Worker ne font que rejouer les mêmes règles côté serveur (défense en
 * profondeur, même discipline que `useOrganizationStore`/
 * `useStructureSystemeStore`).
 */
export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const enChargement = ref(false)
  /**
   * Identité résolue de l'utilisateur courant (email du compte réel
   * connecté, `useAuthStore`) — mise à jour à chaque
   * `chargerProjets`/`creerProjet`, consommée par les écrans pour la garde
   * d'affichage `peutModifierProjet`.
   */
  const identiteCourante = ref<string>(identifiantActeurCourant())

  const projetsActifs = computed(() => projects.value.filter((p) => p.statut === 'actif'))
  const projetsSuspendus = computed(() => projects.value.filter((p) => p.statut === 'suspendu'))
  const projetsArchives = computed(() => projects.value.filter((p) => p.statut === 'archive'))
  const projetsSupprimes = computed(() => projects.value.filter((p) => p.statut === 'supprime'))

  function resoudreIdentiteCourante(): string {
    identiteCourante.value = identifiantActeurCourant()
    return identiteCourante.value
  }

  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les `Project` capturés depuis l'ancienne table
   * IndexedDB locale (`projectsAMigrer`) juste avant sa suppression — n'a
   * d'effet réel qu'une seule fois, sur le premier navigateur qui ouvre
   * l'application avec ce code (voir migration Dexie v36,
   * `persistance/db.ts`). Ne retire chaque projet de la file qu'après
   * confirmation serveur, jamais avant (même discipline que
   * `useOrganizationStore.migrerOrganisationsLocalesVersServeur`).
   * `creerProjet` (Worker) générant un nouvel id à chaque appel, ce filet
   * utilise `migrerProjetsLocaux` (route dédiée, idempotente), seule voie
   * qui préserve l'id local existant — référencé par `sections`/
   * `projectDocuments`, encore en IndexedDB local le temps des phases
   * suivantes.
   */
  async function migrerProjetsLocauxVersServeur(): Promise<void> {
    if (projectsAMigrer.length === 0) return
    const { api, jeton } = await obtenirApi()

    const resultat = await api.migrerProjetsLocaux(
      jeton,
      projectsAMigrer.map(projetDomaineVersWireComplet),
    )
    if (!resultat.ok) throw new Error(`Échec de la migration des projets : ${resultat.erreur}`)
    projectsAMigrer.splice(0, projectsAMigrer.length)
  }

  /**
   * Un compte admin voit tous les projets, sans filtre (comportement
   * inchangé). Un compte non-admin (créé pour un collaborateur/testeur)
   * ne voit que les projets dont il est propriétaire ou avec lesquels il
   * a été explicitement partagé (`partagerProjet`) — appliqué désormais
   * côté serveur (`ProjectsRepo.listerVisiblesPar`), jamais les projets
   * préexistants d'un autre compte.
   */
  async function chargerProjets(): Promise<void> {
    enChargement.value = true
    try {
      resoudreIdentiteCourante()
      const { api, jeton } = await obtenirApi()
      try {
        await migrerProjetsLocauxVersServeur()
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const resultat = await api.listerProjets(jeton)
      if (!resultat.ok) {
        projects.value = []
        return
      }
      const visibles = resultat.donnees.projects.map(projetWireVersDomaine)
      projects.value = visibles.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que `useOrganizationStore.charger`.
      projects.value = []
    } finally {
      enChargement.value = false
    }
  }

  /** Projets d'un seul client — usage `AssistantCreationLivrable`/`usePanneauChatStore` (précédents du même gabarit, sections joignables au chat), jamais le filtre de visibilité complet de `chargerProjets`. */
  async function listerProjetsClient(clientId: string): Promise<Project[]> {
    try {
      const { api, jeton } = await obtenirApi()
      const resultat = await api.listerProjetsClient(jeton, clientId)
      if (!resultat.ok) return []
      return resultat.donnees.projects.map(projetWireVersDomaine)
    } catch {
      return []
    }
  }

  async function creerProjet(input: NouveauProjetInput): Promise<Project> {
    resoudreIdentiteCourante()
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerProjet(jeton, {
      name: input.name,
      context: input.context,
      scopeIn: input.scope_in,
      scopeOut: input.scope_out,
      deadline: input.deadline,
      languageDefault: input.language_default,
      clientId: input.client_id,
    })
    if (!resultat.ok) throw new Error(`Échec de la création du projet : ${resultat.erreur}`)
    const projet = projetWireVersDomaine(resultat.donnees.projet)
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
    const { api, jeton } = await obtenirApi()
    const resultat = await api.partagerProjet(jeton, projectId, userId, accessLevel)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable') return { erreur: 'introuvable' }
      throw new Error(`Échec du partage : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  /** Retire un partage existant — le projet reste lisible par tous, seul le droit d'édition change. */
  async function retirerPartage(
    projectId: string,
    userId: string,
  ): Promise<Project | ErreurPartageProjet> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.retirerPartageProjet(jeton, projectId, userId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable') return { erreur: 'introuvable' }
      throw new Error(`Échec du retrait de partage : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  /**
   * Ferme, pour la navigation directe (`/projets/:id`), le même accès que
   * `chargerProjets` ferme pour la liste — sans ça, un compte non-admin
   * qui devine ou conserve l'URL d'un projet dont il n'a la visibilité ni
   * par propriété ni par partage pourrait tout de même l'ouvrir
   * directement, contournant le filtre de la liste. Le Worker applique
   * désormais la même garde côté serveur (404 générique).
   */
  async function obtenirProjet(projectId: string): Promise<Project | undefined> {
    try {
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirProjet(jeton, projectId)
      if (!resultat.ok) return undefined
      return projetWireVersDomaine(resultat.donnees.projet)
    } catch {
      return undefined
    }
  }

  /**
   * Crée un lien non dirigé entre deux sections d'un même projet
   * (`project.links[]`) — c'est le seul mécanisme qui permet
   * de satisfaire les garde-fous de finalisation U-01/U-02/U-03
   * (`gardesFinalisation.ts`) autrement qu'en forçant avec un motif
   * obligatoire. Idempotent (un lien déjà existant, dans un sens ou
   * l'autre, n'est jamais dupliqué) — le lien n'est pas dirigé au sens
   * métier (`aLienVersTypeSection` accepte les deux sens), `from`/`to` ne
   * reflètent que l'ordre de création, à but d'audit uniquement.
   */
  async function ajouterLien(
    projectId: string,
    fromSectionId: string,
    toSectionId: string,
  ): Promise<void> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.ajouterLienProjet(jeton, projectId, fromSectionId, toSectionId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable') throw new Error(`Projet introuvable : ${projectId}`)
      throw new Error(`Échec de l'ajout du lien : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
  }

  /** Retire un lien existant (symétrique d'`ajouterLien`) — pour corriger une liaison créée par erreur. */
  async function retirerLien(
    projectId: string,
    fromSectionId: string,
    toSectionId: string,
  ): Promise<void> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.retirerLienProjet(jeton, projectId, fromSectionId, toSectionId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable') throw new Error(`Projet introuvable : ${projectId}`)
      throw new Error(`Échec du retrait du lien : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
  }

  /**
   * Archivage (§4.31) — jamais une suppression physique
   * (ALCOA+) : `statut` bascule à `archive`, le projet reste lisible et
   * restaurable. La garde de confirmation (nom retapé + mot de passe
   * local) est vérifiée par l'appelant avant d'invoquer cette fonction,
   * jamais ici (même séparation que `useClientsStore.archiverClient`).
   * `identiteDeclaree` reste accepté pour compatibilité d'appel (garde de
   * confirmation UI) mais n'est jamais transmis au serveur : l'acteur
   * réellement consigné dans `audit_log`/`archived_by` est toujours
   * l'identité authentifiée (JWT), jamais une valeur déclarée par
   * l'appelant.
   */
  async function archiverProjet(
    projectId: string,
    identiteDeclaree: string,
  ): Promise<Project | ErreurArchivageProjet> {
    void identiteDeclaree
    const { api, jeton } = await obtenirApi()
    const resultat = await api.archiverProjet(jeton, projectId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable' || resultat.erreur === 'deja_archive') {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de l'archivage : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  async function desarchiverProjet(
    projectId: string,
    identiteDeclaree: string,
  ): Promise<Project | ErreurArchivageProjet> {
    void identiteDeclaree
    const { api, jeton } = await obtenirApi()
    const resultat = await api.desarchiverProjet(jeton, projectId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable' || resultat.erreur === 'deja_actif') {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec du désarchivage : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  /**
   * Change la phase du cycle de vie (ISPE Baseline — `PhaseProjet`,
   * jamais à confondre avec le pipeline de qualification d'une
   * section) — une information déclarative, jamais une machine à états
   * contrainte : contrairement à `statut` (archivage/suspension), aucun
   * ordre n'est imposé entre phases (un retour de `retrait` à
   * `operation` reste légitime, ex. remise en service d'un actif).
   * Tracée dans `audit_log` comme tout changement significatif.
   */
  async function changerPhaseProjet(
    projectId: string,
    phase: PhaseProjet,
    identiteDeclaree: string,
  ): Promise<Project | ErreurArchivageProjet> {
    void identiteDeclaree
    const { api, jeton } = await obtenirApi()
    const resultat = await api.changerPhaseProjet(jeton, projectId, phase)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable') return { erreur: 'introuvable' }
      throw new Error(`Échec du changement de phase : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  /**
   * Suspension — mise en pause temporaire (ex. attente client),
   * distincte de l'archivage : un projet suspendu reste dans le
   * périmètre de travail courant, il n'a pas terminé son cycle de vie.
   */
  async function suspendreProjet(
    projectId: string,
    identiteDeclaree: string,
  ): Promise<Project | ErreurStatutProjet> {
    void identiteDeclaree
    const { api, jeton } = await obtenirApi()
    const resultat = await api.suspendreProjet(jeton, projectId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable' || resultat.erreur === 'deja_suspendu') {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de la suspension : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  /** Lève une suspension — restaure le projet en statut `actif`. */
  async function reprendreProjet(
    projectId: string,
    identiteDeclaree: string,
  ): Promise<Project | ErreurStatutProjet> {
    void identiteDeclaree
    const { api, jeton } = await obtenirApi()
    const resultat = await api.reprendreProjet(jeton, projectId)
    if (!resultat.ok) {
      if (resultat.erreur === 'introuvable' || resultat.erreur === 'pas_suspendu') {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de la reprise : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  /**
   * Suppression déclarée par l'utilisateur — statut terminal
   * `supprime`, **jamais** une suppression physique (ALCOA+, même
   * principe que l'archivage) : la ligne et son `audit_log` restent
   * intégralement en base, seule la visibilité dans l'interface change.
   * La garde de confirmation (nom retapé + mot de passe réel) est
   * vérifiée par l'appelant avant d'invoquer cette fonction, jamais ici.
   *
   * Exige un projet déjà archivé (même parcours qu'`useClientsStore.
   * supprimerDefinitivement` : on archive d'abord, on supprime ensuite
   * depuis la vue des archives) — jamais une suppression directe d'un
   * projet actif ou suspendu, pour limiter le risque d'erreur.
   */
  async function supprimerProjet(
    projectId: string,
    identiteDeclaree: string,
  ): Promise<Project | ErreurStatutProjet> {
    void identiteDeclaree
    const { api, jeton } = await obtenirApi()
    const resultat = await api.supprimerProjet(jeton, projectId)
    if (!resultat.ok) {
      if (
        resultat.erreur === 'introuvable' ||
        resultat.erreur === 'deja_supprime' ||
        resultat.erreur === 'pas_archive'
      ) {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de la suppression : ${resultat.erreur}`)
    }
    const projetMisAJour = projetWireVersDomaine(resultat.donnees.projet)
    const index = projects.value.findIndex((p) => p.id === projectId)
    if (index !== -1) projects.value[index] = projetMisAJour
    return projetMisAJour
  }

  return {
    projects,
    projetsActifs,
    projetsSuspendus,
    projetsArchives,
    projetsSupprimes,
    enChargement,
    identiteCourante,
    resoudreIdentiteCourante,
    chargerProjets,
    creerProjet,
    listerProjetsClient,
    obtenirProjet,
    ajouterLien,
    retirerLien,
    archiverProjet,
    desarchiverProjet,
    changerPhaseProjet,
    suspendreProjet,
    reprendreProjet,
    supprimerProjet,
    partagerProjet,
    retirerPartage,
  }
})

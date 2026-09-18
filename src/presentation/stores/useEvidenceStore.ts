import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  EvidenceLocationWire,
  EvidenceWire,
  ProvenanceLinkWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  Evidence,
  EvidenceLocation,
  ProvenanceLink,
  SystemeEvidenceLocation,
  TypeEvidence,
} from '../../logique-metier/domaine/types'
import {
  evidenceLocationsAMigrer,
  evidencesAMigrer,
  provenanceLinksAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'
import { useExecutionStore } from './useExecutionStore'

export function evidenceWireVersDomaine(wire: EvidenceWire): Evidence {
  return {
    id: wire.id,
    client_id: wire.clientId,
    execution_id: wire.executionId,
    execution_step_id: wire.executionStepId,
    type: wire.type as TypeEvidence,
    titre: wire.titre,
    description: wire.description,
    horodatage: wire.horodatage,
    actor: wire.actor,
  }
}

export function evidenceLocationWireVersDomaine(wire: EvidenceLocationWire): EvidenceLocation {
  return {
    id: wire.id,
    client_id: wire.clientId,
    evidence_id: wire.evidenceId,
    systeme: wire.systeme as SystemeEvidenceLocation,
    reference: wire.reference,
  }
}

export function provenanceLinkWireVersDomaine(wire: ProvenanceLinkWire): ProvenanceLink {
  return {
    id: wire.id,
    client_id: wire.clientId,
    evidence_id: wire.evidenceId,
    requirement_id: wire.requirementId,
    created_at: wire.createdAt,
  }
}

function evidenceDomaineVersWire(e: Evidence): EvidenceWire {
  return {
    id: e.id,
    clientId: e.client_id,
    executionId: e.execution_id,
    executionStepId: e.execution_step_id,
    type: e.type,
    titre: e.titre,
    description: e.description,
    horodatage: e.horodatage,
    actor: e.actor,
  }
}

function evidenceLocationDomaineVersWire(l: EvidenceLocation): EvidenceLocationWire {
  return {
    id: l.id,
    clientId: l.client_id,
    evidenceId: l.evidence_id,
    systeme: l.systeme,
    reference: l.reference,
  }
}

function provenanceLinkDomaineVersWire(p: ProvenanceLink): ProvenanceLinkWire {
  return {
    id: p.id,
    clientId: p.client_id,
    evidenceId: p.evidence_id,
    requirementId: p.requirement_id,
    createdAt: p.created_at,
  }
}

export interface NouvellePreuveInput {
  executionStepId: string | null
  type: TypeEvidence
  titre: string
  description: string
}

export interface NouvelleLocalisationInput {
  systeme: SystemeEvidenceLocation
  reference: string
}

export type ErreurEcriturePreuve = {
  erreur: 'execution_introuvable' | 'execution_deja_cloturee' | 'etape_inconnue'
}

/**
 * Store des preuves (`Evidence`) rattachées à une `Execution` (convergence
 * architecturale — spec dans
 * `docs/convergence/PHASE_7C_EVIDENCE_SPEC.md`). Dernière sous-étape de
 * convergence : `preuvesPourRequirement` démontre la traçabilité complète
 * Requirement→Test→Execution→Evidence exigée par son Acceptance Criteria.
 * Ne construit aucun stockage de fichier réel — `EvidenceLocation` est un
 * pointeur déclaratif, jamais un flux binaire (limite assumée, §5 de la spec).
 *
 * **Phase 6c du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client que les
 * autres domaines de ce chantier. Dernière brique du Test/Execution/
 * Evidence engine — la Phase 6 est entièrement close une fois cette
 * migration mergée.
 *
 * @requirement Target Architecture, domaine "Evidence"
 */
export const useEvidenceStore = defineStore('evidence', () => {
  const evidences = ref<Evidence[]>([])
  const evidenceLocations = ref<EvidenceLocation[]>([])
  const provenanceLinks = ref<ProvenanceLink[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que les autres stores de ce chantier. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois (voir migration Dexie v47, `persistance/db.ts`).
   * Filtre par client avant envoi, même patron que les autres domaines de
   * ce chantier.
   */
  async function migrerEvidencesLocalVersServeur(clientId: string): Promise<void> {
    const evidencesDuClient = evidencesAMigrer.filter((e) => e.client_id === clientId)
    const evidenceLocationsDuClient = evidenceLocationsAMigrer.filter(
      (l) => l.client_id === clientId,
    )
    const provenanceLinksDuClient = provenanceLinksAMigrer.filter((p) => p.client_id === clientId)
    if (
      evidencesDuClient.length === 0 &&
      evidenceLocationsDuClient.length === 0 &&
      provenanceLinksDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerEvidencesLocal(jeton, clientId, {
      evidences: evidencesDuClient.map(evidenceDomaineVersWire),
      evidenceLocations: evidenceLocationsDuClient.map(evidenceLocationDomaineVersWire),
      provenanceLinks: provenanceLinksDuClient.map(provenanceLinkDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Evidence : ${resultat.erreur}`)
    }
    for (const e of evidencesDuClient) {
      const index = evidencesAMigrer.indexOf(e)
      if (index !== -1) evidencesAMigrer.splice(index, 1)
    }
    for (const l of evidenceLocationsDuClient) {
      const index = evidenceLocationsAMigrer.indexOf(l)
      if (index !== -1) evidenceLocationsAMigrer.splice(index, 1)
    }
    for (const p of provenanceLinksDuClient) {
      const index = provenanceLinksAMigrer.indexOf(p)
      if (index !== -1) provenanceLinksAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerEvidencesLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirEvidences(jeton, clientId)
      if (resultat.ok) {
        evidences.value = resultat.donnees.evidences.map(evidenceWireVersDomaine)
        evidenceLocations.value = resultat.donnees.evidenceLocations.map(
          evidenceLocationWireVersDomaine,
        )
        provenanceLinks.value = resultat.donnees.provenanceLinks.map(provenanceLinkWireVersDomaine)
      } else {
        evidences.value = []
        evidenceLocations.value = []
        provenanceLinks.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      evidences.value = []
      evidenceLocations.value = []
      provenanceLinks.value = []
    } finally {
      enChargement.value = false
    }
  }

  /** Une Evidence n'existe que pour une Execution réelle, non clôturée (immutabilité post-clôture, cohérent avec Phase 6b). */
  async function enregistrerPreuve(
    clientId: string,
    executionId: string,
    input: NouvellePreuveInput,
  ): Promise<Evidence | ErreurEcriturePreuve> {
    // Execution migrée vers le Worker/D1 (Phase 6b du chantier de
    // migration D1) — chargée via le store dédié plutôt qu'un accès Dexie
    // direct, devenu impossible depuis cette migration.
    const executionStore = useExecutionStore()
    await executionStore.charger(clientId)
    const execution = executionStore.executions.find((e) => e.id === executionId)
    if (!execution || execution.client_id !== clientId) return { erreur: 'execution_introuvable' }
    if (execution.statut === 'terminee') return { erreur: 'execution_deja_cloturee' }

    if (input.executionStepId) {
      const etape = executionStore.executionSteps.find((e) => e.id === input.executionStepId)
      if (!etape || etape.execution_id !== executionId) return { erreur: 'etape_inconnue' }
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.enregistrerPreuve(jeton, clientId, {
      executionId,
      executionStepId: input.executionStepId,
      type: input.type,
      titre: input.titre,
      description: input.description,
    })
    if (!resultat.ok) {
      if (
        resultat.erreur === 'execution_introuvable' ||
        resultat.erreur === 'execution_deja_cloturee' ||
        resultat.erreur === 'etape_inconnue'
      ) {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de l'enregistrement de la preuve : ${resultat.erreur}`)
    }
    const preuve = evidenceWireVersDomaine(resultat.donnees.evidence)
    evidences.value = [...evidences.value, preuve]
    return preuve
  }

  /** Ne peut être créée que pour une Evidence de type `document`. */
  async function ajouterLocalisation(
    clientId: string,
    evidenceId: string,
    input: NouvelleLocalisationInput,
  ): Promise<EvidenceLocation | { erreur: 'evidence_introuvable' | 'type_non_document' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.ajouterLocalisation(jeton, clientId, evidenceId, {
      systeme: input.systeme,
      reference: input.reference,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'evidence_introuvable' || resultat.erreur === 'type_non_document') {
        return { erreur: resultat.erreur }
      }
      throw new Error(`Échec de l'ajout de la localisation : ${resultat.erreur}`)
    }
    const localisation = evidenceLocationWireVersDomaine(resultat.donnees.evidenceLocation)
    evidenceLocations.value = [...evidenceLocations.value, localisation]
    return localisation
  }

  /** Déclaration explicite, jamais déduite — idempotente, même logique que `declarerCouverture` (Phase 6a). */
  async function declarerProvenance(
    clientId: string,
    evidenceId: string,
    requirementId: string,
  ): Promise<ProvenanceLink> {
    const existant = provenanceLinks.value.find(
      (p) => p.evidence_id === evidenceId && p.requirement_id === requirementId,
    )
    if (existant) return existant

    const { api, jeton } = await obtenirApi()
    const resultat = await api.declarerProvenance(jeton, clientId, { evidenceId, requirementId })
    if (!resultat.ok) {
      throw new Error(`Échec de la déclaration de provenance : ${resultat.erreur}`)
    }
    const lien = provenanceLinkWireVersDomaine(resultat.donnees.provenanceLink)
    provenanceLinks.value = [...provenanceLinks.value, lien]
    return lien
  }

  function preuvesExecution(executionId: string): Evidence[] {
    return evidences.value.filter((e) => e.execution_id === executionId)
  }

  function localisationsPreuve(evidenceId: string): EvidenceLocation[] {
    return evidenceLocations.value.filter((l) => l.evidence_id === evidenceId)
  }

  /** Démontre la traçabilité complète Requirement→Test→Execution→Evidence (Acceptance Criteria). */
  function preuvesPourRequirement(requirementId: string): Evidence[] {
    const idsPreuves = provenanceLinks.value
      .filter((p) => p.requirement_id === requirementId)
      .map((p) => p.evidence_id)
    return evidences.value.filter((e) => idsPreuves.includes(e.id))
  }

  return {
    evidences,
    evidenceLocations,
    provenanceLinks,
    enChargement,
    charger,
    enregistrerPreuve,
    ajouterLocalisation,
    declarerProvenance,
    preuvesExecution,
    localisationsPreuve,
    preuvesPourRequirement,
  }
})

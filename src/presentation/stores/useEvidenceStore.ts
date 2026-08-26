import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Evidence,
  EvidenceLocation,
  ProvenanceLink,
  SystemeEvidenceLocation,
  TypeEvidence,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

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
 * Store des preuves (`Evidence`) rattachées à une `Execution` (Phase 7c de
 * convergence architecturale — spec dans
 * `docs/convergence/PHASE_7C_EVIDENCE_SPEC.md`). Dernière sous-étape de la
 * Phase 7 : `preuvesPourRequirement` démontre la traçabilité complète
 * Requirement→Test→Execution→Evidence exigée par son Acceptance Criteria.
 * Ne construit aucun stockage de fichier réel — `EvidenceLocation` est un
 * pointeur déclaratif, jamais un flux binaire (limite assumée, §5 de la spec).
 *
 * @requirement Target Architecture, domaine "Evidence"
 */
export const useEvidenceStore = defineStore('evidence', () => {
  const evidences = ref<Evidence[]>([])
  const evidenceLocations = ref<EvidenceLocation[]>([])
  const provenanceLinks = ref<ProvenanceLink[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      evidences.value = await db.evidences.where('client_id').equals(clientId).toArray()
      evidenceLocations.value = await db.evidenceLocations
        .where('client_id')
        .equals(clientId)
        .toArray()
      provenanceLinks.value = await db.provenanceLinks.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  /** Une Evidence n'existe que pour une Execution réelle, non clôturée (immutabilité post-clôture, cohérent avec 7b). */
  async function enregistrerPreuve(
    clientId: string,
    executionId: string,
    input: NouvellePreuveInput,
  ): Promise<Evidence | ErreurEcriturePreuve> {
    const execution = await db.executions.get(executionId)
    if (!execution || execution.client_id !== clientId) return { erreur: 'execution_introuvable' }
    if (execution.statut === 'terminee') return { erreur: 'execution_deja_cloturee' }

    if (input.executionStepId) {
      const etape = await db.executionSteps.get(input.executionStepId)
      if (!etape || etape.execution_id !== executionId) return { erreur: 'etape_inconnue' }
    }

    const preuve: Evidence = {
      id: crypto.randomUUID(),
      client_id: clientId,
      execution_id: executionId,
      execution_step_id: input.executionStepId,
      type: input.type,
      titre: input.titre,
      description: input.description,
      horodatage: new Date().toISOString(),
      actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
    }
    await db.evidences.put(preuve)
    evidences.value = [...evidences.value, preuve]
    return preuve
  }

  /** Ne peut être créée que pour une Evidence de type `document`. */
  async function ajouterLocalisation(
    clientId: string,
    evidenceId: string,
    input: NouvelleLocalisationInput,
  ): Promise<EvidenceLocation | { erreur: 'evidence_introuvable' | 'type_non_document' }> {
    const preuve = await db.evidences.get(evidenceId)
    if (!preuve || preuve.client_id !== clientId) return { erreur: 'evidence_introuvable' }
    if (preuve.type !== 'document') return { erreur: 'type_non_document' }

    const localisation: EvidenceLocation = {
      id: crypto.randomUUID(),
      client_id: clientId,
      evidence_id: evidenceId,
      systeme: input.systeme,
      reference: input.reference,
    }
    await db.evidenceLocations.put(localisation)
    evidenceLocations.value = [...evidenceLocations.value, localisation]
    return localisation
  }

  /** Déclaration explicite, jamais déduite — idempotente, même logique que `declarerCouverture` (7a). */
  async function declarerProvenance(
    clientId: string,
    evidenceId: string,
    requirementId: string,
  ): Promise<ProvenanceLink> {
    const existant = provenanceLinks.value.find(
      (p) => p.evidence_id === evidenceId && p.requirement_id === requirementId,
    )
    if (existant) return existant

    const lien: ProvenanceLink = {
      id: crypto.randomUUID(),
      client_id: clientId,
      evidence_id: evidenceId,
      requirement_id: requirementId,
      created_at: new Date().toISOString(),
    }
    await db.provenanceLinks.put(lien)
    provenanceLinks.value = [...provenanceLinks.value, lien]
    return lien
  }

  function preuvesExecution(executionId: string): Evidence[] {
    return evidences.value.filter((e) => e.execution_id === executionId)
  }

  function localisationsPreuve(evidenceId: string): EvidenceLocation[] {
    return evidenceLocations.value.filter((l) => l.evidence_id === evidenceId)
  }

  /** Démontre la traçabilité complète Requirement→Test→Execution→Evidence (Acceptance Criteria Phase 7). */
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

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Procedure, ProcedureStep } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'

export interface NouvelleProcedureInput {
  reference: string
  titre: string
  effectiveDate: string
  sourceId?: string | null
}

export interface NouvelleEtapeProcedureInput {
  description: string
  obligatoire: boolean
  condition?: string | null
  responsable?: string | null
}

/**
 * Store du domaine "Procedure" (Phase 20 de convergence architecturale —
 * spec détaillée dans `docs/convergence/PHASE_20_PROCEDURAL_KNOWLEDGE_
 * SPEC.md`, TD-016).
 *
 * **Garde-fou non négociable** : aucune fonction de ce store ne
 * structure automatiquement une `Procedure` depuis un texte libre — les
 * étapes sont toujours saisies par l'appelant (un humain ayant lu la
 * SOP), même discipline que `KnowledgeItem.valeur_interpretee` (Phase 8a).
 *
 * `Procedure` est immuable une fois créée — une nouvelle révision de la
 * même `reference` crée une nouvelle `Procedure` avec un `numero_version`
 * incrémenté, jamais une mutation (répond à R-21,
 * `02-analyse-de-risque-outil.md`).
 *
 * @requirement docs/convergence/CONVERGENCE_PLAN.md, Phase 20
 */
export const useProcedureStore = defineStore('procedure', () => {
  const procedures = ref<Procedure[]>([])
  const procedureSteps = ref<ProcedureStep[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      procedures.value = await db.procedures.where('client_id').equals(clientId).toArray()
      procedureSteps.value = await db.procedureSteps.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  /** `numero_version` auto-incrémenté par `reference` — même logique que `creerSourceVersion`. */
  async function creerProcedure(
    clientId: string,
    input: NouvelleProcedureInput,
  ): Promise<Procedure> {
    const versionsExistantes = procedures.value.filter((p) => p.reference === input.reference)
    const numeroVersion =
      versionsExistantes.reduce((max, p) => Math.max(max, p.numero_version), 0) + 1

    const procedure: Procedure = {
      id: crypto.randomUUID(),
      client_id: clientId,
      reference: input.reference,
      numero_version: numeroVersion,
      titre: input.titre,
      effective_date: input.effectiveDate,
      source_id: input.sourceId ?? null,
      created_at: new Date().toISOString(),
    }
    await db.procedures.put(procedure)
    procedures.value = [...procedures.value, procedure]
    return procedure
  }

  async function ajouterEtape(
    clientId: string,
    procedureId: string,
    input: NouvelleEtapeProcedureInput,
  ): Promise<ProcedureStep | { erreur: 'procedure_introuvable' }> {
    const procedure = await db.procedures.get(procedureId)
    if (!procedure || procedure.client_id !== clientId) {
      return { erreur: 'procedure_introuvable' }
    }

    const etapesExistantes = procedureSteps.value.filter((e) => e.procedure_id === procedureId)
    const ordre = etapesExistantes.reduce((max, e) => Math.max(max, e.ordre), 0) + 1

    const etape: ProcedureStep = {
      id: crypto.randomUUID(),
      client_id: clientId,
      procedure_id: procedureId,
      ordre,
      description: input.description,
      obligatoire: input.obligatoire,
      condition: input.condition ?? null,
      responsable: input.responsable ?? null,
      created_at: new Date().toISOString(),
    }
    await db.procedureSteps.put(etape)
    procedureSteps.value = [...procedureSteps.value, etape]
    return etape
  }

  function etapesDeProcedure(procedureId: string): ProcedureStep[] {
    return procedureSteps.value
      .filter((e) => e.procedure_id === procedureId)
      .sort((a, b) => a.ordre - b.ordre)
  }

  /** La version la plus récente (numéro le plus élevé) d'une `reference` donnée — jamais une version arbitraire. */
  function derniereVersion(reference: string): Procedure | null {
    const versions = procedures.value.filter((p) => p.reference === reference)
    if (versions.length === 0) return null
    return versions.reduce((plusRecente, p) =>
      p.numero_version > plusRecente.numero_version ? p : plusRecente,
    )
  }

  return {
    procedures,
    procedureSteps,
    enChargement,
    charger,
    creerProcedure,
    ajouterEtape,
    etapesDeProcedure,
    derniereVersion,
  }
})

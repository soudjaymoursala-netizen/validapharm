import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  OrigineQualityEvent,
  QualityEvent,
  ReferenceExterneQualityEvent,
  ReferenceQualityEvent,
  TypeQualityEvent,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouveauQualityEventInput {
  type: TypeQualityEvent
  titre: string
  description: string
  origine: OrigineQualityEvent
  referenceExterne: ReferenceExterneQualityEvent | null
  assetNodeId: string | null
  processId: string | null
  manufacturingContextId: string | null
}

/**
 * Store `QualityEvent` (convergence architecturale — spec
 * détaillée dans `docs/convergence/PHASE_5_QUALITY_EVENTS_SPEC.md`).
 *
 * Garde-fou central : ce store ne contient **aucune**
 * fonction qui bloque une opération d'un autre module à partir d'un
 * `QualityEvent` externe — un événement externe est seulement référencé
 * (`reference_externe`), jamais un verrou. Voir le test de régression
 * dédié dans `useQualityEventStore.test.ts`.
 *
 * @requirement URS catalogue §10 famille H/I
 */
export const useQualityEventStore = defineStore('qualityEvent', () => {
  const evenements = ref<QualityEvent[]>([])
  const references = ref<ReferenceQualityEvent[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      evenements.value = await db.qualityEvents.where('client_id').equals(clientId).toArray()
      references.value = await db.referencesQualityEvent
        .where('client_id')
        .equals(clientId)
        .toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerEvenement(
    clientId: string,
    input: NouveauQualityEventInput,
  ): Promise<QualityEvent> {
    const maintenant = new Date().toISOString()
    const evenement: QualityEvent = {
      id: crypto.randomUUID(),
      client_id: clientId,
      type: input.type,
      titre: input.titre,
      description: input.description,
      origine: input.origine,
      reference_externe: input.referenceExterne,
      asset_node_id: input.assetNodeId,
      process_id: input.processId,
      manufacturing_context_id: input.manufacturingContextId,
      statut: 'ouvert',
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.qualityEvents.put(evenement)
    evenements.value = [...evenements.value, evenement]
    return evenement
  }

  async function changerStatut(
    clientId: string,
    evenementId: string,
    statut: QualityEvent['statut'],
  ): Promise<QualityEvent | null> {
    const existant = await db.qualityEvents.get(evenementId)
    if (!existant || existant.client_id !== clientId) return null
    const maintenant = new Date().toISOString()
    const misAJour: QualityEvent = {
      ...existant,
      statut,
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `changement de statut : ${statut}`,
        },
      ],
    }
    await db.qualityEvents.put(misAJour)
    evenements.value = evenements.value.map((e) => (e.id === evenementId ? misAJour : e))
    return misAJour
  }

  /**
   * Référence optionnelle entre deux événements (ex. Deviation →
   * Investigation → CAPA) — jamais une étape obligatoire, voir spec §2 (E2).
   */
  async function referencerEvenement(
    clientId: string,
    sourceId: string,
    cibleId: string,
  ): Promise<ReferenceQualityEvent> {
    const existante = references.value.find(
      (r) => r.quality_event_source_id === sourceId && r.quality_event_cible_id === cibleId,
    )
    if (existante) return existante

    const reference: ReferenceQualityEvent = {
      id: crypto.randomUUID(),
      client_id: clientId,
      quality_event_source_id: sourceId,
      quality_event_cible_id: cibleId,
      created_at: new Date().toISOString(),
    }
    await db.referencesQualityEvent.put(reference)
    references.value = [...references.value, reference]
    return reference
  }

  function referencesDepuis(evenementId: string): ReferenceQualityEvent[] {
    return references.value.filter((r) => r.quality_event_source_id === evenementId)
  }

  return {
    evenements,
    references,
    enChargement,
    charger,
    creerEvenement,
    changerStatut,
    referencerEvenement,
    referencesDepuis,
  }
})

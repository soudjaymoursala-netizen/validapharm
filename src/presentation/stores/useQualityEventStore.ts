import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  QualityEventWire,
  ReferenceQualityEventWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  OrigineQualityEvent,
  QualityEvent,
  ReferenceExterneQualityEvent,
  ReferenceQualityEvent,
  TypeQualityEvent,
} from '../../logique-metier/domaine/types'
import { qualityEventsAMigrer, referencesQualityEventAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export function evenementWireVersDomaine(wire: QualityEventWire): QualityEvent {
  return {
    id: wire.id,
    client_id: wire.clientId,
    type: wire.type as TypeQualityEvent,
    titre: wire.titre,
    description: wire.description,
    origine: wire.origine as OrigineQualityEvent,
    reference_externe: wire.referenceExterne,
    asset_node_id: wire.assetNodeId,
    process_id: wire.processId,
    manufacturing_context_id: wire.manufacturingContextId,
    statut: wire.statut as QualityEvent['statut'],
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function referenceWireVersDomaine(wire: ReferenceQualityEventWire): ReferenceQualityEvent {
  return {
    id: wire.id,
    client_id: wire.clientId,
    quality_event_source_id: wire.qualityEventSourceId,
    quality_event_cible_id: wire.qualityEventCibleId,
    created_at: wire.createdAt,
  }
}

function evenementDomaineVersWire(e: QualityEvent): QualityEventWire {
  return {
    id: e.id,
    clientId: e.client_id,
    type: e.type,
    titre: e.titre,
    description: e.description,
    origine: e.origine,
    referenceExterne: e.reference_externe,
    assetNodeId: e.asset_node_id,
    processId: e.process_id,
    manufacturingContextId: e.manufacturing_context_id,
    statut: e.statut,
    auditLog: e.audit_log,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

function referenceDomaineVersWire(r: ReferenceQualityEvent): ReferenceQualityEventWire {
  return {
    id: r.id,
    clientId: r.client_id,
    qualityEventSourceId: r.quality_event_source_id,
    qualityEventCibleId: r.quality_event_cible_id,
    createdAt: r.created_at,
  }
}

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
 * **Phase 5b du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client que les
 * autres domaines de ce chantier.
 *
 * @requirement URS catalogue §10 famille H/I
 */
export const useQualityEventStore = defineStore('qualityEvent', () => {
  const evenements = ref<QualityEvent[]>([])
  const references = ref<ReferenceQualityEvent[]>([])
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
   * réel qu'une seule fois (voir migration Dexie v44, `persistance/db.ts`).
   * Filtre par client avant envoi, même patron que les autres domaines de
   * ce chantier.
   */
  async function migrerQualityEventsLocalVersServeur(clientId: string): Promise<void> {
    const evenementsDuClient = qualityEventsAMigrer.filter((e) => e.client_id === clientId)
    const referencesDuClient = referencesQualityEventAMigrer.filter((r) => r.client_id === clientId)
    if (evenementsDuClient.length === 0 && referencesDuClient.length === 0) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerQualityEventsLocal(jeton, clientId, {
      evenements: evenementsDuClient.map(evenementDomaineVersWire),
      references: referencesDuClient.map(referenceDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration QualityEvent : ${resultat.erreur}`)
    }
    for (const e of evenementsDuClient) {
      const index = qualityEventsAMigrer.indexOf(e)
      if (index !== -1) qualityEventsAMigrer.splice(index, 1)
    }
    for (const r of referencesDuClient) {
      const index = referencesQualityEventAMigrer.indexOf(r)
      if (index !== -1) referencesQualityEventAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerQualityEventsLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirQualityEvents(jeton, clientId)
      if (resultat.ok) {
        evenements.value = resultat.donnees.evenements.map(evenementWireVersDomaine)
        references.value = resultat.donnees.references.map(referenceWireVersDomaine)
      } else {
        evenements.value = []
        references.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      evenements.value = []
      references.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerEvenement(
    clientId: string,
    input: NouveauQualityEventInput,
  ): Promise<QualityEvent> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerEvenementQualityEvent(jeton, clientId, {
      type: input.type,
      titre: input.titre,
      description: input.description,
      origine: input.origine,
      referenceExterne: input.referenceExterne,
      assetNodeId: input.assetNodeId,
      processId: input.processId,
      manufacturingContextId: input.manufacturingContextId,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création de l'événement : ${resultat.erreur}`)
    }
    const evenement = evenementWireVersDomaine(resultat.donnees.evenement)
    evenements.value = [...evenements.value, evenement]
    return evenement
  }

  async function changerStatut(
    clientId: string,
    evenementId: string,
    statut: QualityEvent['statut'],
  ): Promise<QualityEvent | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.changerStatutQualityEvent(jeton, clientId, evenementId, statut)
    if (!resultat.ok) return null
    const evenement = evenementWireVersDomaine(resultat.donnees.evenement)
    evenements.value = evenements.value.map((e) => (e.id === evenementId ? evenement : e))
    return evenement
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

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerReferenceQualityEvent(jeton, clientId, { sourceId, cibleId })
    if (!resultat.ok) {
      throw new Error(`Échec de la référence entre événements : ${resultat.erreur}`)
    }
    const reference = referenceWireVersDomaine(resultat.donnees.reference)
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

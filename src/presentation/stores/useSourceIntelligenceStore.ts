import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Conflict,
  Extraction,
  KnowledgeItem,
  MethodeExtraction,
  Source,
  SystemeLocalisationSource,
  TypeSource,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouvelleSourceInput {
  type: TypeSource
  titre: string
  systeme: SystemeLocalisationSource
  reference: string
}

export interface NouvelleExtractionInput {
  methode: MethodeExtraction
  contenuBrut: string
}

export interface NouveauKnowledgeItemInput {
  libelle: string
  valeurInterpretee: string
}

export interface NouveauConflictInput {
  knowledgeItemSourceId: string
  knowledgeItemCibleId: string
  description: string
}

/**
 * Store de la structuration assistée de documents (Phase 8a de convergence
 * architecturale — spec dans
 * `docs/convergence/PHASE_8A_SOURCE_INTELLIGENCE_SPEC.md`). Ne couvre que
 * la sous-phase 8a (TD-004) : Source → Extraction → KnowledgeItem, avec
 * son garde-fou NEEDS_REVIEW, + Conflict. La compréhension de schémas
 * techniques complexes (8b) n'est pas engagée. Aucun appel IA réel dans ce
 * module — `valeur_interpretee` est toujours fournie par l'appelant.
 *
 * @requirement Target Architecture, domaine "Source/Document Intelligence"
 */
export const useSourceIntelligenceStore = defineStore('sourceIntelligence', () => {
  const sources = ref<Source[]>([])
  const extractions = ref<Extraction[]>([])
  const knowledgeItems = ref<KnowledgeItem[]>([])
  const conflicts = ref<Conflict[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      sources.value = await db.sources.where('client_id').equals(clientId).toArray()
      extractions.value = await db.extractions.where('client_id').equals(clientId).toArray()
      knowledgeItems.value = await db.knowledgeItems.where('client_id').equals(clientId).toArray()
      conflicts.value = await db.conflicts.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerSource(clientId: string, input: NouvelleSourceInput): Promise<Source> {
    const source: Source = {
      id: crypto.randomUUID(),
      client_id: clientId,
      type: input.type,
      titre: input.titre,
      systeme: input.systeme,
      reference: input.reference,
      created_at: new Date().toISOString(),
    }
    await db.sources.put(source)
    sources.value = [...sources.value, source]
    return source
  }

  async function enregistrerExtraction(
    clientId: string,
    sourceId: string,
    input: NouvelleExtractionInput,
  ): Promise<Extraction | { erreur: 'source_introuvable' }> {
    const source = await db.sources.get(sourceId)
    if (!source || source.client_id !== clientId) return { erreur: 'source_introuvable' }

    const extraction: Extraction = {
      id: crypto.randomUUID(),
      client_id: clientId,
      source_id: sourceId,
      methode: input.methode,
      contenu_brut: input.contenuBrut,
      horodatage: new Date().toISOString(),
    }
    await db.extractions.put(extraction)
    extractions.value = [...extractions.value, extraction]
    return extraction
  }

  /** Garde-fou non négociable : toujours créé au statut `a_valider`, jamais `valide` à la création. */
  async function creerKnowledgeItem(
    clientId: string,
    extractionId: string,
    input: NouveauKnowledgeItemInput,
  ): Promise<KnowledgeItem | { erreur: 'extraction_introuvable' }> {
    const extraction = await db.extractions.get(extractionId)
    if (!extraction || extraction.client_id !== clientId)
      return { erreur: 'extraction_introuvable' }

    const maintenant = new Date().toISOString()
    const item: KnowledgeItem = {
      id: crypto.randomUUID(),
      client_id: clientId,
      extraction_id: extractionId,
      libelle: input.libelle,
      valeur_interpretee: input.valeurInterpretee,
      statut: 'a_valider',
      valide_par: null,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.knowledgeItems.put(item)
    knowledgeItems.value = [...knowledgeItems.value, item]
    return item
  }

  /** Validation toujours humaine et explicite — jamais automatique. */
  async function validerKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
    validateur: string,
  ): Promise<KnowledgeItem | null> {
    return changerStatutKnowledgeItem(clientId, knowledgeItemId, 'valide', validateur)
  }

  async function rejeterKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
    validateur: string,
  ): Promise<KnowledgeItem | null> {
    return changerStatutKnowledgeItem(clientId, knowledgeItemId, 'rejete', validateur)
  }

  async function changerStatutKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
    statut: KnowledgeItem['statut'],
    validateur: string,
  ): Promise<KnowledgeItem | null> {
    const existant = await db.knowledgeItems.get(knowledgeItemId)
    if (!existant || existant.client_id !== clientId) return null

    const maintenant = new Date().toISOString()
    const miseAJour: KnowledgeItem = {
      ...existant,
      statut,
      valide_par: validateur,
      updated_at: maintenant,
      audit_log: [
        ...existant.audit_log,
        { timestamp: maintenant, actor: validateur, action: `changement de statut : ${statut}` },
      ],
    }
    await db.knowledgeItems.put(miseAJour)
    knowledgeItems.value = knowledgeItems.value.map((k) =>
      k.id === knowledgeItemId ? miseAJour : k,
    )
    return miseAJour
  }

  async function declarerConflit(clientId: string, input: NouveauConflictInput): Promise<Conflict> {
    const conflit: Conflict = {
      id: crypto.randomUUID(),
      client_id: clientId,
      knowledge_item_source_id: input.knowledgeItemSourceId,
      knowledge_item_cible_id: input.knowledgeItemCibleId,
      description: input.description,
      statut: 'ouvert',
      resolution: null,
      created_at: new Date().toISOString(),
    }
    await db.conflicts.put(conflit)
    conflicts.value = [...conflicts.value, conflit]
    return conflit
  }

  /** Un Conflict reste `ouvert` tant qu'aucune résolution explicite n'est fournie — jamais auto-résolu. */
  async function resoudreConflit(
    clientId: string,
    conflictId: string,
    resolution: string,
  ): Promise<Conflict | null> {
    const existant = await db.conflicts.get(conflictId)
    if (!existant || existant.client_id !== clientId) return null

    const miseAJour: Conflict = { ...existant, statut: 'resolu', resolution }
    await db.conflicts.put(miseAJour)
    conflicts.value = conflicts.value.map((c) => (c.id === conflictId ? miseAJour : c))
    return miseAJour
  }

  function knowledgeItemsExtraction(extractionId: string): KnowledgeItem[] {
    return knowledgeItems.value.filter((k) => k.extraction_id === extractionId)
  }

  function conflitsOuverts(): Conflict[] {
    return conflicts.value.filter((c) => c.statut === 'ouvert')
  }

  return {
    sources,
    extractions,
    knowledgeItems,
    conflicts,
    enChargement,
    charger,
    creerSource,
    enregistrerExtraction,
    creerKnowledgeItem,
    validerKnowledgeItem,
    rejeterKnowledgeItem,
    declarerConflit,
    resoudreConflit,
    knowledgeItemsExtraction,
    conflitsOuverts,
  }
})

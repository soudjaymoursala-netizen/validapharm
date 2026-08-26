import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  Confirmation,
  Conflict,
  Extraction,
  ExtractionItem,
  KnowledgeItem,
  KnowledgeRelation,
  MethodeExtraction,
  Source,
  SourceLocation,
  SourceVersion,
  SystemeLocalisationSource,
  TypeSource,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouvelleSourceInput {
  type: TypeSource
  titre: string
}

export interface NouvelleLocalisationSourceInput {
  systeme: SystemeLocalisationSource
  reference: string
}

export interface NouvelleExtractionInput {
  methode: MethodeExtraction
}

export interface NouvelExtractionItemInput {
  contenu: string
  position: number
}

export interface NouveauKnowledgeItemInput {
  libelle: string
  valeurInterpretee: string
}

export interface NouvelleRelationInput {
  knowledgeItemSourceId: string
  knowledgeItemCibleId: string
  type: string
}

export interface NouveauConflictInput {
  knowledgeItemSourceId: string
  knowledgeItemCibleId: string
  description: string
}

/**
 * Store de la structuration assistée de documents (Phase 8a de convergence
 * architecturale — spec dans
 * `docs/convergence/PHASE_8A_SOURCE_INTELLIGENCE_SPEC.md`).
 *
 * **Réaligné (25/08/2026) sur le vrai modèle cible** après lecture directe
 * du package source (`03_DOMAIN_DATA_MODEL.md`, domaines "Source
 * Intelligence" et "Knowledge") : la chaîne complète est
 * `Source → SourceVersion → Extraction → ExtractionItem → KnowledgeItem`,
 * avec `SourceLocation` (pointeur déclaratif séparé), `Confirmation`
 * (enregistrement auditable distinct de la validation/rejet) et
 * `KnowledgeRelation` (lien explicite non conflictuel entre deux
 * `KnowledgeItem`). Ne couvre que la sous-phase 8a (TD-004) — la
 * compréhension de schémas techniques complexes (`Diagram`/`DiagramNode`/
 * `DiagramEdge`, 8b) n'est pas engagée. Aucun appel IA réel dans ce
 * module — `valeur_interpretee` est toujours fournie par l'appelant.
 *
 * @requirement Target Architecture, domaine "Source Intelligence"
 */
export const useSourceIntelligenceStore = defineStore('sourceIntelligence', () => {
  const sources = ref<Source[]>([])
  const sourceVersions = ref<SourceVersion[]>([])
  const sourceLocations = ref<SourceLocation[]>([])
  const extractions = ref<Extraction[]>([])
  const extractionItems = ref<ExtractionItem[]>([])
  const knowledgeItems = ref<KnowledgeItem[]>([])
  const confirmations = ref<Confirmation[]>([])
  const knowledgeRelations = ref<KnowledgeRelation[]>([])
  const conflicts = ref<Conflict[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      sources.value = await db.sources.where('client_id').equals(clientId).toArray()
      sourceVersions.value = await db.sourceVersions.where('client_id').equals(clientId).toArray()
      sourceLocations.value = await db.sourceLocations.where('client_id').equals(clientId).toArray()
      extractions.value = await db.extractions.where('client_id').equals(clientId).toArray()
      extractionItems.value = await db.extractionItems.where('client_id').equals(clientId).toArray()
      knowledgeItems.value = await db.knowledgeItems.where('client_id').equals(clientId).toArray()
      confirmations.value = await db.confirmations.where('client_id').equals(clientId).toArray()
      knowledgeRelations.value = await db.knowledgeRelations
        .where('client_id')
        .equals(clientId)
        .toArray()
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
      created_at: new Date().toISOString(),
    }
    await db.sources.put(source)
    sources.value = [...sources.value, source]
    return source
  }

  /** Un `Source` peut avoir plusieurs localisations (ex. miroir Drive + référence externe). */
  async function ajouterLocalisation(
    clientId: string,
    sourceId: string,
    input: NouvelleLocalisationSourceInput,
  ): Promise<SourceLocation | { erreur: 'source_introuvable' }> {
    const source = await db.sources.get(sourceId)
    if (!source || source.client_id !== clientId) return { erreur: 'source_introuvable' }

    const localisation: SourceLocation = {
      id: crypto.randomUUID(),
      client_id: clientId,
      source_id: sourceId,
      systeme: input.systeme,
      reference: input.reference,
    }
    await db.sourceLocations.put(localisation)
    sourceLocations.value = [...sourceLocations.value, localisation]
    return localisation
  }

  /** `numero_version` est auto-incrémenté à partir des versions existantes de cette `Source`. */
  async function creerSourceVersion(
    clientId: string,
    sourceId: string,
  ): Promise<SourceVersion | { erreur: 'source_introuvable' }> {
    const source = await db.sources.get(sourceId)
    if (!source || source.client_id !== clientId) return { erreur: 'source_introuvable' }

    const versionsExistantes = sourceVersions.value.filter((v) => v.source_id === sourceId)
    const numeroVersion =
      versionsExistantes.reduce((max, v) => Math.max(max, v.numero_version), 0) + 1

    const version: SourceVersion = {
      id: crypto.randomUUID(),
      client_id: clientId,
      source_id: sourceId,
      numero_version: numeroVersion,
      created_at: new Date().toISOString(),
    }
    await db.sourceVersions.put(version)
    sourceVersions.value = [...sourceVersions.value, version]
    return version
  }

  async function enregistrerExtraction(
    clientId: string,
    sourceVersionId: string,
    input: NouvelleExtractionInput,
  ): Promise<Extraction | { erreur: 'version_introuvable' }> {
    const version = await db.sourceVersions.get(sourceVersionId)
    if (!version || version.client_id !== clientId) return { erreur: 'version_introuvable' }

    const extraction: Extraction = {
      id: crypto.randomUUID(),
      client_id: clientId,
      source_version_id: sourceVersionId,
      methode: input.methode,
      horodatage: new Date().toISOString(),
    }
    await db.extractions.put(extraction)
    extractions.value = [...extractions.value, extraction]
    return extraction
  }

  /** Immutable une fois créé — la "preuve de premier niveau" d'une extraction. */
  async function ajouterExtractionItem(
    clientId: string,
    extractionId: string,
    input: NouvelExtractionItemInput,
  ): Promise<ExtractionItem | { erreur: 'extraction_introuvable' }> {
    const extraction = await db.extractions.get(extractionId)
    if (!extraction || extraction.client_id !== clientId)
      return { erreur: 'extraction_introuvable' }

    const item: ExtractionItem = {
      id: crypto.randomUUID(),
      client_id: clientId,
      extraction_id: extractionId,
      contenu: input.contenu,
      position: input.position,
    }
    await db.extractionItems.put(item)
    extractionItems.value = [...extractionItems.value, item]
    return item
  }

  /** Garde-fou non négociable : toujours créé au statut `a_valider`, jamais `valide` à la création. */
  async function creerKnowledgeItem(
    clientId: string,
    extractionItemId: string,
    input: NouveauKnowledgeItemInput,
  ): Promise<KnowledgeItem | { erreur: 'extraction_item_introuvable' }> {
    const item = await db.extractionItems.get(extractionItemId)
    if (!item || item.client_id !== clientId) return { erreur: 'extraction_item_introuvable' }

    const maintenant = new Date().toISOString()
    const knowledgeItem: KnowledgeItem = {
      id: crypto.randomUUID(),
      client_id: clientId,
      extraction_item_id: extractionItemId,
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
    await db.knowledgeItems.put(knowledgeItem)
    knowledgeItems.value = [...knowledgeItems.value, knowledgeItem]
    return knowledgeItem
  }

  /**
   * Validation/rejet toujours humains et explicites — jamais automatiques.
   * Crée un enregistrement `Confirmation` auditable distinct, en plus de la
   * mise à jour dénormalisée de `KnowledgeItem.statut`/`valide_par`.
   */
  async function validerKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
    validateur: string,
  ): Promise<KnowledgeItem | null> {
    return confirmerKnowledgeItem(clientId, knowledgeItemId, validateur, 'confirme')
  }

  async function rejeterKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
    validateur: string,
  ): Promise<KnowledgeItem | null> {
    return confirmerKnowledgeItem(clientId, knowledgeItemId, validateur, 'rejete')
  }

  async function confirmerKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
    validateur: string,
    decision: Confirmation['decision'],
  ): Promise<KnowledgeItem | null> {
    const existant = await db.knowledgeItems.get(knowledgeItemId)
    if (!existant || existant.client_id !== clientId) return null

    const maintenant = new Date().toISOString()
    const confirmation: Confirmation = {
      id: crypto.randomUUID(),
      client_id: clientId,
      knowledge_item_id: knowledgeItemId,
      decision,
      confirme_par: validateur,
      horodatage: maintenant,
    }
    await db.confirmations.put(confirmation)
    confirmations.value = [...confirmations.value, confirmation]

    const statut = decision === 'confirme' ? 'valide' : 'rejete'
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

  /** Lien explicite non conflictuel entre deux `KnowledgeItem` — jamais déduit, idempotent. */
  async function declarerRelation(
    clientId: string,
    input: NouvelleRelationInput,
  ): Promise<KnowledgeRelation> {
    const existante = knowledgeRelations.value.find(
      (r) =>
        r.knowledge_item_source_id === input.knowledgeItemSourceId &&
        r.knowledge_item_cible_id === input.knowledgeItemCibleId &&
        r.type === input.type,
    )
    if (existante) return existante

    const relation: KnowledgeRelation = {
      id: crypto.randomUUID(),
      client_id: clientId,
      knowledge_item_source_id: input.knowledgeItemSourceId,
      knowledge_item_cible_id: input.knowledgeItemCibleId,
      type: input.type,
      created_at: new Date().toISOString(),
    }
    await db.knowledgeRelations.put(relation)
    knowledgeRelations.value = [...knowledgeRelations.value, relation]
    return relation
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

  function knowledgeItemsExtractionItem(extractionItemId: string): KnowledgeItem[] {
    return knowledgeItems.value.filter((k) => k.extraction_item_id === extractionItemId)
  }

  function confirmationsKnowledgeItem(knowledgeItemId: string): Confirmation[] {
    return confirmations.value.filter((c) => c.knowledge_item_id === knowledgeItemId)
  }

  function conflitsOuverts(): Conflict[] {
    return conflicts.value.filter((c) => c.statut === 'ouvert')
  }

  return {
    sources,
    sourceVersions,
    sourceLocations,
    extractions,
    extractionItems,
    knowledgeItems,
    confirmations,
    knowledgeRelations,
    conflicts,
    enChargement,
    charger,
    creerSource,
    ajouterLocalisation,
    creerSourceVersion,
    enregistrerExtraction,
    ajouterExtractionItem,
    creerKnowledgeItem,
    validerKnowledgeItem,
    rejeterKnowledgeItem,
    declarerRelation,
    declarerConflit,
    resoudreConflit,
    knowledgeItemsExtractionItem,
    confirmationsKnowledgeItem,
    conflitsOuverts,
  }
})

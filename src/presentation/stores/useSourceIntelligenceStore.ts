import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ConfirmationWire,
  ConflictWire,
  ExtractionItemWire,
  ExtractionWire,
  KnowledgeItemWire,
  KnowledgeRelationWire,
  SourceLocationWire,
  SourceVersionWire,
  SourceWire,
} from '../../connecteurs/auth/AuthApiClient'
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
import {
  confirmationsAMigrer,
  conflictsAMigrer,
  extractionItemsAMigrer,
  extractionsAMigrer,
  knowledgeItemsAMigrer,
  knowledgeRelationsAMigrer,
  sourceLocationsAMigrer,
  sourceVersionsAMigrer,
  sourcesAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

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

export function sourceWireVersDomaine(w: SourceWire): Source {
  return {
    id: w.id,
    client_id: w.clientId,
    type: w.type as TypeSource,
    titre: w.titre,
    created_at: w.createdAt,
  }
}

export function sourceDomaineVersWire(s: Source): SourceWire {
  return { id: s.id, clientId: s.client_id, type: s.type, titre: s.titre, createdAt: s.created_at }
}

export function sourceLocationWireVersDomaine(w: SourceLocationWire): SourceLocation {
  return {
    id: w.id,
    client_id: w.clientId,
    source_id: w.sourceId,
    systeme: w.systeme as SystemeLocalisationSource,
    reference: w.reference,
  }
}

export function sourceLocationDomaineVersWire(l: SourceLocation): SourceLocationWire {
  return {
    id: l.id,
    clientId: l.client_id,
    sourceId: l.source_id,
    systeme: l.systeme,
    reference: l.reference,
  }
}

export function sourceVersionWireVersDomaine(w: SourceVersionWire): SourceVersion {
  return {
    id: w.id,
    client_id: w.clientId,
    source_id: w.sourceId,
    numero_version: w.numeroVersion,
    created_at: w.createdAt,
  }
}

export function sourceVersionDomaineVersWire(v: SourceVersion): SourceVersionWire {
  return {
    id: v.id,
    clientId: v.client_id,
    sourceId: v.source_id,
    numeroVersion: v.numero_version,
    createdAt: v.created_at,
  }
}

export function extractionWireVersDomaine(w: ExtractionWire): Extraction {
  return {
    id: w.id,
    client_id: w.clientId,
    source_version_id: w.sourceVersionId,
    methode: w.methode as MethodeExtraction,
    horodatage: w.horodatage,
  }
}

export function extractionDomaineVersWire(e: Extraction): ExtractionWire {
  return {
    id: e.id,
    clientId: e.client_id,
    sourceVersionId: e.source_version_id,
    methode: e.methode,
    horodatage: e.horodatage,
  }
}

export function extractionItemWireVersDomaine(w: ExtractionItemWire): ExtractionItem {
  return {
    id: w.id,
    client_id: w.clientId,
    extraction_id: w.extractionId,
    contenu: w.contenu,
    position: w.position,
  }
}

export function extractionItemDomaineVersWire(i: ExtractionItem): ExtractionItemWire {
  return {
    id: i.id,
    clientId: i.client_id,
    extractionId: i.extraction_id,
    contenu: i.contenu,
    position: i.position,
  }
}

export function knowledgeItemWireVersDomaine(w: KnowledgeItemWire): KnowledgeItem {
  return {
    id: w.id,
    client_id: w.clientId,
    extraction_item_id: w.extractionItemId,
    libelle: w.libelle,
    valeur_interpretee: w.valeurInterpretee,
    statut: w.statut as KnowledgeItem['statut'],
    valide_par: w.validePar,
    audit_log: w.auditLog,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  }
}

export function knowledgeItemDomaineVersWire(k: KnowledgeItem): KnowledgeItemWire {
  return {
    id: k.id,
    clientId: k.client_id,
    extractionItemId: k.extraction_item_id,
    libelle: k.libelle,
    valeurInterpretee: k.valeur_interpretee,
    statut: k.statut,
    validePar: k.valide_par,
    auditLog: k.audit_log,
    createdAt: k.created_at,
    updatedAt: k.updated_at,
  }
}

export function confirmationWireVersDomaine(w: ConfirmationWire): Confirmation {
  return {
    id: w.id,
    client_id: w.clientId,
    knowledge_item_id: w.knowledgeItemId,
    decision: w.decision as Confirmation['decision'],
    confirme_par: w.confirmePar,
    horodatage: w.horodatage,
  }
}

export function confirmationDomaineVersWire(c: Confirmation): ConfirmationWire {
  return {
    id: c.id,
    clientId: c.client_id,
    knowledgeItemId: c.knowledge_item_id,
    decision: c.decision,
    confirmePar: c.confirme_par,
    horodatage: c.horodatage,
  }
}

export function knowledgeRelationWireVersDomaine(w: KnowledgeRelationWire): KnowledgeRelation {
  return {
    id: w.id,
    client_id: w.clientId,
    knowledge_item_source_id: w.knowledgeItemSourceId,
    knowledge_item_cible_id: w.knowledgeItemCibleId,
    type: w.type,
    created_at: w.createdAt,
  }
}

export function knowledgeRelationDomaineVersWire(r: KnowledgeRelation): KnowledgeRelationWire {
  return {
    id: r.id,
    clientId: r.client_id,
    knowledgeItemSourceId: r.knowledge_item_source_id,
    knowledgeItemCibleId: r.knowledge_item_cible_id,
    type: r.type,
    createdAt: r.created_at,
  }
}

export function conflictWireVersDomaine(w: ConflictWire): Conflict {
  return {
    id: w.id,
    client_id: w.clientId,
    knowledge_item_source_id: w.knowledgeItemSourceId,
    knowledge_item_cible_id: w.knowledgeItemCibleId,
    description: w.description,
    statut: w.statut as Conflict['statut'],
    resolution: w.resolution,
    created_at: w.createdAt,
  }
}

export function conflictDomaineVersWire(c: Conflict): ConflictWire {
  return {
    id: c.id,
    clientId: c.client_id,
    knowledgeItemSourceId: c.knowledge_item_source_id,
    knowledgeItemCibleId: c.knowledge_item_cible_id,
    description: c.description,
    statut: c.statut,
    resolution: c.resolution,
    createdAt: c.created_at,
  }
}

/**
 * Store de la structuration assistée de documents (convergence
 * architecturale — spec dans
 * `docs/convergence/PHASE_8A_SOURCE_INTELLIGENCE_SPEC.md`).
 *
 * **Migré vers le Worker/D1 (Phase 7a du chantier de migration D1)** —
 * même patron que les phases précédentes : `id`/timestamps/identité
 * (`confirmePar`/`validePar`, dérivés de la session authentifiée)
 * toujours calculés côté serveur, jamais fait confiance au client — les
 * anciennes signatures qui prenaient un `validateur` fourni par
 * l'appelant (`validerKnowledgeItem`/`rejeterKnowledgeItem`) ne le
 * prennent plus. Aucun appel IA réel dans ce module —
 * `valeurInterpretee` est toujours fournie par l'appelant.
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
   * réel qu'une seule fois (voir migration Dexie v48, `persistance/db.ts`).
   * Filtre par client avant envoi, même patron que les autres domaines de
   * ce chantier.
   */
  async function migrerKnowledgeEngineLocalVersServeur(clientId: string): Promise<void> {
    const sourcesDuClient = sourcesAMigrer.filter((s) => s.client_id === clientId)
    const sourceLocationsDuClient = sourceLocationsAMigrer.filter((l) => l.client_id === clientId)
    const sourceVersionsDuClient = sourceVersionsAMigrer.filter((v) => v.client_id === clientId)
    const extractionsDuClient = extractionsAMigrer.filter((e) => e.client_id === clientId)
    const extractionItemsDuClient = extractionItemsAMigrer.filter((i) => i.client_id === clientId)
    const knowledgeItemsDuClient = knowledgeItemsAMigrer.filter((k) => k.client_id === clientId)
    const confirmationsDuClient = confirmationsAMigrer.filter((c) => c.client_id === clientId)
    const knowledgeRelationsDuClient = knowledgeRelationsAMigrer.filter(
      (r) => r.client_id === clientId,
    )
    const conflictsDuClient = conflictsAMigrer.filter((c) => c.client_id === clientId)
    if (
      sourcesDuClient.length === 0 &&
      sourceLocationsDuClient.length === 0 &&
      sourceVersionsDuClient.length === 0 &&
      extractionsDuClient.length === 0 &&
      extractionItemsDuClient.length === 0 &&
      knowledgeItemsDuClient.length === 0 &&
      confirmationsDuClient.length === 0 &&
      knowledgeRelationsDuClient.length === 0 &&
      conflictsDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerKnowledgeEngineLocal(jeton, clientId, {
      sources: sourcesDuClient.map(sourceDomaineVersWire),
      sourceLocations: sourceLocationsDuClient.map(sourceLocationDomaineVersWire),
      sourceVersions: sourceVersionsDuClient.map(sourceVersionDomaineVersWire),
      extractions: extractionsDuClient.map(extractionDomaineVersWire),
      extractionItems: extractionItemsDuClient.map(extractionItemDomaineVersWire),
      knowledgeItems: knowledgeItemsDuClient.map(knowledgeItemDomaineVersWire),
      confirmations: confirmationsDuClient.map(confirmationDomaineVersWire),
      knowledgeRelations: knowledgeRelationsDuClient.map(knowledgeRelationDomaineVersWire),
      conflicts: conflictsDuClient.map(conflictDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Source Intelligence/Knowledge : ${resultat.erreur}`)
    }
    for (const [tableau, duClient] of [
      [sourcesAMigrer, sourcesDuClient],
      [sourceLocationsAMigrer, sourceLocationsDuClient],
      [sourceVersionsAMigrer, sourceVersionsDuClient],
      [extractionsAMigrer, extractionsDuClient],
      [extractionItemsAMigrer, extractionItemsDuClient],
      [knowledgeItemsAMigrer, knowledgeItemsDuClient],
      [confirmationsAMigrer, confirmationsDuClient],
      [knowledgeRelationsAMigrer, knowledgeRelationsDuClient],
      [conflictsAMigrer, conflictsDuClient],
    ] as const) {
      for (const entree of duClient) {
        const index = (tableau as unknown[]).indexOf(entree)
        if (index !== -1) (tableau as unknown[]).splice(index, 1)
      }
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerKnowledgeEngineLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirKnowledgeEngine(jeton, clientId)
      if (resultat.ok) {
        sources.value = resultat.donnees.sources.map(sourceWireVersDomaine)
        sourceLocations.value = resultat.donnees.sourceLocations.map(sourceLocationWireVersDomaine)
        sourceVersions.value = resultat.donnees.sourceVersions.map(sourceVersionWireVersDomaine)
        extractions.value = resultat.donnees.extractions.map(extractionWireVersDomaine)
        extractionItems.value = resultat.donnees.extractionItems.map(extractionItemWireVersDomaine)
        knowledgeItems.value = resultat.donnees.knowledgeItems.map(knowledgeItemWireVersDomaine)
        confirmations.value = resultat.donnees.confirmations.map(confirmationWireVersDomaine)
        knowledgeRelations.value = resultat.donnees.knowledgeRelations.map(
          knowledgeRelationWireVersDomaine,
        )
        conflicts.value = resultat.donnees.conflicts.map(conflictWireVersDomaine)
      } else {
        sources.value = []
        sourceLocations.value = []
        sourceVersions.value = []
        extractions.value = []
        extractionItems.value = []
        knowledgeItems.value = []
        confirmations.value = []
        knowledgeRelations.value = []
        conflicts.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      sources.value = []
      sourceLocations.value = []
      sourceVersions.value = []
      extractions.value = []
      extractionItems.value = []
      knowledgeItems.value = []
      confirmations.value = []
      knowledgeRelations.value = []
      conflicts.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerSource(clientId: string, input: NouvelleSourceInput): Promise<Source> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerSource(jeton, clientId, {
      type: input.type,
      titre: input.titre,
    })
    if (!resultat.ok) throw new Error(`Échec de la création de la source : ${resultat.erreur}`)
    const source = sourceWireVersDomaine(resultat.donnees.source)
    sources.value = [...sources.value, source]
    return source
  }

  /** Un `Source` peut avoir plusieurs localisations (ex. miroir Drive + référence externe). */
  async function ajouterLocalisation(
    clientId: string,
    sourceId: string,
    input: NouvelleLocalisationSourceInput,
  ): Promise<SourceLocation | { erreur: 'source_introuvable' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.ajouterLocalisationSource(jeton, clientId, sourceId, {
      systeme: input.systeme,
      reference: input.reference,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'source_introuvable') return { erreur: 'source_introuvable' }
      throw new Error(`Échec de l'ajout de la localisation : ${resultat.erreur}`)
    }
    const localisation = sourceLocationWireVersDomaine(resultat.donnees.sourceLocation)
    sourceLocations.value = [...sourceLocations.value, localisation]
    return localisation
  }

  /** `numero_version` est auto-incrémenté côté serveur à partir des versions existantes de cette `Source`. */
  async function creerSourceVersion(
    clientId: string,
    sourceId: string,
  ): Promise<SourceVersion | { erreur: 'source_introuvable' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerSourceVersion(jeton, clientId, sourceId)
    if (!resultat.ok) {
      if (resultat.erreur === 'source_introuvable') return { erreur: 'source_introuvable' }
      throw new Error(`Échec de la création de la version : ${resultat.erreur}`)
    }
    const version = sourceVersionWireVersDomaine(resultat.donnees.sourceVersion)
    sourceVersions.value = [...sourceVersions.value, version]
    return version
  }

  async function enregistrerExtraction(
    clientId: string,
    sourceVersionId: string,
    input: NouvelleExtractionInput,
  ): Promise<Extraction | { erreur: 'version_introuvable' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.enregistrerExtraction(jeton, clientId, sourceVersionId, {
      methode: input.methode,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'version_introuvable') return { erreur: 'version_introuvable' }
      throw new Error(`Échec de l'enregistrement de l'extraction : ${resultat.erreur}`)
    }
    const extraction = extractionWireVersDomaine(resultat.donnees.extraction)
    extractions.value = [...extractions.value, extraction]
    return extraction
  }

  /** Immutable une fois créé — la "preuve de premier niveau" d'une extraction. */
  async function ajouterExtractionItem(
    clientId: string,
    extractionId: string,
    input: NouvelExtractionItemInput,
  ): Promise<ExtractionItem | { erreur: 'extraction_introuvable' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.ajouterExtractionItem(jeton, clientId, extractionId, {
      contenu: input.contenu,
      position: input.position,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'extraction_introuvable') return { erreur: 'extraction_introuvable' }
      throw new Error(`Échec de l'ajout de l'ExtractionItem : ${resultat.erreur}`)
    }
    const item = extractionItemWireVersDomaine(resultat.donnees.extractionItem)
    extractionItems.value = [...extractionItems.value, item]
    return item
  }

  /** Garde-fou non négociable : toujours créé au statut `a_valider`, jamais `valide` à la création. */
  async function creerKnowledgeItem(
    clientId: string,
    extractionItemId: string,
    input: NouveauKnowledgeItemInput,
  ): Promise<KnowledgeItem | { erreur: 'extraction_item_introuvable' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerKnowledgeItem(jeton, clientId, extractionItemId, {
      libelle: input.libelle,
      valeurInterpretee: input.valeurInterpretee,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'extraction_item_introuvable') {
        return { erreur: 'extraction_item_introuvable' }
      }
      throw new Error(`Échec de la création du KnowledgeItem : ${resultat.erreur}`)
    }
    const knowledgeItem = knowledgeItemWireVersDomaine(resultat.donnees.knowledgeItem)
    knowledgeItems.value = [...knowledgeItems.value, knowledgeItem]
    return knowledgeItem
  }

  /**
   * Validation/rejet toujours humains et explicites — jamais automatiques.
   * `confirmePar`/`valide_par` sont dérivés côté serveur de la session
   * authentifiée, jamais fournis par l'appelant.
   */
  async function validerKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
  ): Promise<KnowledgeItem | null> {
    return confirmerKnowledgeItem(clientId, knowledgeItemId, 'confirme')
  }

  async function rejeterKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
  ): Promise<KnowledgeItem | null> {
    return confirmerKnowledgeItem(clientId, knowledgeItemId, 'rejete')
  }

  async function confirmerKnowledgeItem(
    clientId: string,
    knowledgeItemId: string,
    decision: 'confirme' | 'rejete',
  ): Promise<KnowledgeItem | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.confirmerKnowledgeItem(jeton, clientId, knowledgeItemId, {
      decision,
    })
    if (!resultat.ok) return null

    const confirmation = confirmationWireVersDomaine(resultat.donnees.confirmation)
    confirmations.value = [...confirmations.value, confirmation]

    const miseAJour = knowledgeItemWireVersDomaine(resultat.donnees.knowledgeItem)
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
    const { api, jeton } = await obtenirApi()
    const resultat = await api.declarerRelation(jeton, clientId, {
      knowledgeItemSourceId: input.knowledgeItemSourceId,
      knowledgeItemCibleId: input.knowledgeItemCibleId,
      type: input.type,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la déclaration de la relation : ${resultat.erreur}`)
    }
    const relation = knowledgeRelationWireVersDomaine(resultat.donnees.knowledgeRelation)
    if (!knowledgeRelations.value.some((r) => r.id === relation.id)) {
      knowledgeRelations.value = [...knowledgeRelations.value, relation]
    }
    return relation
  }

  async function declarerConflit(clientId: string, input: NouveauConflictInput): Promise<Conflict> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.declarerConflit(jeton, clientId, {
      knowledgeItemSourceId: input.knowledgeItemSourceId,
      knowledgeItemCibleId: input.knowledgeItemCibleId,
      description: input.description,
    })
    if (!resultat.ok) throw new Error(`Échec de la déclaration du conflit : ${resultat.erreur}`)
    const conflit = conflictWireVersDomaine(resultat.donnees.conflict)
    conflicts.value = [...conflicts.value, conflit]
    return conflit
  }

  /** Un Conflict reste `ouvert` tant qu'aucune résolution explicite n'est fournie — jamais auto-résolu. */
  async function resoudreConflit(
    clientId: string,
    conflictId: string,
    resolution: string,
  ): Promise<Conflict | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.resoudreConflit(jeton, clientId, conflictId, { resolution })
    if (!resultat.ok) return null
    const miseAJour = conflictWireVersDomaine(resultat.donnees.conflict)
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

import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useSourceIntelligenceStore } from './useSourceIntelligenceStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.sources.clear()
  await db.sourceVersions.clear()
  await db.sourceLocations.clear()
  await db.extractions.clear()
  await db.extractionItems.clear()
  await db.knowledgeItems.clear()
  await db.confirmations.clear()
  await db.knowledgeRelations.clear()
  await db.conflicts.clear()
})

/** Construit la chaîne complète Source -> SourceVersion -> Extraction -> ExtractionItem. */
async function creerExtractionItem(
  store: ReturnType<typeof useSourceIntelligenceStore>,
  clientId: string,
) {
  const source = await store.creerSource(clientId, {
    type: 'document',
    titre: 'Certificat étalonnage sonde T1',
  })
  const version = await store.creerSourceVersion(clientId, source.id)
  if ('erreur' in version) throw new Error('unreachable')
  const extraction = await store.enregistrerExtraction(clientId, version.id, {
    methode: 'ocr_azure',
  })
  if ('erreur' in extraction) throw new Error('unreachable')
  const item = await store.ajouterExtractionItem(clientId, extraction.id, {
    contenu: 'Sonde T1 - Plage -20°C à +80°C - Certifiée le 01/08/2026',
    position: 1,
  })
  if ('erreur' in item) throw new Error('unreachable')
  return { source, version, extraction, item }
}

describe('useSourceIntelligenceStore — chaîne nominale', () => {
  test('Source -> SourceVersion -> Extraction -> ExtractionItem -> KnowledgeItem, toujours créé a_valider (NEEDS_REVIEW)', async () => {
    const store = useSourceIntelligenceStore()
    await store.charger('client-1')

    const { source, version, item } = await creerExtractionItem(store, 'client-1')
    expect(version.numero_version).toBe(1)
    expect(store.knowledgeItemsExtractionItem(item.id)).toHaveLength(0)

    const localisation = await store.ajouterLocalisation('client-1', source.id, {
      systeme: 'drive',
      reference: '/sources/certificat-t1.pdf',
    })
    if ('erreur' in localisation) throw new Error('unreachable')

    const knowledgeItem = await store.creerKnowledgeItem('client-1', item.id, {
      libelle: 'Plage de mesure sonde T1',
      valeurInterpretee: '-20°C à +80°C',
    })
    if ('erreur' in knowledgeItem) throw new Error('unreachable')
    expect(knowledgeItem.statut).toBe('a_valider')
    expect(knowledgeItem.valide_par).toBeNull()
    expect(store.knowledgeItemsExtractionItem(item.id)).toHaveLength(1)

    const valide = await store.validerKnowledgeItem(
      'client-1',
      knowledgeItem.id,
      'auditeur-qualite',
    )
    expect(valide?.statut).toBe('valide')
    expect(valide?.valide_par).toBe('auditeur-qualite')
    expect(valide?.audit_log).toHaveLength(2)

    const confirmations = store.confirmationsKnowledgeItem(knowledgeItem.id)
    expect(confirmations).toHaveLength(1)
    expect(confirmations[0]?.decision).toBe('confirme')
  })

  test('une Source peut avoir plusieurs SourceVersion, numérotées séquentiellement', async () => {
    const store = useSourceIntelligenceStore()
    const source = await store.creerSource('client-1', { type: 'document', titre: 'Source' })
    const v1 = await store.creerSourceVersion('client-1', source.id)
    const v2 = await store.creerSourceVersion('client-1', source.id)
    if ('erreur' in v1 || 'erreur' in v2) throw new Error('unreachable')
    expect(v1.numero_version).toBe(1)
    expect(v2.numero_version).toBe(2)
  })

  test('un KnowledgeItem peut être rejeté avec traçabilité du validateur', async () => {
    const store = useSourceIntelligenceStore()
    const { item } = await creerExtractionItem(store, 'client-1')
    const knowledgeItem = await store.creerKnowledgeItem('client-1', item.id, {
      libelle: 'Numéro de série',
      valeurInterpretee: 'incertain',
    })
    if ('erreur' in knowledgeItem) throw new Error('unreachable')

    const rejete = await store.rejeterKnowledgeItem(
      'client-1',
      knowledgeItem.id,
      'auditeur-qualite',
    )
    expect(rejete?.statut).toBe('rejete')
    expect(store.confirmationsKnowledgeItem(knowledgeItem.id)[0]?.decision).toBe('rejete')
  })

  test('deux KnowledgeItem peuvent être liés explicitement sans conflit (KnowledgeRelation), idempotent', async () => {
    const store = useSourceIntelligenceStore()
    const { item } = await creerExtractionItem(store, 'client-1')
    const itemA = await store.creerKnowledgeItem('client-1', item.id, {
      libelle: 'A',
      valeurInterpretee: '1',
    })
    const itemB = await store.creerKnowledgeItem('client-1', item.id, {
      libelle: 'B',
      valeurInterpretee: '2',
    })
    if ('erreur' in itemA || 'erreur' in itemB) throw new Error('unreachable')

    await store.declarerRelation('client-1', {
      knowledgeItemSourceId: itemA.id,
      knowledgeItemCibleId: itemB.id,
      type: 'precise',
    })
    await store.declarerRelation('client-1', {
      knowledgeItemSourceId: itemA.id,
      knowledgeItemCibleId: itemB.id,
      type: 'precise',
    })
    expect(store.knowledgeRelations).toHaveLength(1)
  })
})

describe('useSourceIntelligenceStore — Conflict', () => {
  test('un conflit entre deux KnowledgeItem reste ouvert jusqu’à résolution explicite', async () => {
    const store = useSourceIntelligenceStore()
    const { item: itemA } = await creerExtractionItem(store, 'client-1')
    const { item: itemB } = await creerExtractionItem(store, 'client-1')

    const knowledgeA = await store.creerKnowledgeItem('client-1', itemA.id, {
      libelle: 'Tolérance',
      valeurInterpretee: '±0.5°C',
    })
    const knowledgeB = await store.creerKnowledgeItem('client-1', itemB.id, {
      libelle: 'Tolérance',
      valeurInterpretee: '±1°C',
    })
    if ('erreur' in knowledgeA || 'erreur' in knowledgeB) throw new Error('unreachable')

    const conflit = await store.declarerConflit('client-1', {
      knowledgeItemSourceId: knowledgeA.id,
      knowledgeItemCibleId: knowledgeB.id,
      description: 'Deux tolérances différentes pour le même paramètre',
    })
    expect(conflit.statut).toBe('ouvert')
    expect(store.conflitsOuverts()).toHaveLength(1)

    const resolu = await store.resoudreConflit(
      'client-1',
      conflit.id,
      'Source A retenue, certificat le plus récent',
    )
    expect(resolu?.statut).toBe('resolu')
    expect(resolu?.resolution).toBe('Source A retenue, certificat le plus récent')
    expect(store.conflitsOuverts()).toHaveLength(0)
  })
})

describe('useSourceIntelligenceStore — garde-fous', () => {
  test('une SourceVersion ne peut être créée que pour une Source existante', async () => {
    const store = useSourceIntelligenceStore()
    const resultat = await store.creerSourceVersion('client-1', 'source-inconnue')
    expect(resultat).toEqual({ erreur: 'source_introuvable' })
  })

  test('une Extraction ne peut être créée que pour une SourceVersion existante', async () => {
    const store = useSourceIntelligenceStore()
    const resultat = await store.enregistrerExtraction('client-1', 'version-inconnue', {
      methode: 'ocr_azure',
    })
    expect(resultat).toEqual({ erreur: 'version_introuvable' })
  })

  test('un ExtractionItem ne peut être créé que pour une Extraction existante', async () => {
    const store = useSourceIntelligenceStore()
    const resultat = await store.ajouterExtractionItem('client-1', 'extraction-inconnue', {
      contenu: '',
      position: 1,
    })
    expect(resultat).toEqual({ erreur: 'extraction_introuvable' })
  })

  test('un KnowledgeItem ne peut être créé que pour un ExtractionItem existant', async () => {
    const store = useSourceIntelligenceStore()
    const resultat = await store.creerKnowledgeItem('client-1', 'item-inconnu', {
      libelle: '',
      valeurInterpretee: '',
    })
    expect(resultat).toEqual({ erreur: 'extraction_item_introuvable' })
  })
})

describe('useSourceIntelligenceStore — isolation stricte par client', () => {
  test("les sources d'un client ne fuient pas vers un autre", async () => {
    const store = useSourceIntelligenceStore()
    await store.charger('client-A')
    await store.creerSource('client-A', { type: 'document', titre: 'Source A' })
    await store.charger('client-B')
    expect(store.sources).toHaveLength(0)
  })
})

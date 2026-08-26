import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useSourceIntelligenceStore } from './useSourceIntelligenceStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.sources.clear()
  await db.extractions.clear()
  await db.knowledgeItems.clear()
  await db.conflicts.clear()
})

describe('useSourceIntelligenceStore — chaîne nominale', () => {
  test('Source -> Extraction -> KnowledgeItem, toujours créé à_valider (NEEDS_REVIEW)', async () => {
    const store = useSourceIntelligenceStore()
    await store.charger('client-1')

    const source = await store.creerSource('client-1', {
      type: 'document',
      titre: 'Certificat étalonnage sonde T1',
      systeme: 'drive',
      reference: '/sources/certificat-t1.pdf',
    })

    const extraction = await store.enregistrerExtraction('client-1', source.id, {
      methode: 'ocr_azure',
      contenuBrut: 'Sonde T1 - Plage -20°C à +80°C - Certifiée le 01/08/2026',
    })
    if ('erreur' in extraction) throw new Error('unreachable')

    const item = await store.creerKnowledgeItem('client-1', extraction.id, {
      libelle: 'Plage de mesure sonde T1',
      valeurInterpretee: '-20°C à +80°C',
    })
    if ('erreur' in item) throw new Error('unreachable')
    expect(item.statut).toBe('a_valider')
    expect(item.valide_par).toBeNull()

    const valide = await store.validerKnowledgeItem('client-1', item.id, 'auditeur-qualite')
    expect(valide?.statut).toBe('valide')
    expect(valide?.valide_par).toBe('auditeur-qualite')
    expect(valide?.audit_log).toHaveLength(2)
  })

  test('un KnowledgeItem peut être rejeté avec traçabilité du validateur', async () => {
    const store = useSourceIntelligenceStore()
    const source = await store.creerSource('client-1', {
      type: 'image',
      titre: 'Photo plaque signalétique',
      systeme: 'externe',
      reference: 'photo-001.jpg',
    })
    const extraction = await store.enregistrerExtraction('client-1', source.id, {
      methode: 'ocr_azure',
      contenuBrut: 'texte illisible partiellement',
    })
    if ('erreur' in extraction) throw new Error('unreachable')
    const item = await store.creerKnowledgeItem('client-1', extraction.id, {
      libelle: 'Numéro de série',
      valeurInterpretee: 'incertain',
    })
    if ('erreur' in item) throw new Error('unreachable')

    const rejete = await store.rejeterKnowledgeItem('client-1', item.id, 'auditeur-qualite')
    expect(rejete?.statut).toBe('rejete')
  })
})

describe('useSourceIntelligenceStore — Conflict', () => {
  test('un conflit entre deux KnowledgeItem reste ouvert jusqu’à résolution explicite', async () => {
    const store = useSourceIntelligenceStore()
    const source1 = await store.creerSource('client-1', {
      type: 'document',
      titre: 'Source A',
      systeme: 'drive',
      reference: 'a.pdf',
    })
    const source2 = await store.creerSource('client-1', {
      type: 'document',
      titre: 'Source B',
      systeme: 'drive',
      reference: 'b.pdf',
    })
    const extractionA = await store.enregistrerExtraction('client-1', source1.id, {
      methode: 'saisie_manuelle',
      contenuBrut: 'Tolérance ±0.5°C',
    })
    const extractionB = await store.enregistrerExtraction('client-1', source2.id, {
      methode: 'saisie_manuelle',
      contenuBrut: 'Tolérance ±1°C',
    })
    if ('erreur' in extractionA || 'erreur' in extractionB) throw new Error('unreachable')

    const itemA = await store.creerKnowledgeItem('client-1', extractionA.id, {
      libelle: 'Tolérance',
      valeurInterpretee: '±0.5°C',
    })
    const itemB = await store.creerKnowledgeItem('client-1', extractionB.id, {
      libelle: 'Tolérance',
      valeurInterpretee: '±1°C',
    })
    if ('erreur' in itemA || 'erreur' in itemB) throw new Error('unreachable')

    const conflit = await store.declarerConflit('client-1', {
      knowledgeItemSourceId: itemA.id,
      knowledgeItemCibleId: itemB.id,
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
  test('une Extraction ne peut être créée que pour une Source existante', async () => {
    const store = useSourceIntelligenceStore()
    const resultat = await store.enregistrerExtraction('client-1', 'source-inconnue', {
      methode: 'ocr_azure',
      contenuBrut: '',
    })
    expect(resultat).toEqual({ erreur: 'source_introuvable' })
  })

  test('un KnowledgeItem ne peut être créé que pour une Extraction existante', async () => {
    const store = useSourceIntelligenceStore()
    const resultat = await store.creerKnowledgeItem('client-1', 'extraction-inconnue', {
      libelle: '',
      valeurInterpretee: '',
    })
    expect(resultat).toEqual({ erreur: 'extraction_introuvable' })
  })
})

describe('useSourceIntelligenceStore — isolation stricte par client', () => {
  test("les sources d'un client ne fuient pas vers un autre", async () => {
    const store = useSourceIntelligenceStore()
    await store.charger('client-A')
    await store.creerSource('client-A', {
      type: 'document',
      titre: 'Source A',
      systeme: 'drive',
      reference: 'a.pdf',
    })
    await store.charger('client-B')
    expect(store.sources).toHaveLength(0)
  })
})

import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import type { AssetNode } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
import { useStructureSystemeStore } from './useStructureSystemeStore'

function idDuNoeud(noeuds: readonly AssetNode[], code: string): string {
  const trouve = noeuds.find((n) => n.code === code)
  expect(trouve).toBeDefined()
  return trouve?.id ?? ''
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.assetHierarchySchemas.clear()
  await db.assetNodes.clear()
})

describe('useStructureSystemeStore — charger', () => {
  test('client sans schéma existant -> schéma vide par défaut, aucun nœud', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    expect(store.schema).toEqual({ client_id: 'client-1', levels: [] })
    expect(store.noeuds).toEqual([])
  })
})

describe('useStructureSystemeStore — ajouterNiveau (URS-F-100bis)', () => {
  test('ajoute un niveau à la hiérarchie du client', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    await store.ajouterNiveau('client-1', {
      key: 'site',
      label: { fr: 'Site', en: 'Site', de: 'Standort' },
      numbering_pattern: 'S-{n}',
    })
    expect(store.schema?.levels).toHaveLength(1)
    expect(store.schema?.levels[0]?.key).toBe('site')
  })

  test("ajouts successifs : chaque niveau persiste, aucun n'écrase le précédent", async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    await store.ajouterNiveau('client-1', {
      key: 'site',
      label: { fr: 'Site', en: 'Site', de: 'Standort' },
      numbering_pattern: 'S-{n}',
    })
    await store.ajouterNiveau('client-1', {
      key: 'zone',
      label: { fr: 'Zone', en: 'Zone', de: 'Zone' },
      numbering_pattern: 'Z-{n}',
    })
    expect(store.schema?.levels.map((l) => l.key)).toEqual(['site', 'zone'])

    const relu = await db.assetHierarchySchemas.get('client-1')
    expect(relu?.levels.map((l) => l.key)).toEqual(['site', 'zone'])
  })
})

describe('useStructureSystemeStore — creerNoeud', () => {
  test('crée un nœud racine avec audit_log initial', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    const resultat = await store.creerNoeud('client-1', {
      level_key: 'site',
      name: 'Site Marcy',
      code: 'SITE-001',
      parent_id: null,
    })
    expect(resultat).toEqual({ ok: true })
    expect(store.noeuds).toHaveLength(1)
    expect(store.noeuds[0]?.audit_log).toHaveLength(1)
    expect(store.noeuds[0]?.audit_log[0]?.action).toBe('création')
  })

  test('code déjà utilisé chez ce client -> rejet explicite (URS-F-100nonies)', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    await store.creerNoeud('client-1', {
      level_key: 'site',
      name: 'Site A',
      code: 'DOUBLON',
      parent_id: null,
    })
    const resultat = await store.creerNoeud('client-1', {
      level_key: 'site',
      name: 'Site B',
      code: 'DOUBLON',
      parent_id: null,
    })
    expect(resultat).toEqual({ ok: false, raison: 'code_deja_utilise' })
    expect(store.noeuds).toHaveLength(1)
  })

  test('isolation stricte par client (URS-F-100) : même code accepté pour un autre client', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-A')
    await store.creerNoeud('client-A', {
      level_key: 'site',
      name: 'Site A',
      code: 'MEME-CODE',
      parent_id: null,
    })
    await store.charger('client-B')
    const resultat = await store.creerNoeud('client-B', {
      level_key: 'site',
      name: 'Site B',
      code: 'MEME-CODE',
      parent_id: null,
    })
    expect(resultat).toEqual({ ok: true })
  })
})

describe('useStructureSystemeStore — reparenterNoeud (URS-F-100octies)', () => {
  test('reparentage valide : parent_id mis à jour, journalisé', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    await store.creerNoeud('client-1', {
      level_key: 'site',
      name: 'Site',
      code: 'S-1',
      parent_id: null,
    })
    await store.creerNoeud('client-1', {
      level_key: 'zone',
      name: 'Zone',
      code: 'Z-1',
      parent_id: null,
    })
    const siteId = idDuNoeud(store.noeuds, 'S-1')
    const zoneId = idDuNoeud(store.noeuds, 'Z-1')

    const resultat = await store.reparenterNoeud(zoneId, siteId)
    expect(resultat).toEqual({ ok: true })
    const zoneMaj = store.noeuds.find((n) => n.id === zoneId)
    expect(zoneMaj?.parent_id).toBe(siteId)
    expect(zoneMaj?.audit_log).toHaveLength(2)
    expect(zoneMaj?.audit_log[1]?.action).toBe('modification')
  })

  test('reparentage introduisant un cycle -> rejeté, jamais silencieux', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    await store.creerNoeud('client-1', {
      level_key: 'site',
      name: 'A',
      code: 'A',
      parent_id: null,
    })
    const aId = idDuNoeud(store.noeuds, 'A')
    await store.creerNoeud('client-1', {
      level_key: 'zone',
      name: 'B',
      code: 'B',
      parent_id: aId,
    })
    const bId = idDuNoeud(store.noeuds, 'B')

    // Tenter de rattacher A sous B créerait A -> B -> A
    const resultat = await store.reparenterNoeud(aId, bId)
    expect(resultat).toEqual({ ok: false, raison: 'cycle_introduit' })
    const aInchange = store.noeuds.find((n) => n.id === aId)
    expect(aInchange?.parent_id).toBeNull()
  })
})

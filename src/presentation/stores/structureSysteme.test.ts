import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import type { AssetNode, Workspace } from '../../logique-metier/domaine/types'
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
  await db.organizations.clear()
  await db.workspaces.clear()
  await db.relationsTechniques.clear()
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

describe('useStructureSystemeStore — câblage Workspace, étape 1 (CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md)', () => {
  async function creerOrganizationEtWorkspaces(clientId: string) {
    await db.organizations.put({
      id: clientId,
      nom: 'Client Pharma',
      created_at: new Date().toISOString(),
    })
    const global: Workspace = {
      id: crypto.randomUUID(),
      organization_id: clientId,
      type: 'global',
      nom: 'Global',
      parent_workspace_id: null,
      created_at: new Date().toISOString(),
    }
    const siteA: Workspace = {
      id: crypto.randomUUID(),
      organization_id: clientId,
      type: 'site',
      nom: 'Site A',
      parent_workspace_id: global.id,
      created_at: new Date().toISOString(),
    }
    const siteB: Workspace = {
      id: crypto.randomUUID(),
      organization_id: clientId,
      type: 'site',
      nom: 'Site B',
      parent_workspace_id: global.id,
      created_at: new Date().toISOString(),
    }
    await db.workspaces.bulkPut([global, siteA, siteB])
    return { global, siteA, siteB }
  }

  function arbre(
    workspaces: Workspace[],
  ): ReadonlyMap<string, Pick<Workspace, 'id' | 'parent_workspace_id'>> {
    return new Map(
      workspaces.map((w) => [w.id, { id: w.id, parent_workspace_id: w.parent_workspace_id }]),
    )
  }

  test('creerNoeud avec un workspace_id inconnu -> rejet explicite, aucune création', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    const resultat = await store.creerNoeud('client-1', {
      level_key: 'equipement',
      name: 'Pompe',
      code: 'EQ-1',
      parent_id: null,
      workspace_id: 'workspace-inconnu',
    })
    expect(resultat).toEqual({ ok: false, raison: 'workspace_introuvable' })
    expect(store.noeuds).toHaveLength(0)
  })

  test("creerNoeud avec un workspace d'une autre organisation -> rejet explicite", async () => {
    const { global } = await creerOrganizationEtWorkspaces('client-A')
    const store = useStructureSystemeStore()
    await store.charger('client-B')
    const resultat = await store.creerNoeud('client-B', {
      level_key: 'equipement',
      name: 'Pompe',
      code: 'EQ-1',
      parent_id: null,
      workspace_id: global.id,
    })
    expect(resultat).toEqual({ ok: false, raison: 'workspace_introuvable' })
  })

  test('scénario obligatoire "Global + N sites" : un actif global est visible partout, un actif de site ne fuite jamais vers un autre site', async () => {
    const { global, siteA, siteB } = await creerOrganizationEtWorkspaces('client-1')
    const store = useStructureSystemeStore()
    await store.charger('client-1')

    await store.creerNoeud('client-1', {
      level_key: 'referentiel',
      name: 'Norme groupe',
      code: 'GLOBAL-1',
      parent_id: null,
      workspace_id: global.id,
    })
    await store.creerNoeud('client-1', {
      level_key: 'equipement',
      name: 'Presse A',
      code: 'SITE-A-1',
      parent_id: null,
      workspace_id: siteA.id,
    })
    await store.creerNoeud('client-1', {
      level_key: 'equipement',
      name: 'Presse B',
      code: 'SITE-B-1',
      parent_id: null,
      workspace_id: siteB.id,
    })

    const carte = arbre([global, siteA, siteB])
    const depuisSiteA = store.noeudsVisiblesDepuisWorkspace(siteA.id, carte).map((n) => n.code)
    const depuisSiteB = store.noeudsVisiblesDepuisWorkspace(siteB.id, carte).map((n) => n.code)
    const depuisGlobal = store.noeudsVisiblesDepuisWorkspace(global.id, carte).map((n) => n.code)

    expect(depuisSiteA.sort()).toEqual(['GLOBAL-1', 'SITE-A-1'])
    expect(depuisSiteB.sort()).toEqual(['GLOBAL-1', 'SITE-B-1'])
    expect(depuisGlobal).toEqual(['GLOBAL-1'])
  })

  test('un nœud legacy (workspace_id null) reste visible depuis tout workspace — non-régression', async () => {
    const { global, siteA } = await creerOrganizationEtWorkspaces('client-1')
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    await store.creerNoeud('client-1', {
      level_key: 'equipement',
      name: 'Ancien actif',
      code: 'LEGACY-1',
      parent_id: null,
    })

    const carte = arbre([global, siteA])
    expect(store.noeudsVisiblesDepuisWorkspace(siteA.id, carte).map((n) => n.code)).toEqual([
      'LEGACY-1',
    ])
  })
})

describe('useStructureSystemeStore — Architecture Technique (Phase 18, TD-013)', () => {
  test('crée une relation techniquement typée entre deux AssetNode existants', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    await store.creerNoeud('client-1', {
      level_key: 'equipement',
      name: 'Granulateur',
      code: 'GRANULATEUR-01',
      parent_id: null,
    })
    await store.creerNoeud('client-1', {
      level_key: 'plc',
      name: 'PLC granulateur',
      code: 'PLC-01',
      parent_id: null,
    })
    const equipementId = idDuNoeud(store.noeuds, 'GRANULATEUR-01')
    const plcId = idDuNoeud(store.noeuds, 'PLC-01')

    const resultat = await store.creerRelationTechnique(
      'client-1',
      'controle_par',
      equipementId,
      plcId,
    )

    expect(resultat.ok).toBe(true)
    expect(store.relationsTechniques).toHaveLength(1)
    expect(store.relationsTechniques[0]?.type_relation).toBe('controle_par')
  })

  test('refuse une relation entre deux nœuds de clients différents', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-A')
    await store.creerNoeud('client-A', {
      level_key: 'equipement',
      name: 'Equip A',
      code: 'EQ-A',
      parent_id: null,
    })
    const equipementAId = idDuNoeud(store.noeuds, 'EQ-A')

    await store.charger('client-B')
    await store.creerNoeud('client-B', {
      level_key: 'plc',
      name: 'PLC B',
      code: 'PLC-B',
      parent_id: null,
    })
    const plcBId = idDuNoeud(store.noeuds, 'PLC-B')

    const resultat = await store.creerRelationTechnique(
      'client-B',
      'controle_par',
      equipementAId,
      plcBId,
    )

    expect(resultat).toEqual({ ok: false, raison: 'clients_differents' })
    expect(store.relationsTechniques).toHaveLength(0)
  })

  test('refuse une relation vers un nœud introuvable', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    await store.creerNoeud('client-1', {
      level_key: 'equipement',
      name: 'Equip',
      code: 'EQ-1',
      parent_id: null,
    })
    const equipementId = idDuNoeud(store.noeuds, 'EQ-1')

    const resultat = await store.creerRelationTechnique(
      'client-1',
      'controle_par',
      equipementId,
      'id-inconnu',
    )

    expect(resultat).toEqual({ ok: false, raison: 'noeud_introuvable' })
  })

  test('trace la chaîne Equipment→PLC→SCADA→Server via chaineTechniqueDepuisNoeud', async () => {
    const store = useStructureSystemeStore()
    await store.charger('client-1')
    for (const [levelKey, code] of [
      ['equipement', 'GRANULATEUR-01'],
      ['plc', 'PLC-01'],
      ['scada', 'SCADA-01'],
      ['serveur', 'SERVEUR-01'],
    ] as const) {
      await store.creerNoeud('client-1', { level_key: levelKey, name: code, code, parent_id: null })
    }
    const equipementId = idDuNoeud(store.noeuds, 'GRANULATEUR-01')
    const plcId = idDuNoeud(store.noeuds, 'PLC-01')
    const scadaId = idDuNoeud(store.noeuds, 'SCADA-01')
    const serveurId = idDuNoeud(store.noeuds, 'SERVEUR-01')

    await store.creerRelationTechnique('client-1', 'controle_par', equipementId, plcId)
    await store.creerRelationTechnique('client-1', 'connecte_a', plcId, scadaId)
    await store.creerRelationTechnique('client-1', 'heberge_sur', scadaId, serveurId)

    const chaine = store.chaineTechniqueDepuisNoeud(equipementId)
    expect(chaine.map((etape) => etape.noeud.code)).toEqual(['PLC-01', 'SCADA-01', 'SERVEUR-01'])
  })
})

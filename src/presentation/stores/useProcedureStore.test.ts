import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import { db } from '../../persistance/db'
import { useProcedureStore } from './useProcedureStore'

function providerMock(texteReponse: string): ProviderAdapter {
  return {
    nomAffiche: 'Fournisseur simulé',
    estCloud: true,
    envoyerMessage: vi
      .fn<(mode: ModeUsageIA, contexte: ContexteEnvoi, question: string) => Promise<Reponse>>()
      .mockResolvedValue({ texte: texteReponse, version_moteur: 'v-test', citations: [] }),
  }
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.procedures.clear()
  await db.procedureSteps.clear()
})

describe('useProcedureStore — creerProcedure (versionnée)', () => {
  test('première création : numero_version = 1', async () => {
    const store = useProcedureStore()
    await store.charger('client-1')
    const procedure = await store.creerProcedure('client-1', {
      reference: 'SOP-QA-012',
      titre: 'Impact Assessment',
      effectiveDate: '2026-01-01',
    })
    expect(procedure.numero_version).toBe(1)
  })

  test("une nouvelle révision de la même référence incrémente numero_version, jamais ne mute l'ancienne (R-21)", async () => {
    const store = useProcedureStore()
    await store.charger('client-1')
    const v1 = await store.creerProcedure('client-1', {
      reference: 'SOP-QA-012',
      titre: 'Impact Assessment',
      effectiveDate: '2026-01-01',
    })
    const v2 = await store.creerProcedure('client-1', {
      reference: 'SOP-QA-012',
      titre: 'Impact Assessment (révisée)',
      effectiveDate: '2026-06-01',
    })

    expect(v2.numero_version).toBe(2)
    expect(store.procedures).toHaveLength(2)

    const v1Relue = await db.procedures.get(v1.id)
    expect(v1Relue?.numero_version).toBe(1)
    expect(v1Relue?.titre).toBe('Impact Assessment')
  })

  test('isolation stricte par client : même référence acceptée pour un autre client, numero_version repart à 1', async () => {
    const store = useProcedureStore()
    await store.charger('client-A')
    await store.creerProcedure('client-A', {
      reference: 'SOP-QA-012',
      titre: 'Impact Assessment',
      effectiveDate: '2026-01-01',
    })
    await store.charger('client-B')
    const procedureB = await store.creerProcedure('client-B', {
      reference: 'SOP-QA-012',
      titre: 'Impact Assessment (client B)',
      effectiveDate: '2026-01-01',
    })
    expect(procedureB.numero_version).toBe(1)
  })
})

describe('useProcedureStore — ajouterEtape', () => {
  test('les étapes sont ordonnées et retournées dans cet ordre', async () => {
    const store = useProcedureStore()
    await store.charger('client-1')
    const procedure = await store.creerProcedure('client-1', {
      reference: 'SOP-QA-012',
      titre: 'Impact Assessment',
      effectiveDate: '2026-01-01',
    })
    await store.ajouterEtape('client-1', procedure.id, {
      description: 'Vérifier le contexte',
      obligatoire: true,
    })
    await store.ajouterEtape('client-1', procedure.id, {
      description: 'Identifier les impacts',
      obligatoire: true,
      condition: "si l'équipement est GxP",
      responsable: 'Ingénieur qualité',
    })

    const etapes = store.etapesDeProcedure(procedure.id)
    expect(etapes.map((e) => e.description)).toEqual([
      'Vérifier le contexte',
      'Identifier les impacts',
    ])
    expect(etapes[1]?.condition).toBe("si l'équipement est GxP")
    expect(etapes[1]?.responsable).toBe('Ingénieur qualité')
  })

  test("rejette une étape pour une procédure introuvable ou d'un autre client", async () => {
    const store = useProcedureStore()
    await store.charger('client-1')
    const procedure = await store.creerProcedure('client-1', {
      reference: 'SOP-QA-012',
      titre: 'Impact Assessment',
      effectiveDate: '2026-01-01',
    })

    const resultatIntrouvable = await store.ajouterEtape('client-1', 'id-inconnu', {
      description: 'Étape',
      obligatoire: true,
    })
    expect(resultatIntrouvable).toEqual({ erreur: 'procedure_introuvable' })

    const resultatMauvaisClient = await store.ajouterEtape('client-2', procedure.id, {
      description: 'Étape',
      obligatoire: true,
    })
    expect(resultatMauvaisClient).toEqual({ erreur: 'procedure_introuvable' })
  })
})

describe('useProcedureStore — derniereVersion', () => {
  test('retourne toujours le numero_version le plus élevé, jamais une version arbitraire', async () => {
    const store = useProcedureStore()
    await store.charger('client-1')
    await store.creerProcedure('client-1', {
      reference: 'SOP-QA-012',
      titre: 'v1',
      effectiveDate: '2026-01-01',
    })
    await store.creerProcedure('client-1', {
      reference: 'SOP-QA-012',
      titre: 'v2',
      effectiveDate: '2026-06-01',
    })
    await store.creerProcedure('client-1', {
      reference: 'AUTRE-SOP',
      titre: 'autre',
      effectiveDate: '2026-01-01',
    })

    const derniere = store.derniereVersion('SOP-QA-012')
    expect(derniere?.titre).toBe('v2')
    expect(derniere?.numero_version).toBe(2)
  })

  test('référence inconnue retourne null', async () => {
    const store = useProcedureStore()
    await store.charger('client-1')
    expect(store.derniereVersion('INCONNUE')).toBeNull()
  })
})

describe('useProcedureStore — genererProposition/annulerProposition/confirmerProposition', () => {
  test('genererProposition stocke la proposition déterministe dans derniereProposition, sans jamais persister', async () => {
    const store = useProcedureStore()
    await store.charger('client-1')
    const texte = ['1 But', 'Décrire la procédure.', '2 Procédure', '- Étape unique.'].join('\n')

    const proposition = await store.genererProposition(texte, [], providerMock('jamais utilisé'))

    expect(store.derniereProposition).toEqual(proposition)
    expect(proposition.source).toBe('deterministe')
    expect(store.procedures).toHaveLength(0)
    expect(store.procedureSteps).toHaveLength(0)
  })

  test('annulerProposition efface la proposition en attente sans rien écrire', async () => {
    const store = useProcedureStore()
    await store.charger('client-1')
    await store.genererProposition(
      ['1 But', 'Décrire la procédure.', '2 Procédure', '- Étape unique.'].join('\n'),
      [],
      providerMock('jamais utilisé'),
    )
    expect(store.derniereProposition).not.toBeNull()

    store.annulerProposition()

    expect(store.derniereProposition).toBeNull()
    expect(store.procedures).toHaveLength(0)
  })

  test('confirmerProposition crée la Procedure puis les étapes retenues, dans l’ordre fourni par l’appelant, et efface la proposition', async () => {
    const store = useProcedureStore()
    await store.charger('client-1')

    const procedure = await store.confirmerProposition(
      'client-1',
      { reference: 'SOP-QA-020', titre: 'Structuration confirmée', effectiveDate: '2026-01-01' },
      [
        { description: 'Première étape retenue', obligatoire: true },
        { description: 'Deuxième étape retenue', obligatoire: false, responsable: 'QA' },
      ],
    )

    expect(procedure.reference).toBe('SOP-QA-020')
    expect(store.etapesDeProcedure(procedure.id).map((e) => e.description)).toEqual([
      'Première étape retenue',
      'Deuxième étape retenue',
    ])
    expect(store.derniereProposition).toBeNull()

    const procedureRelue = await db.procedures.get(procedure.id)
    expect(procedureRelue).toBeDefined()
  })
})

import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import { db } from '../../persistance/db'
import { useReasoningEngineStore } from './useReasoningEngineStore'

interface FournisseurMock extends ProviderAdapter {
  envoyerMessage: Mock<
    (mode: ModeUsageIA, contexte: ContexteEnvoi, question: string) => Promise<Reponse>
  >
}

function fournisseurMock(): FournisseurMock {
  return { nomAffiche: 'Test', estCloud: true, envoyerMessage: vi.fn() }
}

function reponse(texte: string): Reponse {
  return { texte, version_moteur: 'v1', citations: [] }
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.aiConfigurations.clear()
  await db.aiRequests.clear()
  await db.aiResponses.clear()
  await db.citationsAIResponse.clear()
  await db.requirements.clear()
  await db.couvertures.clear()
  await db.tests.clear()
})

describe('useReasoningEngineStore — assurerConfiguration (versionnée, condition E4)', () => {
  test('crée la configuration une seule fois, idempotent', async () => {
    const store = useReasoningEngineStore()
    await store.charger('client-1')
    const a = await store.assurerConfiguration('client-1')
    const b = await store.assurerConfiguration('client-1')
    expect(a.id).toBe(b.id)
    expect(store.configurations).toHaveLength(1)
    expect(a.outils_disponibles.length).toBeGreaterThan(0)
  })
})

describe('useReasoningEngineStore — scénario réel : changement de recette (spec §5)', () => {
  test('exécute le raisonnement, persiste AIRequest/AIResponse/CitationAIResponse', async () => {
    await db.requirements.put({
      id: 'req-1',
      client_id: 'client-1',
      reference: 'REQ-1',
      titre: 'Débit stable',
      description: '',
      asset_node_id: 'granulateur-01',
      process_id: null,
      audit_log: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })

    const store = useReasoningEngineStore()
    await store.charger('client-1')

    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage
      .mockResolvedValueOnce(
        reponse(
          'APPEL_OUTIL: {"nom": "lister_requirements_pour_actif", "parametres": {"asset_node_id": "granulateur-01"}}',
        ),
      )
      .mockResolvedValueOnce(
        reponse(
          'REPONSE_FINALE: {"texte": "REQ-1 est impacté", "etat_confiance": "connu", "citations": ["req-1"]}',
        ),
      )

    const { request, response } = await store.executerRaisonnement('client-1', {
      objectif: "Évaluer l'impact d'un changement de recette",
      missionId: null,
      contextSnapshotId: null,
      fournisseur,
      mode: 'chat_normatif',
    })

    expect(request.objectif).toContain('changement de recette')
    expect(response.etat_confiance).toBe('connu')
    expect(response.trace_appels_outils).toHaveLength(1)
    expect(store.citationsDeReponse(response.id)).toHaveLength(1)
    expect(store.citationsDeReponse(response.id)[0]?.type_objet_cite).toBe('requirement')
  })

  test("une citation non résolvable n'est pas persistée avec un type deviné", async () => {
    const store = useReasoningEngineStore()
    await store.charger('client-1')

    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(
      reponse(
        'REPONSE_FINALE: {"texte": "Réponse", "etat_confiance": "connu", "citations": ["id-jamais-vu"]}',
      ),
    )

    const { response } = await store.executerRaisonnement('client-1', {
      objectif: 'Objectif',
      missionId: null,
      contextSnapshotId: null,
      fournisseur,
      mode: 'chat_normatif',
    })

    // La vérification déterministe de la boucle a déjà rétrogradé la confiance.
    expect(response.etat_confiance).toBe('a_verifier')
    expect(store.citationsDeReponse(response.id)).toHaveLength(0)
  })
})

describe('useReasoningEngineStore — garde-fous non négociables', () => {
  test("aucune fonction n'écrit AIResponse dans Requirement/Test/KnowledgeItem (spec §3)", () => {
    const store = useReasoningEngineStore()
    expect('appliquerReponseDansRequirement' in store).toBe(false)
    expect('appliquerReponseDansTest' in store).toBe(false)
    expect('appliquerReponseDansKnowledgeItem' in store).toBe(false)
    expect('mettreAJourRequirementDepuisIA' in store).toBe(false)
  })

  test("aucune fonction de mise à jour n'existe pour AIRequest/AIResponse (immutabilité)", () => {
    const store = useReasoningEngineStore()
    expect('mettreAJourRequest' in store).toBe(false)
    expect('mettreAJourResponse' in store).toBe(false)
    expect('modifierEtatConfiance' in store).toBe(false)
  })

  test('isolation stricte par client', async () => {
    const store = useReasoningEngineStore()
    await store.charger('client-A')
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(
      reponse('REPONSE_FINALE: {"texte": "x", "etat_confiance": "inconnu", "citations": []}'),
    )
    await store.executerRaisonnement('client-A', {
      objectif: 'Objectif',
      missionId: null,
      contextSnapshotId: null,
      fournisseur,
      mode: 'chat_normatif',
    })
    await store.charger('client-B')
    expect(store.requests).toHaveLength(0)
    expect(store.responses).toHaveLength(0)
  })
})

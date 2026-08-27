import { describe, expect, test, vi, type Mock } from 'vitest'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import type { Couverture, Requirement, Test as TestEntity } from '../domaine/types'
import { executerBoucleRaisonnement } from './boucleRaisonnement'
import type { DonneesOutilsRaisonnement } from './outilsRaisonnement'

interface FournisseurMock extends ProviderAdapter {
  envoyerMessage: Mock<
    (mode: ModeUsageIA, contexte: ContexteEnvoi, question: string) => Promise<Reponse>
  >
}

function fournisseurMock(): FournisseurMock {
  return { nomAffiche: 'Test', estCloud: true, envoyerMessage: vi.fn() }
}

function reponse(texte: string, versionMoteur: string | null = 'v1'): Reponse {
  return { texte, version_moteur: versionMoteur, citations: [] }
}

const donneesVides: DonneesOutilsRaisonnement = {
  requirements: [],
  couvertures: [],
  tests: [],
  executions: [],
  evidences: [],
  knowledgeItems: [],
  assetNodes: [],
  relationsTechniques: [],
}

const donneesScenario: DonneesOutilsRaisonnement = {
  requirements: [
    {
      id: 'req-1',
      client_id: 'client-1',
      reference: 'REQ-1',
      titre: 'Débit de granulation stable',
      description: '',
      asset_node_id: 'granulateur-01',
      process_id: null,
      audit_log: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    } satisfies Requirement,
  ],
  couvertures: [
    {
      id: 'cov-1',
      client_id: 'client-1',
      requirement_id: 'req-1',
      test_id: 'test-1',
      created_at: '2026-01-01T00:00:00.000Z',
    } satisfies Couverture,
  ],
  tests: [
    {
      id: 'test-1',
      client_id: 'client-1',
      test_candidate_id: 'tc-1',
      titre: 'Vérification débit',
      description: '',
      etapes: [],
      statut: 'approuve',
      audit_log: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    } satisfies TestEntity,
  ],
  executions: [],
  evidences: [],
  knowledgeItems: [],
  assetNodes: [],
  relationsTechniques: [],
}

describe('executerBoucleRaisonnement — réponse finale directe', () => {
  test("un premier tour bien formé sans appel d'outil retourne la réponse finale", async () => {
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(
      reponse(
        'REPONSE_FINALE: {"texte": "Sans information suffisante", "etat_confiance": "inconnu", "citations": []}',
      ),
    )

    const resultat = await executerBoucleRaisonnement({
      objectif: 'Évaluer un impact',
      fournisseur,
      mode: 'chat_normatif',
      donnees: donneesVides,
    })

    expect(resultat.reponse.etatConfiance).toBe('inconnu')
    expect(resultat.iterationsUtilisees).toBe(1)
    expect(resultat.trace).toHaveLength(0)
    expect(resultat.arretPourLimite).toBe(false)
  })
})

describe('executerBoucleRaisonnement — scénario réel : changement de recette (spec §5)', () => {
  test('appelle les outils, journalise la trace, cite les objets réellement obtenus', async () => {
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage
      .mockResolvedValueOnce(
        reponse(
          'APPEL_OUTIL: {"nom": "lister_requirements_pour_actif", "parametres": {"asset_node_id": "granulateur-01"}}',
        ),
      )
      .mockResolvedValueOnce(
        reponse(
          'APPEL_OUTIL: {"nom": "lister_tests_pour_requirement", "parametres": {"requirement_id": "req-1"}}',
        ),
      )
      .mockResolvedValueOnce(
        reponse(
          'REPONSE_FINALE: {"texte": "Le Requirement REQ-1 est impacté, couvert par le Test test-1", "etat_confiance": "connu", "citations": ["req-1", "test-1"]}',
        ),
      )

    const resultat = await executerBoucleRaisonnement({
      objectif: "Évaluer l'impact d'un changement de recette sur granulateur-01",
      fournisseur,
      mode: 'chat_normatif',
      donnees: donneesScenario,
    })

    expect(resultat.trace).toHaveLength(2)
    expect(resultat.trace[0]?.outil).toBe('lister_requirements_pour_actif')
    expect(resultat.trace[0]?.resultat).toContain('req-1')
    expect(resultat.trace[1]?.outil).toBe('lister_tests_pour_requirement')
    expect(resultat.reponse.etatConfiance).toBe('connu')
    expect(resultat.reponse.citations).toEqual(['req-1', 'test-1'])
    expect(resultat.iterationsUtilisees).toBe(3)
  })
})

describe('executerBoucleRaisonnement — vérification de citation déterministe (spec §4, non négociable)', () => {
  test('rétrograde "connu" à "a_verifier" si une citation ne correspond à aucun id réellement obtenu', async () => {
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(
      reponse(
        'REPONSE_FINALE: {"texte": "Réponse", "etat_confiance": "connu", "citations": ["req-jamais-vu"]}',
      ),
    )

    const resultat = await executerBoucleRaisonnement({
      objectif: 'Objectif',
      fournisseur,
      mode: 'chat_normatif',
      donnees: donneesVides,
    })

    expect(resultat.reponse.etatConfiance).toBe('a_verifier')
  })

  test('rétrograde "connu" à "a_verifier" si aucune citation n\'est fournie', async () => {
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(
      reponse('REPONSE_FINALE: {"texte": "Réponse", "etat_confiance": "connu", "citations": []}'),
    )

    const resultat = await executerBoucleRaisonnement({
      objectif: 'Objectif',
      fournisseur,
      mode: 'chat_normatif',
      donnees: donneesVides,
    })

    expect(resultat.reponse.etatConfiance).toBe('a_verifier')
  })

  test('conserve "connu" si toutes les citations correspondent à des ids réellement obtenus', async () => {
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage
      .mockResolvedValueOnce(
        reponse(
          'APPEL_OUTIL: {"nom": "lister_requirements_pour_actif", "parametres": {"asset_node_id": "granulateur-01"}}',
        ),
      )
      .mockResolvedValueOnce(
        reponse(
          'REPONSE_FINALE: {"texte": "Réponse", "etat_confiance": "connu", "citations": ["req-1"]}',
        ),
      )

    const resultat = await executerBoucleRaisonnement({
      objectif: 'Objectif',
      fournisseur,
      mode: 'chat_normatif',
      donnees: donneesScenario,
    })

    expect(resultat.reponse.etatConfiance).toBe('connu')
  })

  test('ne rétrograde jamais un état autre que "connu" (infere/inconnu/conflit/a_verifier passent tels quels)', async () => {
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(
      reponse('REPONSE_FINALE: {"texte": "Réponse", "etat_confiance": "conflit", "citations": []}'),
    )

    const resultat = await executerBoucleRaisonnement({
      objectif: 'Objectif',
      fournisseur,
      mode: 'chat_normatif',
      donnees: donneesVides,
    })

    expect(resultat.reponse.etatConfiance).toBe('conflit')
  })
})

describe('executerBoucleRaisonnement — dégradation gracieuse (TD-007 A3)', () => {
  test('un modèle qui ignore totalement le protocole ne crashe jamais : texte brut, a_verifier', async () => {
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(reponse("Je pense que l'impact est limité."))

    const resultat = await executerBoucleRaisonnement({
      objectif: 'Objectif',
      fournisseur,
      mode: 'chat_normatif',
      donnees: donneesVides,
    })

    expect(resultat.reponse.texte).toBe("Je pense que l'impact est limité.")
    expect(resultat.reponse.etatConfiance).toBe('a_verifier')
    expect(resultat.reponse.citations).toEqual([])
  })
})

describe("executerBoucleRaisonnement — plafond d'itérations (jamais une boucle sans limite)", () => {
  test('un modèle qui appelle des outils indéfiniment est arrêté au plafond, jamais silencieusement', async () => {
    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockImplementation(async () =>
      reponse('APPEL_OUTIL: {"nom": "lister_knowledge_items_valides", "parametres": {}}'),
    )

    const resultat = await executerBoucleRaisonnement({
      objectif: 'Objectif',
      fournisseur,
      mode: 'chat_normatif',
      donnees: donneesVides,
      maxIterations: 3,
    })

    expect(resultat.arretPourLimite).toBe(true)
    expect(resultat.iterationsUtilisees).toBe(3)
    expect(resultat.trace).toHaveLength(3)
    expect(fournisseur.envoyerMessage).toHaveBeenCalledTimes(3)
  })
})

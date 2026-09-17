import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useReasoningEngineStore } from './useReasoningEngineStore'

/** Structure Système migrée vers le Worker/D1 (Phase 1) — installe le faux Worker et crée un client réel pour que `structureStore.charger` (appelé par `executerRaisonnement`) puisse réellement lire les nœuds seedés. */
async function installerAuthEtClient(
  clientId: string,
): Promise<{ ctx: Contexte; demonter: () => void }> {
  await reinitialiserAuthDeTest()
  const installation = installerFauxWorkerAuth()
  await connecterAdminDeTest()
  await installation.ctx.clientsRepo.creer({
    id: clientId,
    name: clientId,
    adresse: null,
    secteur: null,
    details: null,
    statut: 'actif',
    archivedAt: null,
    archivedBy: null,
    createdByUserId: 'admin-test',
    sharedWith: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return installation
}

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
  await db.procedures.clear()
  await db.procedureSteps.clear()
  await db.contextSnapshotItems.clear()
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
    const { ctx, demonter } = await installerAuthEtClient('client-1')
    try {
      await ctx.testDefinitionRepo.creerRequirement({
        id: 'req-1',
        clientId: 'client-1',
        reference: 'REQ-1',
        titre: 'Débit stable',
        description: '',
        assetNodeId: 'granulateur-01',
        processId: null,
        auditLog: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
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
    } finally {
      demonter()
    }
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

describe('useReasoningEngineStore — scénario réel : traversée Architecture Technique', () => {
  let demonter: () => void

  afterEach(() => {
    demonter()
  })

  test('exécute tracer_chaine_technique et résout une citation de type asset_node', async () => {
    const { ctx, demonter: d } = await installerAuthEtClient('client-1')
    demonter = d
    const maintenant = '2026-01-01T00:00:00.000Z'
    function noeud(id: string) {
      return {
        id,
        clientId: 'client-1',
        workspaceId: null,
        levelKey: 'equipement',
        name: id,
        code: id,
        parentId: null,
        associatedNodes: [],
        source: 'manuel' as const,
        qmsConnectorId: null,
        periodicQualification: { applicable: false, deadline: null },
        qualificationStatus: 'non_qualifie',
        auditLog: [],
        createdAt: maintenant,
        updatedAt: maintenant,
      }
    }
    await ctx.structureSystemeRepo.creerNoeuds([noeud('granulateur-01'), noeud('plc-01')])
    await ctx.structureSystemeRepo.creerRelationTechnique({
      id: 'rel-1',
      clientId: 'client-1',
      typeRelation: 'controle_par',
      noeudSourceId: 'granulateur-01',
      noeudCibleId: 'plc-01',
      createdAt: maintenant,
    })

    const store = useReasoningEngineStore()
    await store.charger('client-1')

    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage
      .mockResolvedValueOnce(
        reponse(
          'APPEL_OUTIL: {"nom": "tracer_chaine_technique", "parametres": {"asset_node_id": "granulateur-01"}}',
        ),
      )
      .mockResolvedValueOnce(
        reponse(
          'REPONSE_FINALE: {"texte": "Le granulateur est contrôlé par PLC-01", "etat_confiance": "connu", "citations": ["plc-01"]}',
        ),
      )

    const { response } = await store.executerRaisonnement('client-1', {
      objectif: 'Quel PLC contrôle le granulateur ?',
      missionId: null,
      contextSnapshotId: null,
      fournisseur,
      mode: 'chat_normatif',
    })

    expect(response.etat_confiance).toBe('connu')
    expect(response.trace_appels_outils[0]?.outil).toBe('tracer_chaine_technique')
    expect(store.citationsDeReponse(response.id)[0]?.type_objet_cite).toBe('asset_node')
  })
})

describe('useReasoningEngineStore — scénario réel : lecture de procédure', () => {
  test('exécute lister_etapes_procedure et résout une citation de type procedure_step', async () => {
    const maintenant = '2026-01-01T00:00:00.000Z'
    await db.procedures.put({
      id: 'proc-1',
      client_id: 'client-1',
      reference: 'SOP-QA-012',
      numero_version: 1,
      titre: 'Impact Assessment',
      effective_date: '2026-01-01',
      categorie: 'production',
      source_id: null,
      created_at: maintenant,
    })
    await db.procedureSteps.put({
      id: 'step-1',
      client_id: 'client-1',
      procedure_id: 'proc-1',
      ordre: 1,
      description: 'Vérifier le contexte',
      obligatoire: true,
      condition: null,
      responsable: null,
      created_at: maintenant,
    })

    const store = useReasoningEngineStore()
    await store.charger('client-1')

    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage
      .mockResolvedValueOnce(
        reponse(
          'APPEL_OUTIL: {"nom": "lister_etapes_procedure", "parametres": {"reference": "SOP-QA-012"}}',
        ),
      )
      .mockResolvedValueOnce(
        reponse(
          'REPONSE_FINALE: {"texte": "La première étape est de vérifier le contexte", "etat_confiance": "connu", "citations": ["step-1"]}',
        ),
      )

    const { response } = await store.executerRaisonnement('client-1', {
      objectif: 'Applique la SOP-QA-012 à ce changement',
      missionId: null,
      contextSnapshotId: null,
      fournisseur,
      mode: 'chat_normatif',
    })

    expect(response.etat_confiance).toBe('connu')
    expect(response.trace_appels_outils[0]?.outil).toBe('lister_etapes_procedure')
    expect(store.citationsDeReponse(response.id)[0]?.type_objet_cite).toBe('procedure_step')
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

describe('useReasoningEngineStore — narratif de contexte assemblé', () => {
  let demonter: (() => void) | undefined

  afterEach(() => {
    demonter?.()
    demonter = undefined
  })

  test('un contextSnapshotId résout le narratif et le rend citable comme "connu" sans appel d’outil', async () => {
    const { ctx, demonter: d } = await installerAuthEtClient('client-1')
    demonter = d
    await ctx.structureSystemeRepo.creerNoeud({
      id: 'n1',
      clientId: 'client-1',
      workspaceId: null,
      levelKey: 'systeme',
      name: 'Ligne A12',
      code: 'SYS-A12',
      parentId: null,
      associatedNodes: [],
      source: 'manuel',
      qmsConnectorId: null,
      periodicQualification: { applicable: false, deadline: null },
      qualificationStatus: 'qualifie',
      auditLog: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.contextSnapshotItems.put({
      id: 'item-1',
      client_id: 'client-1',
      context_snapshot_id: 'snap-1',
      type_objet: 'asset_node',
      objet_id: 'n1',
    })

    const store = useReasoningEngineStore()
    await store.charger('client-1')

    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(
      reponse(
        'REPONSE_FINALE: {"texte": "Le site est qualifié", "etat_confiance": "connu", "citations": ["n1"]}',
      ),
    )

    const { response } = await store.executerRaisonnement('client-1', {
      objectif: 'Le site est-il qualifié ?',
      missionId: null,
      contextSnapshotId: 'snap-1',
      fournisseur,
      mode: 'chat_normatif',
    })

    expect(response.etat_confiance).toBe('connu')
    const promptEnvoye = fournisseur.envoyerMessage.mock.calls[0]?.[2]
    expect(promptEnvoye).toContain('Ligne A12')
  })

  test('contextSnapshotId absent (null) : aucun narratif, comportement inchangé', async () => {
    const store = useReasoningEngineStore()
    await store.charger('client-1')

    const fournisseur = fournisseurMock()
    fournisseur.envoyerMessage.mockResolvedValueOnce(
      reponse('REPONSE_FINALE: {"texte": "ok", "etat_confiance": "inconnu", "citations": []}'),
    )

    await store.executerRaisonnement('client-1', {
      objectif: 'Objectif',
      missionId: null,
      contextSnapshotId: null,
      fournisseur,
      mode: 'chat_normatif',
    })

    const promptEnvoye = fournisseur.envoyerMessage.mock.calls[0]?.[2]
    expect(promptEnvoye).not.toContain('Contexte assemblé')
  })
})

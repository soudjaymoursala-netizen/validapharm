import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnexionRelaisIAStore } from './useConnexionRelaisIAStore'
import { usePanneauChatStore } from './usePanneauChatStore'

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
  } as Response
}

// Le Relais IA est désormais un paramètre d'installation stocké côté
// Worker/D1 (voir `useConnexionRelaisIAStore`) — `fetchMock` ci-dessous ne
// sert donc plus qu'aux appels réels du relais IA lui-même
// (`RelayProviderAdapter`), jamais à l'authentification/la configuration
// (interceptées par `installerFauxWorkerAuth`, qui délègue tout le reste à
// `fetchMock`).
let ctx: Contexte
let fetchMock: ReturnType<typeof vi.fn>
let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()

  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const installation = installerFauxWorkerAuth()
  ctx = installation.ctx
  demonter = installation.demonter
  await connecterAdminDeTest()
  await ctx.clientsRepo.creer({
    id: 'client-1',
    name: 'Client de test',
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

  const resultat = await useConnexionRelaisIAStore().enregistrer({
    relayUrl: 'https://relais.workers.dev',
    jeton: 'jeton-x',
  })
  if (!resultat.ok) throw new Error(`préparation du Relais IA échouée : ${resultat.erreur}`)
})

afterEach(() => {
  demonter()
})

describe('usePanneauChatStore — demarrerSession', () => {
  test('charge la config client et le relais, réinitialise les messages', async () => {
    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    expect(store.fournisseurActuel).toBe('openai')
    expect(store.messages).toEqual([])
  })
})

describe('usePanneauChatStore — envoyerQuestion (fournisseur cloud)', () => {
  test('appel nominal : message ajouté, pas de bascule', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({ texte: 'Réponse', version_moteur: 'claude-v1', citations: ['ICH Q9'] }),
    )
    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    await store.envoyerQuestion('Question ?', 'chat_normatif', { contenu_joint: false }, null)

    expect(store.messages).toHaveLength(1)
    expect(store.messages[0]).toMatchObject({
      question: 'Question ?',
      fournisseurUtilise: 'Assistant IA',
      bascule: false,
      documentJoint: false,
    })
    expect(store.erreur).toBeNull()
  })

  test('indisponibilité cloud -> bascule automatique vers le modèle local', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fetchMock.mockResolvedValueOnce(reponseMock({ response: 'Réponse locale' }))

    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    await store.envoyerQuestion('Question ?', 'chat_normatif', { contenu_joint: false }, null)

    expect(store.messages[0]?.bascule).toBe(true)
    expect(store.messages[0]?.fournisseurUtilise).toBe('Modèle local (Ollama)')
    expect(store.erreur).toBeNull()
  })

  test('quota dépassé -> erreur affichée, jamais de bascule silencieuse', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 429 }))
    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    await store.envoyerQuestion('Question ?', 'chat_normatif', { contenu_joint: false }, null)

    expect(store.messages).toHaveLength(0)
    expect(store.erreur).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('mode audit_simule avec questionAffichee distincte -> le message affiché conserve la question brute, jamais le prompt engineered envoyé', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ texte: 'Réponse audit', citations: [] }))
    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    await store.envoyerQuestion(
      'MODE AUDIT SIMULÉ — [prompt engineered long]\nQUESTION :\nLa section est-elle prête ?',
      'audit_simule',
      { contenu_joint: false },
      null,
      'La section est-elle prête ?',
    )

    expect(store.messages[0]?.question).toBe('La section est-elle prête ?')
    expect(store.messages[0]?.mode).toBe('audit_simule')
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(options.body as string).question).toContain('MODE AUDIT SIMULÉ')
  })

  test('document joint -> contenu transmis et titre conservé pour affichage', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ texte: 'x', citations: [] }))
    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    await store.envoyerQuestion(
      'Question ?',
      'chat_normatif',
      { contenu_joint: true, contenu: 'Corps', titre_document: 'IQ-001' },
      'IQ-001',
    )

    expect(store.messages[0]?.documentJoint).toBe(true)
    expect(store.messages[0]?.titreDocumentJoint).toBe('IQ-001')
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(options.body as string)).toMatchObject({
      contenu_joint: true,
      contenu: 'Corps',
    })
  })
})

describe('usePanneauChatStore — fermerSession', () => {
  test('journalise horodatage, fournisseur, moteur, document joint — jamais le contenu échangé', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({ texte: 'x', version_moteur: 'claude-v2', citations: [] }),
    )
    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    await store.envoyerQuestion(
      'Question sensible ?',
      'chat_normatif',
      { contenu_joint: true, contenu: 'Corps confidentiel', titre_document: 'IQ-001' },
      'IQ-001',
    )
    await store.fermerSession('chat_normatif')

    const entrees = await ctx.aiChatSessionLogRepo.listerParClient('client-1')
    expect(entrees).toHaveLength(1)
    expect(entrees[0]).toMatchObject({
      clientId: 'client-1',
      mode: 'chat_normatif',
      aiProvider: 'openai',
      moteurVersion: 'claude-v2',
      documentJoint: true,
    })
    expect(entrees[0]?.startedAt).toBeTruthy()
    expect(entrees[0]?.endedAt).toBeTruthy()
    expect(JSON.stringify(entrees[0])).not.toContain('Question sensible')
    expect(JSON.stringify(entrees[0])).not.toContain('confidentiel')
  })
})

describe('usePanneauChatStore — alerteDerive (séparée par mode)', () => {
  test('aucune session antérieure connue -> pas de fausse alerte', async () => {
    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    expect(store.alerteDerive('chat_normatif')).toBe(false)
  })

  test('version antérieure journalisée diffère de la qualification du mode chat_normatif -> alerte', async () => {
    await ctx.clientConfigRepo.enregistrer({
      clientId: 'client-1',
      aiProvider: 'claude',
      aiProviderConditionsAcquittees: null,
      aiProviderReliabilityQualification: {
        chat_normatif: {
          date: '2026-01-01',
          resultat: 'favorable',
          qualificationTestSetId: 'set-1',
          qualificationTestSetVersion: '1.0.0',
          moteurVersionQualifiee: 'claude-v1',
        },
        audit_simule: null,
      },
      exportTemplateId: null,
      consentTelemetry: { granted: false, date: null, revocableAtAnyTime: true },
    })
    await ctx.aiChatSessionLogRepo.creer({
      id: 'session-anterieure',
      clientId: 'client-1',
      startedAt: '2026-02-01T00:00:00.000Z',
      endedAt: '2026-02-01T00:05:00.000Z',
      mode: 'chat_normatif',
      aiProvider: 'claude',
      moteurVersion: 'claude-v2',
      documentJoint: false,
    })

    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    expect(store.alerteDerive('chat_normatif')).toBe(true)
  })

  test('qualification chat_normatif renseignée mais mode audit_simule non qualifié -> aucune alerte de dérive côté audit_simule (rien à comparer)', async () => {
    await ctx.clientConfigRepo.enregistrer({
      clientId: 'client-1',
      aiProvider: 'claude',
      aiProviderConditionsAcquittees: null,
      aiProviderReliabilityQualification: {
        chat_normatif: {
          date: '2026-01-01',
          resultat: 'favorable',
          qualificationTestSetId: 'set-1',
          qualificationTestSetVersion: '1.0.0',
          moteurVersionQualifiee: 'claude-v1',
        },
        audit_simule: null,
      },
      exportTemplateId: null,
      consentTelemetry: { granted: false, date: null, revocableAtAnyTime: true },
    })
    await ctx.aiChatSessionLogRepo.creer({
      id: 'session-anterieure',
      clientId: 'client-1',
      startedAt: '2026-02-01T00:00:00.000Z',
      endedAt: '2026-02-01T00:05:00.000Z',
      mode: 'audit_simule',
      aiProvider: 'claude',
      moteurVersion: 'claude-v2',
      documentJoint: false,
    })

    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    expect(store.alerteDerive('audit_simule')).toBe(false)
  })
})

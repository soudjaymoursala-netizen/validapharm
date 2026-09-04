import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../../persistance/db'
import { usePanneauChatStore } from './usePanneauChatStore'

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
  } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.clientConfigs.clear()
  await db.connexionRelaisIA.clear()
  await db.aiChatSessionLogs.clear()
  await db.connexionRelaisIA.put({
    id: 'unique',
    relayUrl: 'https://relais.workers.dev',
    jeton: 'jeton-x',
  })
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePanneauChatStore — demarrerSession', () => {
  test('charge la config client et le relais, réinitialise les messages', async () => {
    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    expect(store.fournisseurActuel).toBe('claude')
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
      fournisseurUtilise: 'Claude',
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

  test('quota dépassé -> erreur affichée, jamais de bascule silencieuse (SDS §6)', async () => {
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

    const entrees = await db.aiChatSessionLogs.where('client_id').equals('client-1').toArray()
    expect(entrees).toHaveLength(1)
    expect(entrees[0]).toMatchObject({
      client_id: 'client-1',
      mode: 'chat_normatif',
      ai_provider: 'claude',
      moteur_version: 'claude-v2',
      document_joint: true,
    })
    expect(entrees[0]?.started_at).toBeTruthy()
    expect(entrees[0]?.ended_at).toBeTruthy()
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
    await db.clientConfigs.put({
      client_id: 'client-1',
      ai_provider: 'claude',
      ai_provider_conditions_acquittees: null,
      ai_provider_reliability_qualification: {
        chat_normatif: {
          date: '2026-01-01',
          resultat: 'favorable',
          qualification_test_set_id: 'set-1',
          qualification_test_set_version: '1.0.0',
          moteur_version_qualifiee: 'claude-v1',
        },
        audit_simule: null,
      },
      export_template_id: null,
      consent_telemetry: { granted: false, date: null, revocable_at_any_time: true },
    })
    await db.aiChatSessionLogs.add({
      id: 'session-anterieure',
      client_id: 'client-1',
      started_at: '2026-02-01T00:00:00.000Z',
      ended_at: '2026-02-01T00:05:00.000Z',
      mode: 'chat_normatif',
      ai_provider: 'claude',
      moteur_version: 'claude-v2',
      document_joint: false,
    })

    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    expect(store.alerteDerive('chat_normatif')).toBe(true)
  })

  test('qualification chat_normatif renseignée mais mode audit_simule non qualifié -> aucune alerte de dérive côté audit_simule (rien à comparer)', async () => {
    await db.clientConfigs.put({
      client_id: 'client-1',
      ai_provider: 'claude',
      ai_provider_conditions_acquittees: null,
      ai_provider_reliability_qualification: {
        chat_normatif: {
          date: '2026-01-01',
          resultat: 'favorable',
          qualification_test_set_id: 'set-1',
          qualification_test_set_version: '1.0.0',
          moteur_version_qualifiee: 'claude-v1',
        },
        audit_simule: null,
      },
      export_template_id: null,
      consent_telemetry: { granted: false, date: null, revocable_at_any_time: true },
    })
    await db.aiChatSessionLogs.add({
      id: 'session-anterieure',
      client_id: 'client-1',
      started_at: '2026-02-01T00:00:00.000Z',
      ended_at: '2026-02-01T00:05:00.000Z',
      mode: 'audit_simule',
      ai_provider: 'claude',
      moteur_version: 'claude-v2',
      document_joint: false,
    })

    const store = usePanneauChatStore()
    await store.demarrerSession('client-1')
    expect(store.alerteDerive('audit_simule')).toBe(false)
  })
})

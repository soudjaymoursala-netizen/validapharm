import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  IndisponibleError,
  QuotaExceededError,
  ReponseInvalideError,
  TimeoutError,
} from './erreurs'
import { RelayProviderAdapter } from './RelayProviderAdapter'

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
  } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function adaptateur(): RelayProviderAdapter {
  return new RelayProviderAdapter({ relayUrl: 'https://relais.workers.dev', nomAffiche: 'Claude' })
}

describe('RelayProviderAdapter', () => {
  test('nomAffiche et estCloud exposés tels que configurés', () => {
    const a = adaptateur()
    expect(a.nomAffiche).toBe('Claude')
    expect(a.estCloud).toBe(true)
  })

  test('appel nominal : transmet mode/question/contenu_joint, extrait la réponse', async () => {
    fetchMock.mockResolvedValueOnce(
      reponseMock({ texte: 'Réponse experte', version_moteur: 'claude-v1', citations: ['ICH Q9'] }),
    )
    const resultat = await adaptateur().envoyerMessage(
      'chat_normatif',
      { contenu_joint: false },
      'Question ?',
    )
    expect(resultat).toEqual({
      texte: 'Réponse experte',
      version_moteur: 'claude-v1',
      citations: ['ICH Q9'],
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://relais.workers.dev')
    expect(JSON.parse(options.body as string)).toEqual({
      mode: 'chat_normatif',
      question: 'Question ?',
      contenu_joint: false,
    })
  })

  test('contenu_joint: true transmet le contenu (jamais sans l’indicateur explicite)', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ texte: 'x', citations: [] }))
    await adaptateur().envoyerMessage(
      'chat_normatif',
      { contenu_joint: true, contenu: 'Corps de la section', titre_document: 'Titre' },
      'Question ?',
    )
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    const corps = JSON.parse(options.body as string) as { contenu_joint: boolean; contenu: string }
    expect(corps.contenu_joint).toBe(true)
    expect(corps.contenu).toBe('Corps de la section')
  })

  test('version_moteur/citations absents de la réponse -> valeurs par défaut sûres', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ texte: 'x' }))
    const resultat = await adaptateur().envoyerMessage(
      'chat_normatif',
      { contenu_joint: false },
      'Q',
    )
    expect(resultat).toEqual({ texte: 'x', version_moteur: null, citations: [] })
  })

  test('429 -> QuotaExceededError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 429 }))
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(QuotaExceededError)
  })

  test('5xx -> IndisponibleError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 503 }))
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(IndisponibleError)
  })

  test('statut non prévu -> ReponseInvalideError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 400 }))
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(ReponseInvalideError)
  })

  test('corps de réponse sans champ "texte" -> ReponseInvalideError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ autre_chose: 1 }))
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(ReponseInvalideError)
  })

  test('JSON illisible -> ReponseInvalideError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('invalide')
      },
    } as unknown as Response)
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(ReponseInvalideError)
  })

  test('abandon réseau (timeout) -> TimeoutError', async () => {
    const erreurAbort = new Error('aborted')
    erreurAbort.name = 'AbortError'
    fetchMock.mockRejectedValueOnce(erreurAbort)
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  test('échec réseau générique -> IndisponibleError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(
      adaptateur().envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(IndisponibleError)
  })

  test('relayUrl vide -> ReponseInvalideError explicite, jamais un fetch vers la page courante', async () => {
    const a = new RelayProviderAdapter({ relayUrl: '', nomAffiche: 'Claude' })
    const erreur = await a
      .envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q')
      .catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(ReponseInvalideError)
    expect((erreur as Error).message).toContain('Relais IA non configuré')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('relayUrl composé uniquement d’espaces -> même garde que vide', async () => {
    const a = new RelayProviderAdapter({ relayUrl: '   ', nomAffiche: 'Claude' })
    await expect(
      a.envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q'),
    ).rejects.toBeInstanceOf(ReponseInvalideError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('RelayProviderAdapter — tester (vérification de connexion)', () => {
  test('200 -> résout sans erreur, en GET, jamais un envoi de message', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({ ok: true }))
    await expect(adaptateur().tester()).resolves.toBeUndefined()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://relais.workers.dev')
    expect(options.method).toBe('GET')
    expect(options.body).toBeUndefined()
  })

  test('401 -> ReponseInvalideError explicite (jeton invalide)', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 401 }))
    const erreur = await adaptateur()
      .tester()
      .catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(ReponseInvalideError)
    expect((erreur as Error).message).toContain('Jeton invalide')
  })

  test('5xx -> IndisponibleError', async () => {
    fetchMock.mockResolvedValueOnce(reponseMock({}, { status: 503 }))
    await expect(adaptateur().tester()).rejects.toBeInstanceOf(IndisponibleError)
  })

  test('abandon réseau (timeout) -> TimeoutError', async () => {
    const erreurAbort = new Error('aborted')
    erreurAbort.name = 'AbortError'
    fetchMock.mockRejectedValueOnce(erreurAbort)
    await expect(adaptateur().tester()).rejects.toBeInstanceOf(TimeoutError)
  })

  test('relayUrl vide -> ReponseInvalideError explicite, jamais un fetch', async () => {
    const a = new RelayProviderAdapter({ relayUrl: '', nomAffiche: 'Claude' })
    const erreur = await a.tester().catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(ReponseInvalideError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { traiterRequeteRelaisIA, type ConfigRelayHandler } from './relayHandler'
import { ErreurFournisseurIA } from './fournisseurs/FournisseurIA'
import type { FournisseurIA } from './fournisseurs/FournisseurIA'

const ORIGINE_AUTORISEE = 'https://exemple.github.io'
const JETON = 'jeton-de-test'

function config(): ConfigRelayHandler {
  return {
    corsOrigin: ORIGINE_AUTORISEE,
    jetonAcces: JETON,
    modeleParMode: { chat_normatif: 'claude-sonnet-5', audit_simule: 'claude-opus-5' },
  }
}

function fournisseurMock(
  resultat: Awaited<ReturnType<FournisseurIA['envoyerMessage']>> | Error,
): FournisseurIA {
  return {
    envoyerMessage: vi.fn(async () => {
      if (resultat instanceof Error) throw resultat
      return resultat
    }),
  }
}

function requete(corps?: unknown, options: { sansJeton?: boolean } = {}): Request {
  return new Request('https://relais.workers.dev', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.sansJeton ? {} : { Authorization: `Bearer ${JETON}` }),
    },
    ...(corps !== undefined ? { body: JSON.stringify(corps) } : {}),
  })
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('traiterRequeteRelaisIA — CORS et méthodes', () => {
  test('OPTIONS -> 204 avec en-têtes CORS, jamais un appel au fournisseur', async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const reponse = await traiterRequeteRelaisIA(
      new Request('https://relais.workers.dev', { method: 'OPTIONS' }),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(204)
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE_AUTORISEE)
    expect(fournisseur.envoyerMessage).not.toHaveBeenCalled()
  })

  test('méthode GET -> 405, jamais un appel au fournisseur', async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const reponse = await traiterRequeteRelaisIA(
      new Request('https://relais.workers.dev', { method: 'GET' }),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(405)
    expect(fournisseur.envoyerMessage).not.toHaveBeenCalled()
  })

  test("l'origine CORS reflétée est exactement celle configurée, jamais '*'", async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const reponse = await traiterRequeteRelaisIA(
      requete({ mode: 'chat_normatif', question: 'Q ?', contenu_joint: false }),
      fournisseur,
      config(),
    )
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE_AUTORISEE)
  })
})

describe("traiterRequeteRelaisIA — jeton d'accès", () => {
  test('Authorization absent -> 401, jamais un appel au fournisseur', async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const reponse = await traiterRequeteRelaisIA(
      requete(
        { mode: 'chat_normatif', question: 'Q ?', contenu_joint: false },
        { sansJeton: true },
      ),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(401)
    expect(fournisseur.envoyerMessage).not.toHaveBeenCalled()
  })

  test('Authorization avec un jeton différent -> 401', async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const requeteAvecMauvaisJeton = new Request('https://relais.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mauvais-jeton' },
      body: JSON.stringify({ mode: 'chat_normatif', question: 'Q ?', contenu_joint: false }),
    })
    const reponse = await traiterRequeteRelaisIA(requeteAvecMauvaisJeton, fournisseur, config())
    expect(reponse.status).toBe(401)
  })
})

describe('traiterRequeteRelaisIA — validation de la requête', () => {
  test('mode invalide -> 400', async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const reponse = await traiterRequeteRelaisIA(
      requete({ mode: 'inconnu', question: 'Q ?', contenu_joint: false }),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(400)
    expect(fournisseur.envoyerMessage).not.toHaveBeenCalled()
  })

  test('question vide -> 400', async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const reponse = await traiterRequeteRelaisIA(
      requete({ mode: 'chat_normatif', question: '   ', contenu_joint: false }),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(400)
  })

  test('contenu_joint=true sans contenu -> 400', async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const reponse = await traiterRequeteRelaisIA(
      requete({ mode: 'chat_normatif', question: 'Q ?', contenu_joint: true }),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(400)
  })

  test('JSON invalide -> 400', async () => {
    const fournisseur = fournisseurMock({ texte: 'x', version_moteur: null })
    const requeteMalformee = new Request('https://relais.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${JETON}` },
      body: '{ceci nest pas du json',
    })
    const reponse = await traiterRequeteRelaisIA(requeteMalformee, fournisseur, config())
    expect(reponse.status).toBe(400)
  })
})

describe('traiterRequeteRelaisIA — routage du modèle par mode', () => {
  test("mode chat_normatif -> modèle 'claude-sonnet-5' transmis au fournisseur", async () => {
    const fournisseur = fournisseurMock({ texte: 'Réponse.', version_moteur: null })
    await traiterRequeteRelaisIA(
      requete({ mode: 'chat_normatif', question: 'Q ?', contenu_joint: false }),
      fournisseur,
      config(),
    )
    expect(fournisseur.envoyerMessage).toHaveBeenCalledWith(
      expect.any(String),
      'Q ?',
      'claude-sonnet-5',
    )
  })

  test("mode audit_simule -> modèle 'claude-opus-5' transmis au fournisseur", async () => {
    const fournisseur = fournisseurMock({ texte: 'Réponse.', version_moteur: null })
    await traiterRequeteRelaisIA(
      requete({ mode: 'audit_simule', question: 'Prompt enrichi.', contenu_joint: false }),
      fournisseur,
      config(),
    )
    expect(fournisseur.envoyerMessage).toHaveBeenCalledWith(
      expect.any(String),
      'Prompt enrichi.',
      'claude-opus-5',
    )
  })

  test('contenu_joint=true -> contenu préfixé au message utilisateur transmis au fournisseur', async () => {
    const fournisseur = fournisseurMock({ texte: 'Réponse.', version_moteur: null })
    await traiterRequeteRelaisIA(
      requete({
        mode: 'chat_normatif',
        question: 'Résume ce document.',
        contenu_joint: true,
        contenu: 'Texte du document joint.',
      }),
      fournisseur,
      config(),
    )
    const [, messageEnvoye] = (fournisseur.envoyerMessage as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, string, string]
    expect(messageEnvoye).toContain('Texte du document joint.')
    expect(messageEnvoye).toContain('Résume ce document.')
  })
})

describe("traiterRequeteRelaisIA — appel nominal et gestion d'erreur", () => {
  test('appel réussi -> 200, texte/version_moteur transmis, citations toujours []', async () => {
    const fournisseur = fournisseurMock({ texte: 'Réponse.', version_moteur: 'claude-sonnet-5-x' })
    const reponse = await traiterRequeteRelaisIA(
      requete({ mode: 'chat_normatif', question: 'Q ?', contenu_joint: false }),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(200)
    const corps = (await reponse.json()) as { texte: string; version_moteur: string; citations: [] }
    expect(corps.texte).toBe('Réponse.')
    expect(corps.version_moteur).toBe('claude-sonnet-5-x')
    expect(corps.citations).toEqual([])
  })

  test('ErreurFournisseurIA statutHttp 429 -> 429 (quota, jamais 502)', async () => {
    const fournisseur = fournisseurMock(new ErreurFournisseurIA('Rate limited.', 429))
    const reponse = await traiterRequeteRelaisIA(
      requete({ mode: 'chat_normatif', question: 'Q ?', contenu_joint: false }),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(429)
  })

  test('ErreurFournisseurIA statutHttp null (échec réseau) -> 502', async () => {
    const fournisseur = fournisseurMock(new ErreurFournisseurIA('network down', null))
    const reponse = await traiterRequeteRelaisIA(
      requete({ mode: 'chat_normatif', question: 'Q ?', contenu_joint: false }),
      fournisseur,
      config(),
    )
    expect(reponse.status).toBe(502)
  })

  test('erreur fournisseur -> aucun détail fournisseur exposé au client', async () => {
    const fournisseur = fournisseurMock(
      new ErreurFournisseurIA('Appel Claude refusé (statut 401) : Invalid API key.', 401),
    )
    const reponse = await traiterRequeteRelaisIA(
      requete({ mode: 'chat_normatif', question: 'Q ?', contenu_joint: false }),
      fournisseur,
      config(),
    )
    const corps = (await reponse.json()) as Record<string, unknown>
    expect(JSON.stringify(corps)).not.toContain('Claude')
    expect(JSON.stringify(corps)).not.toContain('Invalid API key')
  })
})

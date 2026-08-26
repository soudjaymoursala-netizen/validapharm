import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { traiterRequeteOcr } from './ocrHandler'
import type { FournisseurOcr } from './fournisseurs/FournisseurOcr'

const ORIGINE_AUTORISEE = 'https://exemple.github.io'

function fournisseurMock(
  resultat: Awaited<ReturnType<FournisseurOcr['extraireTexte']>> | Error,
): FournisseurOcr {
  return {
    extraireTexte: vi.fn(async () => {
      if (resultat instanceof Error) throw resultat
      return resultat
    }),
  }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('traiterRequeteOcr — CORS et méthodes', () => {
  test('OPTIONS -> 204 avec en-têtes CORS, jamais un appel au fournisseur', async () => {
    const fournisseur = fournisseurMock({ texte: '', fournisseur: 'x', version_moteur: null })
    const requete = new Request('https://relais.workers.dev', { method: 'OPTIONS' })
    const reponse = await traiterRequeteOcr(requete, fournisseur, ORIGINE_AUTORISEE)
    expect(reponse.status).toBe(204)
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE_AUTORISEE)
    expect(fournisseur.extraireTexte).not.toHaveBeenCalled()
  })

  test('méthode GET -> 405, jamais un appel au fournisseur', async () => {
    const fournisseur = fournisseurMock({ texte: '', fournisseur: 'x', version_moteur: null })
    const requete = new Request('https://relais.workers.dev', { method: 'GET' })
    const reponse = await traiterRequeteOcr(requete, fournisseur, ORIGINE_AUTORISEE)
    expect(reponse.status).toBe(405)
    expect(fournisseur.extraireTexte).not.toHaveBeenCalled()
  })

  test("l'origine CORS reflétée est exactement celle configurée, jamais '*'", async () => {
    const fournisseur = fournisseurMock({
      texte: 'x',
      fournisseur: 'azure_ai_vision',
      version_moteur: null,
    })
    const requete = new Request('https://relais.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: new Uint8Array([1, 2, 3]),
    })
    const reponse = await traiterRequeteOcr(requete, fournisseur, ORIGINE_AUTORISEE)
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE_AUTORISEE)
  })
})

describe('traiterRequeteOcr — validation de la requête', () => {
  test('Content-Type absent -> 400, jamais un appel au fournisseur', async () => {
    const fournisseur = fournisseurMock({ texte: '', fournisseur: 'x', version_moteur: null })
    const requete = new Request('https://relais.workers.dev', {
      method: 'POST',
      body: new Uint8Array([1]),
    })
    const reponse = await traiterRequeteOcr(requete, fournisseur, ORIGINE_AUTORISEE)
    expect(reponse.status).toBe(400)
    expect(fournisseur.extraireTexte).not.toHaveBeenCalled()
  })

  test('Content-Type non-image -> 400', async () => {
    const fournisseur = fournisseurMock({ texte: '', fournisseur: 'x', version_moteur: null })
    const requete = new Request('https://relais.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new Uint8Array([1]),
    })
    const reponse = await traiterRequeteOcr(requete, fournisseur, ORIGINE_AUTORISEE)
    expect(reponse.status).toBe(400)
  })

  test('corps vide -> 400', async () => {
    const fournisseur = fournisseurMock({ texte: '', fournisseur: 'x', version_moteur: null })
    const requete = new Request('https://relais.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: new Uint8Array([]),
    })
    const reponse = await traiterRequeteOcr(requete, fournisseur, ORIGINE_AUTORISEE)
    expect(reponse.status).toBe(400)
  })
})

describe("traiterRequeteOcr — appel nominal et gestion d'erreur", () => {
  test('extraction réussie -> 200, résultat du fournisseur transmis tel quel', async () => {
    const fournisseur = fournisseurMock({
      texte: 'Texte extrait',
      fournisseur: 'azure_ai_vision',
      version_moteur: '3.2.0',
    })
    const requete = new Request('https://relais.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: new Uint8Array([1, 2, 3]),
    })
    const reponse = await traiterRequeteOcr(requete, fournisseur, ORIGINE_AUTORISEE)
    expect(reponse.status).toBe(200)
    const corps = (await reponse.json()) as { texte: string }
    expect(corps.texte).toBe('Texte extrait')
  })

  test('échec du fournisseur -> 502, message générique, aucun détail fournisseur exposé au client', async () => {
    const fournisseur = fournisseurMock(new Error('Soumission Azure Vision refusée (statut 401).'))
    const requete = new Request('https://relais.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: new Uint8Array([1, 2, 3]),
    })
    const reponse = await traiterRequeteOcr(requete, fournisseur, ORIGINE_AUTORISEE)
    expect(reponse.status).toBe(502)
    const corps = (await reponse.json()) as Record<string, unknown>
    expect(JSON.stringify(corps)).not.toContain('Azure')
    expect(JSON.stringify(corps)).not.toContain('401')
  })
})

import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from './useAuthStore'
import { useConnexionGitHubStore } from './useConnexionGitHubStore'

// Le dépôt GitHub est désormais un paramètre d'installation stocké côté
// Worker/D1 (voir `useConnexionGitHubStore`) — `fetchGitHubMock` ci-dessous
// ne sert donc plus qu'aux appels réels à l'API GitHub
// (`testerConnexion`), jamais à l'authentification/la configuration
// (interceptées par `installerFauxWorkerAuth`, qui délègue tout le reste à
// `fetchGitHubMock`).
let fetchGitHubMock: ReturnType<typeof vi.fn>
let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  fetchGitHubMock = vi.fn()
  vi.stubGlobal('fetch', fetchGitHubMock)
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('useConnexionGitHubStore — enregistrer/charger', () => {
  test('enregistre et relit la configuration, branche par défaut à "main"', async () => {
    const store = useConnexionGitHubStore()
    const resultat = await store.enregistrer({
      owner: 'acme',
      repo: 'validapharm-data',
      branche: '',
      jeton: 'ghp_xxx',
    })
    expect(resultat).toEqual({ ok: true })
    expect(store.connexion).toEqual({
      owner: 'acme',
      repo: 'validapharm-data',
      branche: 'main',
      jeton: 'ghp_xxx',
    })

    const autreVue = useConnexionGitHubStore()
    await autreVue.charger()
    expect(autreVue.connexion).toEqual(store.connexion)
  })

  test('un utilisateur non-admin ne peut pas enregistrer (paramètre partagé par toute l’installation)', async () => {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) throw new Error('préparation de test invalide')
    await api.creerUtilisateur(authStore.jeton, {
      email: 'employe@pharmatech.example',
      motDePasse: 'MotDePasse!1',
      nom: 'N',
      prenom: 'P',
      role: 'utilisateur',
    })
    const login = await api.login('employe@pharmatech.example', 'MotDePasse!1')
    if (!login.ok) throw new Error('login employé échoué')
    authStore.jeton = login.donnees.jeton

    const store = useConnexionGitHubStore()
    const resultat = await store.enregistrer({
      owner: 'acme',
      repo: 'data',
      branche: 'main',
      jeton: 'x',
    })
    expect(resultat).toEqual({ ok: false, erreur: 'non_autorise' })
  })

  test('effacer supprime la configuration stockée', async () => {
    const store = useConnexionGitHubStore()
    await store.enregistrer({ owner: 'acme', repo: 'data', branche: 'main', jeton: 'x' })
    await store.effacer()
    expect(store.connexion).toBeNull()

    const autreVue = useConnexionGitHubStore()
    await autreVue.charger()
    expect(autreVue.connexion).toBeNull()
  })
})

describe('useConnexionGitHubStore — testerConnexion', () => {
  test('sans configuration enregistrée : échec explicite sans appel réseau', async () => {
    const store = useConnexionGitHubStore()
    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: false, message: 'Aucune configuration enregistrée.' })
    expect(fetchGitHubMock).not.toHaveBeenCalled()
  })

  test("configuration valide : appelle réellement l'API et retourne le SHA de branche", async () => {
    const store = useConnexionGitHubStore()
    await store.enregistrer({ owner: 'acme', repo: 'data', branche: 'main', jeton: 'x' })
    fetchGitHubMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ object: { sha: 'sha-actuel' } }),
    })

    const resultat = await store.testerConnexion()
    expect(resultat).toEqual({ ok: true, shaBranche: 'sha-actuel' })
  })

  test('jeton invalide : retourne un échec explicite, jamais le jeton dans le message', async () => {
    const store = useConnexionGitHubStore()
    await store.enregistrer({ owner: 'acme', repo: 'data', branche: 'main', jeton: 'jeton-secret' })
    fetchGitHubMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => null },
      json: async () => ({}),
    })

    const resultat = await store.testerConnexion()
    expect(resultat.ok).toBe(false)
    expect(JSON.stringify(resultat)).not.toContain('jeton-secret')
  })
})

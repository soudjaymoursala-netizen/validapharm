import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnexionRelaisIAStore } from './useConnexionRelaisIAStore'

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('useConnexionRelaisIAStore', () => {
  test('enregistre et relit la configuration', async () => {
    const store = useConnexionRelaisIAStore()
    const resultat = await store.enregistrer({
      relayUrl: 'https://relais.workers.dev',
      jeton: 'jeton-x',
    })
    expect(resultat).toEqual({ ok: true })
    expect(store.connexion).toEqual({
      relayUrl: 'https://relais.workers.dev',
      jeton: 'jeton-x',
    })

    const autreVue = useConnexionRelaisIAStore()
    await autreVue.charger()
    expect(autreVue.connexion).toEqual(store.connexion)
  })

  test('effacer supprime la configuration stockée', async () => {
    const store = useConnexionRelaisIAStore()
    await store.enregistrer({ relayUrl: 'https://relais.workers.dev', jeton: 'x' })
    await store.effacer()
    expect(store.connexion).toBeNull()

    const autreVue = useConnexionRelaisIAStore()
    await autreVue.charger()
    expect(autreVue.connexion).toBeNull()
  })

  test('charger sans configuration existante : connexion null', async () => {
    const store = useConnexionRelaisIAStore()
    await store.charger()
    expect(store.connexion).toBeNull()
  })
})

import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnexionRelaisOCRStore } from './useConnexionRelaisOCRStore'

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

describe('useConnexionRelaisOCRStore', () => {
  test('enregistre et relit la configuration', async () => {
    const store = useConnexionRelaisOCRStore()
    const resultat = await store.enregistrer({
      relayUrl: 'https://ocr-relay.workers.dev',
      jeton: 'jeton-x',
    })
    expect(resultat).toEqual({ ok: true })
    // Le jeton n'est jamais renvoyé au navigateur (écriture seule).
    expect(store.connexion).toEqual({
      relayUrl: 'https://ocr-relay.workers.dev',
      jetonConfigure: true,
    })

    const autreVue = useConnexionRelaisOCRStore()
    await autreVue.charger()
    expect(autreVue.connexion).toEqual(store.connexion)
    expect(JSON.stringify(autreVue.connexion)).not.toContain('jeton-x')
  })

  test('effacer supprime la configuration stockée', async () => {
    const store = useConnexionRelaisOCRStore()
    await store.enregistrer({ relayUrl: 'https://ocr-relay.workers.dev', jeton: 'x' })
    await store.effacer()
    expect(store.connexion).toBeNull()

    const autreVue = useConnexionRelaisOCRStore()
    await autreVue.charger()
    expect(autreVue.connexion).toBeNull()
  })

  test('charger sans configuration existante : connexion null', async () => {
    const store = useConnexionRelaisOCRStore()
    await store.charger()
    expect(store.connexion).toBeNull()
  })
})

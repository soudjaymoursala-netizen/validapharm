import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useConnexionRelaisIAStore } from './useConnexionRelaisIAStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.connexionRelaisIA.clear()
})

describe('useConnexionRelaisIAStore', () => {
  test('enregistre et relit la configuration', async () => {
    const store = useConnexionRelaisIAStore()
    await store.enregistrer({ relayUrl: 'https://relais.workers.dev', jeton: 'jeton-x' })
    expect(store.connexion).toEqual({
      id: 'unique',
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
    expect(await db.connexionRelaisIA.get('unique')).toBeUndefined()
  })

  test('charger sans configuration existante : connexion null', async () => {
    const store = useConnexionRelaisIAStore()
    await store.charger()
    expect(store.connexion).toBeNull()
  })
})

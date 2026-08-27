import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useClientActifStore } from './useClientActifStore'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useClientActifStore', () => {
  test('aucun client mémorisé par défaut', () => {
    const store = useClientActifStore()
    expect(store.clientActifId).toBeNull()
  })

  test('definirClientActif mémorise et persiste dans localStorage', () => {
    const store = useClientActifStore()
    store.definirClientActif('client-1')
    expect(store.clientActifId).toBe('client-1')
    expect(localStorage.getItem('validapharm.client_actif_id')).toBe('client-1')
  })

  test('une nouvelle instance du store relit la valeur déjà persistée', () => {
    const premiere = useClientActifStore()
    premiere.definirClientActif('client-1')

    setActivePinia(createPinia())
    const seconde = useClientActifStore()
    expect(seconde.clientActifId).toBe('client-1')
  })

  test('reinitialiser efface la mémorisation', () => {
    const store = useClientActifStore()
    store.definirClientActif('client-1')
    store.reinitialiser()
    expect(store.clientActifId).toBeNull()
    expect(localStorage.getItem('validapharm.client_actif_id')).toBeNull()
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useModeAffichageStore } from './useModeAffichageStore'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useModeAffichageStore', () => {
  test('mode expert par défaut', () => {
    const store = useModeAffichageStore()
    expect(store.mode).toBe('expert')
  })

  test('definirMode bascule et persiste', () => {
    const store = useModeAffichageStore()
    store.definirMode('assistant')
    expect(store.mode).toBe('assistant')
    expect(localStorage.getItem('validapharm.mode_affichage')).toBe('assistant')
  })

  test('une nouvelle instance du store relit la valeur déjà persistée', () => {
    const premiere = useModeAffichageStore()
    premiere.definirMode('assistant')

    setActivePinia(createPinia())
    const seconde = useModeAffichageStore()
    expect(seconde.mode).toBe('assistant')
  })
})

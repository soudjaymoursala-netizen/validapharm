import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { usePreferencesAffichageStore } from './usePreferencesAffichageStore'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.documentElement.style.removeProperty('--vp-police')
})

describe('usePreferencesAffichageStore', () => {
  test('valeurs par défaut : thème système, police système, aucun data-theme posé', () => {
    const store = usePreferencesAffichageStore()
    expect(store.theme).toBe('systeme')
    expect(store.police).toBe('systeme')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  test('definirTheme("sombre") pose data-theme="sombre" et persiste en localStorage', () => {
    const store = usePreferencesAffichageStore()
    store.definirTheme('sombre')

    expect(store.theme).toBe('sombre')
    expect(document.documentElement.dataset.theme).toBe('sombre')
    expect(localStorage.getItem('validapharm.theme')).toBe('sombre')
  })

  test('definirTheme("clair") puis definirTheme("systeme") retire l\'attribut data-theme', () => {
    const store = usePreferencesAffichageStore()
    store.definirTheme('clair')
    expect(document.documentElement.dataset.theme).toBe('clair')

    store.definirTheme('systeme')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(localStorage.getItem('validapharm.theme')).toBe('systeme')
  })

  test('definirPolice("serif") met à jour la variable CSS --vp-police et persiste', () => {
    const store = usePreferencesAffichageStore()
    store.definirPolice('serif')

    expect(store.police).toBe('serif')
    expect(document.documentElement.style.getPropertyValue('--vp-police')).toContain('serif')
    expect(localStorage.getItem('validapharm.police')).toBe('serif')
  })

  test('un nouveau store relit la préférence déjà persistée en localStorage', () => {
    const store1 = usePreferencesAffichageStore()
    store1.definirTheme('sombre')
    store1.definirPolice('serif')

    setActivePinia(createPinia())
    const store2 = usePreferencesAffichageStore()
    expect(store2.theme).toBe('sombre')
    expect(store2.police).toBe('serif')
  })
})

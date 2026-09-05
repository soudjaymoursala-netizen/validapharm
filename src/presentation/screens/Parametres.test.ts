import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { usePreferencesAffichageStore } from '../stores/usePreferencesAffichageStore'
import Parametres from './Parametres.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.documentElement.style.removeProperty('--vp-police')
})

describe('Parametres — thème et police (§9 du prompt maître)', () => {
  test('coche les options système par défaut', () => {
    const wrapper = mount(Parametres)

    const radiosTheme = wrapper.findAll('input[name="theme"]')
    expect(radiosTheme.map((r) => (r.element as HTMLInputElement).checked)).toEqual([
      true,
      false,
      false,
    ])
    const radiosPolice = wrapper.findAll('input[name="police"]')
    expect(radiosPolice.map((r) => (r.element as HTMLInputElement).checked)).toEqual([true, false])
  })

  test('choisir "Sombre" met à jour le store et pose data-theme réellement', async () => {
    const wrapper = mount(Parametres)
    const store = usePreferencesAffichageStore()

    const radiosTheme = wrapper.findAll('input[name="theme"]')
    await radiosTheme[2]?.setValue(true)

    expect(store.theme).toBe('sombre')
    expect(document.documentElement.dataset.theme).toBe('sombre')
  })

  test('choisir "Serif" met à jour la variable CSS --vp-police', async () => {
    const wrapper = mount(Parametres)
    const store = usePreferencesAffichageStore()

    const radiosPolice = wrapper.findAll('input[name="police"]')
    await radiosPolice[1]?.setValue(true)

    expect(store.police).toBe('serif')
    expect(document.documentElement.style.getPropertyValue('--vp-police')).toContain('serif')
  })

  test('ne propose ni langue ni densité — jamais une capacité de façade', () => {
    const wrapper = mount(Parametres)
    expect(wrapper.text()).not.toContain('Langue')
    expect(wrapper.text()).not.toContain('Densité')
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import { VERSION_SCHEMA_CONNUE } from '../../persistance/demarrage'
import BlocageIncompatibilite from './BlocageIncompatibilite.vue'

describe('BlocageIncompatibilite', () => {
  test('affiche le message U-12 en français par défaut, avec la version de schéma connue', () => {
    const wrapper = mount(BlocageIncompatibilite)

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('Application non compatible')
    expect(wrapper.text()).toContain(VERSION_SCHEMA_CONNUE)
    expect(wrapper.text()).toContain('ne peut pas ouvrir ces données')
  })

  test('affiche le message U-12 en anglais quand la langue est explicitement demandée', () => {
    const wrapper = mount(BlocageIncompatibilite, { props: { langue: 'en' } })

    expect(wrapper.text()).toContain('cannot open this data')
  })

  test('affiche le message U-12 en allemand quand la langue est explicitement demandée', () => {
    const wrapper = mount(BlocageIncompatibilite, { props: { langue: 'de' } })

    expect(wrapper.text()).toContain('kann diese Daten nicht öffnen')
  })
})

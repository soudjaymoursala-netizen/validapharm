import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import FilAriane from './FilAriane.vue'

describe('FilAriane', () => {
  test('liens pour les niveaux parents, page courante non cliquable avec aria-current', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'accueil', component: { template: '<div />' } }],
    })
    await router.push('/')
    const wrapper = mount(FilAriane, {
      props: {
        elements: [{ libelle: 'Accueil', to: { name: 'accueil' } }, { libelle: 'Mes clients' }],
      },
      global: { plugins: [router] },
    })

    expect(wrapper.find('nav').attributes('aria-label')).toBe("Fil d'Ariane")
    expect(wrapper.findAll('a')).toHaveLength(1)
    expect(wrapper.find('a').text()).toBe('Accueil')
    expect(wrapper.find('li:last-child span').attributes('aria-current')).toBe('page')
    expect(wrapper.find('li:last-child span').text()).toBe('Mes clients')
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { usePiegeFocus } from './usePiegeFocus'

const Fenetre = defineComponent({
  emits: ['annule'],
  setup(_, { emit }) {
    const fenetre = ref<HTMLElement | null>(null)
    usePiegeFocus(fenetre, () => emit('annule'))
    return { fenetre }
  },
  template: `<div ref="fenetre" role="dialog">
    <input class="premier" />
    <button class="dernier" type="button">OK</button>
  </div>`,
})

async function ouvrir() {
  const declencheur = document.createElement('button')
  document.body.appendChild(declencheur)
  declencheur.focus()
  const wrapper = mount(Fenetre, { attachTo: document.body })
  await nextTick()
  await nextTick()
  return { wrapper, declencheur }
}

describe('usePiegeFocus', () => {
  test('focus sur le premier champ, Tab reste dans la fenêtre, retour au déclencheur', async () => {
    const { wrapper, declencheur } = await ouvrir()
    const premier = wrapper.find('.premier').element as HTMLElement
    const dernier = wrapper.find('.dernier').element as HTMLElement
    expect(document.activeElement).toBe(premier)

    dernier.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }))
    expect(document.activeElement).toBe(premier)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true }),
    )
    expect(document.activeElement).toBe(dernier)

    wrapper.unmount()
    expect(document.activeElement).toBe(declencheur)
    declencheur.remove()
  })

  test('Échap ferme la fenêtre', async () => {
    const { wrapper, declencheur } = await ouvrir()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    expect(wrapper.emitted('annule')).toHaveLength(1)
    wrapper.unmount()
    declencheur.remove()
  })
})

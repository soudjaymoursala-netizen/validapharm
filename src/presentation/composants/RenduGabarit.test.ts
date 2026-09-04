import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import type { DefinitionGabarit } from '../../logique-metier/gabarits/definitionGabarit'
import RenduGabarit from './RenduGabarit.vue'

const definitionAvecColonneListe: DefinitionGabarit = {
  template_id: 'iq',
  template_version: '1.0.0',
  family: 'C',
  normes_associees: [],
  sections: [
    {
      section_key: 'verifications',
      labels: { fr: 'Vérifications', en: 'Checks', de: 'Prüfungen' },
      required_link_type: null,
      fields: [
        {
          field_key: 'lignes',
          labels: { fr: 'Lignes', en: 'Rows', de: 'Zeilen' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'conforme',
              labels: { fr: 'Conforme', en: 'Compliant', de: 'Konform' },
              type: 'liste',
              required: false,
              options: [
                { valeur: 'oui', labels: { fr: 'Oui', en: 'Yes', de: 'Ja' } },
                { valeur: 'non', labels: { fr: 'Non', en: 'No', de: 'Nein' } },
              ],
            },
          ],
        },
      ],
    },
  ],
}

function monter() {
  return mount(RenduGabarit, {
    props: {
      definition: definitionAvecColonneListe,
      values: {},
      tables: { lignes: [{ conforme: null }] },
      langue: 'fr',
      verrouille: false,
    },
  })
}

const definitionAvecChampScalaire: DefinitionGabarit = {
  template_id: 'dq',
  template_version: '1.0.0',
  family: 'B',
  normes_associees: [],
  sections: [
    {
      section_key: 'generalites',
      labels: { fr: 'Généralités', en: 'General', de: 'Allgemein' },
      required_link_type: null,
      fields: [
        {
          field_key: 'tolerance',
          labels: { fr: 'Tolérance', en: 'Tolerance', de: 'Toleranz' },
          type: 'nombre',
          required: false,
          min: 0,
          max: 100,
        },
        {
          field_key: 'objectif',
          labels: { fr: 'Objectif', en: 'Objective', de: 'Ziel' },
          type: 'texte_long',
          required: false,
        },
      ],
    },
  ],
}

describe('RenduGabarit — champsSignales (§4.1bis, Phase 33)', () => {
  function monterAvecSignalement(champsSignales: string[]) {
    return mount(RenduGabarit, {
      props: {
        definition: definitionAvecChampScalaire,
        values: {},
        tables: {},
        langue: 'fr',
        verrouille: false,
        champsSignales,
      },
    })
  }

  test('affiche le badge de signalement uniquement sur les champs listés', () => {
    const wrapper = monterAvecSignalement(['tolerance'])
    const labels = wrapper.findAll('label')
    const labelTolerance = labels.find((l) => l.text().includes('Tolérance'))
    const labelObjectif = labels.find((l) => l.text().includes('Objectif'))
    expect(labelTolerance?.find('.badge-signale').exists()).toBe(true)
    expect(labelObjectif?.find('.badge-signale').exists()).toBe(false)
  })

  test('aucun badge quand champsSignales est vide (par défaut)', () => {
    const wrapper = mount(RenduGabarit, {
      props: {
        definition: definitionAvecChampScalaire,
        values: {},
        tables: {},
        langue: 'fr',
        verrouille: false,
      },
    })
    expect(wrapper.find('.badge-signale').exists()).toBe(false)
  })
})

describe('RenduGabarit — colonne de type liste dans un tableau dynamique', () => {
  test('rend un <select> avec les options du gabarit, jamais un champ texte libre', () => {
    const wrapper = monter()
    const select = wrapper.find('table select')
    expect(select.exists()).toBe(true)
    const optionsTextes = select.findAll('option').map((o) => o.text())
    expect(optionsTextes).toEqual(['', 'Oui', 'Non'])
    // Régression : avant correction, cette colonne tombait dans la branche
    // générique et rendait un <input type="text"> à la place.
    expect(wrapper.find('table input').exists()).toBe(false)
  })

  test('sélectionner une option émet maj-table avec la valeur choisie', async () => {
    const wrapper = monter()
    await wrapper.find('table select').setValue('non')
    const emissions = wrapper.emitted('maj-table')
    expect(emissions).toBeDefined()
    const premiereEmission = emissions?.[0] as [string, Array<{ conforme: string | null }>]
    const [cleTable, lignes] = premiereEmission
    expect(cleTable).toBe('lignes')
    expect(lignes[0]?.conforme).toBe('non')
  })
})

import { describe, expect, test } from 'vitest'
import type { ColonneTableau } from '../gabarits/definitionGabarit'
import { genererExportCSV } from './genererExportCSV'

function colonnes(): ColonneTableau[] {
  return [
    {
      field_key: 'danger',
      labels: { fr: 'Danger', en: 'Hazard', de: 'Gefährdung' },
      type: 'texte_court',
      required: true,
    },
    {
      field_key: 'severite',
      labels: { fr: 'Sévérité', en: 'Severity', de: 'Schweregrad' },
      type: 'nombre',
      required: true,
      min: 1,
      max: 5,
    },
  ]
}

describe('genererExportCSV', () => {
  test('en-têtes = libellés dans la langue demandée, une ligne par enregistrement', () => {
    const csv = genererExportCSV(
      colonnes(),
      [
        { danger: 'Panne capteur', severite: 4 },
        { danger: 'Fuite', severite: 2 },
      ],
      'fr',
    )
    expect(csv).toBe('Danger,Sévérité\r\nPanne capteur,4\r\nFuite,2')
  })

  test('libellé en langue demandée (anglais)', () => {
    const csv = genererExportCSV(colonnes(), [], 'en')
    expect(csv).toBe('Hazard,Severity')
  })

  test('échappe les valeurs contenant une virgule, un guillemet ou un retour à la ligne', () => {
    const csv = genererExportCSV(
      colonnes(),
      [{ danger: 'Fuite, "grave"\nurgent', severite: 5 }],
      'fr',
    )
    expect(csv).toBe('Danger,Sévérité\r\n"Fuite, ""grave""\nurgent",5')
  })

  test('valeur null ou absente -> cellule vide, jamais "null"', () => {
    const csv = genererExportCSV(colonnes(), [{ danger: null, severite: null }], 'fr')
    expect(csv).toBe('Danger,Sévérité\r\n,')
  })
})

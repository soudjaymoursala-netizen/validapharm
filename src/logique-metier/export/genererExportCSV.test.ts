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

  test("colonne calculée (IPR) : recalculée pour l'export, jamais vide malgré une valeur brute null non persistée", () => {
    const colonnesAvecIPR: ColonneTableau[] = [
      ...colonnes(),
      {
        field_key: 'occurrence',
        labels: { fr: 'Occurrence', en: 'Occurrence', de: 'Auftreten' },
        type: 'nombre',
        required: true,
        min: 1,
        max: 5,
      },
      {
        field_key: 'detectabilite',
        labels: { fr: 'Détectabilité', en: 'Detectability', de: 'Entdeckbarkeit' },
        type: 'nombre',
        required: true,
        min: 1,
        max: 5,
      },
      {
        field_key: 'ipr',
        labels: { fr: 'IPR', en: 'RPN', de: 'RPZ' },
        type: 'nombre',
        required: false,
        min: 1,
        max: 125,
        formule: { cle: 'ipr', entrees: ['severite', 'occurrence', 'detectabilite'] },
      },
    ]
    const csv = genererExportCSV(
      colonnesAvecIPR,
      [
        {
          danger: 'Sonde mal positionnée',
          severite: 5,
          occurrence: 2,
          detectabilite: 3,
          ipr: null,
        },
      ],
      'fr',
    )
    expect(csv).toBe(
      'Danger,Sévérité,Occurrence,Détectabilité,IPR\r\nSonde mal positionnée,5,2,3,30',
    )
  })
})

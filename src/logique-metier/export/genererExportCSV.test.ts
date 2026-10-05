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
    expect(csv).toBe('\uFEFFDanger;Sévérité\r\nPanne capteur;4\r\nFuite;2')
  })

  test('libellé en langue demandée (anglais)', () => {
    const csv = genererExportCSV(colonnes(), [], 'en')
    expect(csv).toBe('\uFEFFHazard;Severity')
  })

  test('échappe les valeurs contenant un point-virgule, un guillemet ou un retour à la ligne', () => {
    const csv = genererExportCSV(
      colonnes(),
      [{ danger: 'Fuite; "grave", urgent\nà traiter', severite: 5 }],
      'fr',
    )
    expect(csv).toBe('\uFEFFDanger;Sévérité\r\n"Fuite; ""grave"", urgent\nà traiter";5')
  })

  test('valeur null ou absente -> cellule vide, jamais "null"', () => {
    const csv = genererExportCSV(colonnes(), [{ danger: null, severite: null }], 'fr')
    expect(csv).toBe('\uFEFFDanger;Sévérité\r\n;')
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
      '\uFEFFDanger;Sévérité;Occurrence;Détectabilité;IPR\r\nSonde mal positionnée;5;2;3;30',
    )
  })

  test('valeurs de liste en toutes lettres, dates et décimales au format français', () => {
    const colonnesTypees: ColonneTableau[] = [
      {
        field_key: 'priorite',
        labels: { fr: 'Priorité', en: 'Priority', de: 'Priorität' },
        type: 'liste',
        required: true,
        options: [{ valeur: 'must', labels: { fr: 'Doit (Must)', en: 'Must', de: 'Muss' } }],
      },
      {
        field_key: 'echeance',
        labels: { fr: 'Échéance', en: 'Due', de: 'Frist' },
        type: 'date',
        required: false,
      },
      {
        field_key: 'temperature',
        labels: { fr: 'Température (°C)', en: 'Temperature', de: 'Temperatur' },
        type: 'nombre',
        required: false,
        min: 0,
        max: 200,
      },
    ]
    const csv = genererExportCSV(
      colonnesTypees,
      [{ priorite: 'must', echeance: '2026-10-05', temperature: 121.5 }],
      'fr',
    )
    expect(csv).toBe('\uFEFFPriorité;Échéance;Température (°C)\r\nDoit (Must);05/10/2026;121,5')
  })
})

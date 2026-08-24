import { describe, expect, test } from 'vitest'
import type {
  ChampDate,
  ChampListe,
  ChampNombre,
  ChampTexteCourt,
  ChampTexteLong,
} from './definitionGabarit'
import { validerChamp } from './validerChamp'

describe('validerChamp', () => {
  test('valeur vide (null ou chaîne vide) toujours valide, quel que soit le type', () => {
    const champ: ChampTexteCourt = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'texte_court',
      required: true,
      longueur_max: 5,
    }
    expect(validerChamp(champ, null)).toEqual({ valide: true })
    expect(validerChamp(champ, '')).toEqual({ valide: true })
  })

  test('texte_court : rejette au-delà de longueur_max', () => {
    const champ: ChampTexteCourt = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'texte_court',
      required: false,
      longueur_max: 5,
    }
    expect(validerChamp(champ, 'abcde')).toEqual({ valide: true })
    expect(validerChamp(champ, 'abcdef')).toEqual({
      valide: false,
      message: 'Ce champ ne peut dépasser 5 caractères.',
    })
  })

  test('texte_court sans longueur_max : aucune limite', () => {
    const champ: ChampTexteCourt = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'texte_court',
      required: false,
    }
    expect(validerChamp(champ, 'a'.repeat(1000))).toEqual({ valide: true })
  })

  test('texte_long : jamais de limite technique', () => {
    const champ: ChampTexteLong = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'texte_long',
      required: false,
    }
    expect(validerChamp(champ, 'a'.repeat(10_000))).toEqual({ valide: true })
  })

  test('liste : rejette une valeur hors énumération', () => {
    const champ: ChampListe = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'liste',
      required: false,
      options: [
        { valeur: 'a', labels: { fr: 'A', en: 'A', de: 'A' } },
        { valeur: 'b', labels: { fr: 'B', en: 'B', de: 'B' } },
      ],
    }
    expect(validerChamp(champ, 'a')).toEqual({ valide: true })
    expect(validerChamp(champ, 'c')).toEqual({
      valide: false,
      message: 'Valeur non reconnue pour ce champ.',
    })
  })

  test('date : rejette un format non ISO-8601', () => {
    const champ: ChampDate = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'date',
      required: false,
    }
    expect(validerChamp(champ, '2026-01-15')).toEqual({ valide: true })
    expect(validerChamp(champ, '15/01/2026')).toEqual({
      valide: false,
      message: 'Date invalide ou hors plage autorisée.',
    })
  })

  test('date : rejette hors plage min/max', () => {
    const champ: ChampDate = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'date',
      required: false,
      min: '2026-01-01',
      max: '2026-12-31',
    }
    expect(validerChamp(champ, '2027-01-01')).toEqual({
      valide: false,
      message: 'Date invalide ou hors plage autorisée.',
    })
  })

  test('nombre : rejette hors plage', () => {
    const champ: ChampNombre = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'nombre',
      required: false,
      min: 1,
      max: 5,
    }
    expect(validerChamp(champ, 3)).toEqual({ valide: true })
    expect(validerChamp(champ, 6)).toEqual({ valide: false, message: 'Valeur hors plage (1-5).' })
    expect(validerChamp(champ, 0)).toEqual({ valide: false, message: 'Valeur hors plage (1-5).' })
  })

  test('nombre : rejette une valeur non numérique', () => {
    const champ: ChampNombre = {
      field_key: 'x',
      labels: { fr: 'X', en: 'X', de: 'X' },
      type: 'nombre',
      required: false,
      min: 1,
      max: 5,
    }
    expect(validerChamp(champ, 'abc')).toEqual({
      valide: false,
      message: 'Valeur hors plage (1-5).',
    })
  })
})

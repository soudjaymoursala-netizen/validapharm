import { describe, expect, test } from 'vitest'
import type { ChampNombre, ColonneTableau } from './definitionGabarit'
import { evaluerColonneCalculee } from './evaluerColonneCalculee'

function colonneNombre(fieldKey: string, min: number, max: number): ChampNombre {
  return {
    field_key: fieldKey,
    labels: { fr: fieldKey, en: fieldKey, de: fieldKey },
    type: 'nombre',
    required: false,
    min,
    max,
  }
}

function colonnesSOD(): ColonneTableau[] {
  return [
    colonneNombre('severite', 1, 5),
    colonneNombre('occurrence', 1, 5),
    colonneNombre('detectabilite', 1, 5),
  ]
}

function colonneIPR(): ChampNombre {
  return {
    ...colonneNombre('ipr', 1, 125),
    formule: { cle: 'ipr', entrees: ['severite', 'occurrence', 'detectabilite'] },
  }
}

describe('evaluerColonneCalculee', () => {
  test('calcule IPR = S × O × D quand les trois entrées sont renseignées', () => {
    const resultat = evaluerColonneCalculee(colonneIPR(), colonnesSOD(), {
      severite: 4,
      occurrence: 3,
      detectabilite: 2,
    })
    expect(resultat).toBe(24)
  })

  test('entrée manquante -> null, jamais une erreur', () => {
    const resultat = evaluerColonneCalculee(colonneIPR(), colonnesSOD(), {
      severite: 4,
      occurrence: null,
      detectabilite: 2,
    })
    expect(resultat).toBeNull()
  })

  test('colonne sans formule -> null', () => {
    const colonne = colonneNombre('x', 1, 5)
    expect(evaluerColonneCalculee(colonne, colonnesSOD(), { x: 3 })).toBeNull()
  })

  test('entrée hors plage de sa PROPRE colonne (pas celle de la sortie) -> null', () => {
    // Régression : l'échelle de validation S/O/D doit venir des colonnes
    // severite/occurrence/detectabilite (ici [1,5]), jamais de la plage de
    // sortie de la colonne IPR elle-même (ici [1,125], où 6 serait valide
    // à tort si le bug de conception initial n'avait pas été corrigé).
    const resultat = evaluerColonneCalculee(colonneIPR(), colonnesSOD(), {
      severite: 6,
      occurrence: 3,
      detectabilite: 2,
    })
    expect(resultat).toBeNull()
  })

  test('colonne d’entrée introuvable dans la définition de table -> null', () => {
    const colonne: ChampNombre = {
      ...colonneNombre('ipr', 1, 125),
      formule: { cle: 'ipr', entrees: ['severite', 'occurrence', 'colonne_absente'] },
    }
    const resultat = evaluerColonneCalculee(colonne, colonnesSOD(), {
      severite: 4,
      occurrence: 3,
      colonne_absente: 2,
    })
    expect(resultat).toBeNull()
  })
})

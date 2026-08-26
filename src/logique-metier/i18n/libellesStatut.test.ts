import { describe, expect, test } from 'vitest'
import { libelleStatut } from './libellesStatut'

describe('libelleStatut', () => {
  test('valide_en_interne porte toujours le rappel "pas une signature électronique opposable"', () => {
    expect(libelleStatut('valide_en_interne', 'fr')).toContain(
      'pas une signature électronique opposable',
    )
    expect(libelleStatut('valide_en_interne', 'en')).toContain('not a legally binding')
  })

  test('ne renvoie jamais le nom technique brut de l’enum', () => {
    expect(libelleStatut('brouillon_aide', 'fr')).not.toBe('brouillon_aide')
    expect(libelleStatut('propose_par_ia_non_valide', 'fr')).not.toBe('propose_par_ia_non_valide')
  })
})

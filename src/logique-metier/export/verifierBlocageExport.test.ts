import { describe, expect, test } from 'vitest'
import { verifierBlocageExport } from './verifierBlocageExport'

describe('verifierBlocageExport', () => {
  test('bloque une section propose_par_ia_non_valide', () => {
    const resultat = verifierBlocageExport({ status: 'propose_par_ia_non_valide' })
    expect(resultat.bloque).toBe(true)
  })

  test.each(['brouillon_aide', 'en_verification', 'en_approbation', 'valide_en_interne'] as const)(
    'ne bloque pas le statut %s',
    (status) => {
      expect(verifierBlocageExport({ status })).toEqual({ bloque: false })
    },
  )
})

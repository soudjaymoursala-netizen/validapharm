import { describe, expect, test } from 'vitest'
import { verifierCompatibiliteSchema } from './verifierCompatibiliteSchema'

describe('verifierCompatibiliteSchema', () => {
  test('version du dépôt égale à la version connue : compatible, aucune migration', () => {
    const resultat = verifierCompatibiliteSchema('1.3.0', '1.3.0')
    expect(resultat).toEqual({ compatible: true, migrationRequise: false })
  })

  test('version du dépôt antérieure : compatible, migration requise', () => {
    const resultat = verifierCompatibiliteSchema('1.2.0', '1.3.0')
    expect(resultat).toEqual({ compatible: true, migrationRequise: true })
  })

  test('version du dépôt postérieure (rollback applicatif) : bloqué, U-12', () => {
    const resultat = verifierCompatibiliteSchema('1.4.0', '1.3.0')
    expect(resultat).toEqual({ compatible: false, messageCode: 'U-12' })
  })

  test('un dépassement même minime (patch) reste bloquant — pas de tolérance implicite', () => {
    const resultat = verifierCompatibiliteSchema('1.3.1', '1.3.0')
    expect(resultat).toEqual({ compatible: false, messageCode: 'U-12' })
  })
})

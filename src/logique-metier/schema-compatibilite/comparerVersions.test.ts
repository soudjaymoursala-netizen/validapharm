import { describe, expect, test } from 'vitest'
import { comparerVersions } from './comparerVersions'

describe('comparerVersions', () => {
  test('versions strictement égales', () => {
    expect(comparerVersions('1.2.3', '1.2.3')).toBe(0)
  })

  test('différence sur le patch', () => {
    expect(comparerVersions('1.2.3', '1.2.4')).toBe(-1)
    expect(comparerVersions('1.2.4', '1.2.3')).toBe(1)
  })

  test('différence sur le minor, comparaison numérique pas lexicographique', () => {
    // Un tri de chaînes classerait "1.9.0" après "1.10.0" à tort.
    expect(comparerVersions('1.9.0', '1.10.0')).toBe(-1)
    expect(comparerVersions('1.10.0', '1.9.0')).toBe(1)
  })

  test('différence sur le major', () => {
    expect(comparerVersions('1.99.99', '2.0.0')).toBe(-1)
  })

  test('rejette une version mal formée', () => {
    expect(() => comparerVersions('1.2', '1.2.0')).toThrow()
    expect(() => comparerVersions('1.2.x', '1.2.0')).toThrow()
    expect(() => comparerVersions('', '1.2.0')).toThrow()
  })
})

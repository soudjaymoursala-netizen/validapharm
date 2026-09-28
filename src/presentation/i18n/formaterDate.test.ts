import { describe, expect, test } from 'vitest'
import { formaterDateFr } from './formaterDate'

describe('formaterDateFr', () => {
  test('date seule : jamais décalée par le fuseau', () => {
    expect(formaterDateFr('2026-09-25')).toBe('25/09/2026')
  })
  test('horodatage : date locale française ; vide ou invalide sans plantage', () => {
    expect(formaterDateFr('2026-09-25T12:00:00.000Z')).toMatch(/^2[56]\/09\/2026$/)
    expect(formaterDateFr(null)).toBe('')
    expect(formaterDateFr('pas une date')).toBe('pas une date')
  })
})

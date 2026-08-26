import { describe, expect, test } from 'vitest'
import { aLienVersTypeSection, type SectionMinimale } from './aLienVersTypeSection'
import type { LienProjet } from '../domaine/types'

function lien(from: string, to: string): LienProjet {
  return { from_section_id: from, to_section_id: to, created_by: 'u1', created_at: '2026-01-01' }
}

const sections: SectionMinimale[] = [
  { id: 'oq-1', template_type: 'oq' },
  { id: 'ctx-1', template_type: 'contexte_procede' },
  { id: 'iq-1', template_type: 'iq' },
  { id: 'metro-1', template_type: 'plan_metrologie' },
]

describe('aLienVersTypeSection', () => {
  test('trouve un lien où la section est la source (from → to)', () => {
    const liens = [lien('oq-1', 'ctx-1')]
    expect(aLienVersTypeSection('oq-1', 'contexte_procede', liens, sections)).toBe(true)
  })

  test('trouve un lien où la section est la cible (to ← from) — sens indifférent', () => {
    const liens = [lien('ctx-1', 'oq-1')]
    expect(aLienVersTypeSection('oq-1', 'contexte_procede', liens, sections)).toBe(true)
  })

  test('aucun lien vers le type demandé : false', () => {
    const liens = [lien('oq-1', 'iq-1')]
    expect(aLienVersTypeSection('oq-1', 'contexte_procede', liens, sections)).toBe(false)
  })

  test('aucun lien du tout : false', () => {
    expect(aLienVersTypeSection('oq-1', 'contexte_procede', [], sections)).toBe(false)
  })

  test('un lien vers une section existante mais du mauvais type ne compte pas', () => {
    const liens = [lien('oq-1', 'metro-1')]
    expect(aLienVersTypeSection('oq-1', 'contexte_procede', liens, sections)).toBe(false)
  })

  test('plusieurs liens, un seul pertinent : true', () => {
    const liens = [lien('oq-1', 'iq-1'), lien('oq-1', 'ctx-1'), lien('metro-1', 'iq-1')]
    expect(aLienVersTypeSection('oq-1', 'contexte_procede', liens, sections)).toBe(true)
  })
})

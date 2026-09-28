import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { libelleErreurServeur } from './libellesErreurServeur'

describe('libelleErreurServeur (audit m3)', () => {
  test('phrase française suivie du code entre parenthèses', () => {
    expect(libelleErreurServeur('non_authentifie')).toBe(
      'votre session a expiré, reconnectez-vous (non_authentifie)',
    )
    expect(libelleErreurServeur('code_inconnu')).toBe('code_inconnu')
  })

  test('chaque code d’erreur émis par le Worker a un libellé', () => {
    const racine = resolve(__dirname, '../../../workers/auth-worker/src')
    const sources = ['routeur.ts', 'integriteSection.ts', 'verdictsEvaluation.ts']
      .map((f) => readFileSync(resolve(racine, f), 'utf8'))
      .join('\n')
    const codes = new Set<string>()
    for (const m of sources.matchAll(/erreur: '([a-z_]+)'/g)) codes.add(m[1] ?? '')
    for (const m of sources.matchAll(/return '([a-z_]+)'/g)) codes.add(m[1] ?? '')
    // `positif`/`negatif` : conclusions de questionnaire, pas des erreurs.
    codes.delete('positif')
    codes.delete('negatif')
    const sansLibelle = [...codes].filter((c) => libelleErreurServeur(c) === c)
    expect(sansLibelle).toEqual([])
  })
})

import { describe, expect, test } from 'vitest'
import { genererSel, hacherMotDePasse, verifierMotDePasse } from './verrouLocal'

describe('verrouLocal', () => {
  test('un mot de passe correct est vérifié avec succès', async () => {
    const sel = genererSel()
    const hash = await hacherMotDePasse('MonMotDePasse!42', sel)
    expect(await verifierMotDePasse('MonMotDePasse!42', sel, hash)).toBe(true)
  })

  test('un mot de passe incorrect est rejeté', async () => {
    const sel = genererSel()
    const hash = await hacherMotDePasse('MonMotDePasse!42', sel)
    expect(await verifierMotDePasse('mauvais-mot-de-passe', sel, hash)).toBe(false)
  })

  test('le mot de passe en clair ne figure jamais dans le hachage stocké', async () => {
    const sel = genererSel()
    const hash = await hacherMotDePasse('MonMotDePasse!42', sel)
    expect(hash).not.toContain('MonMotDePasse')
  })

  test('deux sels générés successivement sont distincts (jamais réutilisés)', () => {
    expect(genererSel()).not.toBe(genererSel())
  })

  test('le même mot de passe avec deux sels différents produit deux hachages différents', async () => {
    const hash1 = await hacherMotDePasse('MonMotDePasse!42', genererSel())
    const hash2 = await hacherMotDePasse('MonMotDePasse!42', genererSel())
    expect(hash1).not.toBe(hash2)
  })
})

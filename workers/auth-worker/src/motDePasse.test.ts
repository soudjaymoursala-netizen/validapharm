import { describe, expect, test } from 'vitest'
import { genererSel, hacherMotDePasse, verifierMotDePasse } from './motDePasse'

describe('motDePasse — PBKDF2-SHA-256', () => {
  test('genererSel produit un sel hexadécimal de 32 caractères (16 octets), jamais identique deux fois', () => {
    const sel1 = genererSel()
    const sel2 = genererSel()
    expect(sel1).toMatch(/^[0-9a-f]{32}$/)
    expect(sel1).not.toBe(sel2)
  })

  test('hacherMotDePasse est déterministe pour un même sel, différent pour un sel différent', async () => {
    const sel = genererSel()
    const hash1 = await hacherMotDePasse('CoffreFort!2026', sel)
    const hash2 = await hacherMotDePasse('CoffreFort!2026', sel)
    expect(hash1).toBe(hash2)

    const autreSel = genererSel()
    const hash3 = await hacherMotDePasse('CoffreFort!2026', autreSel)
    expect(hash3).not.toBe(hash1)
  })

  test('verifierMotDePasse accepte le bon mot de passe, refuse un mauvais', async () => {
    const sel = genererSel()
    const hash = await hacherMotDePasse('CoffreFort!2026', sel)
    expect(await verifierMotDePasse('CoffreFort!2026', sel, hash)).toBe(true)
    expect(await verifierMotDePasse('mauvais', sel, hash)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { router } from './index'

describe('titres de route (audit UX entrée #6)', () => {
  it('chaque route nommée porte un titre lisible pour l’onglet', () => {
    const sansTitre = router
      .getRoutes()
      .filter((r) => typeof r.name === 'string' && typeof r.meta.titre !== 'string')
      .map((r) => String(r.name))
    expect(sansTitre).toEqual([])
  })
})

import { describe, expect, test } from 'vitest'
import { peutModifierProjet } from './permissionsProjet'

describe('peutModifierProjet', () => {
  test('le propriétaire peut toujours modifier', () => {
    expect(peutModifierProjet({ owner_id: 'alice@ex.com', shared_with: [] }, 'alice@ex.com')).toBe(
      true,
    )
  })

  test("un utilisateur avec accès 'édition' peut modifier", () => {
    expect(
      peutModifierProjet(
        {
          owner_id: 'alice@ex.com',
          shared_with: [{ user_id: 'bob@ex.com', access_level: 'édition' }],
        },
        'bob@ex.com',
      ),
    ).toBe(true)
  })

  test("un utilisateur avec accès 'lecture' seule ne peut pas modifier", () => {
    expect(
      peutModifierProjet(
        {
          owner_id: 'alice@ex.com',
          shared_with: [{ user_id: 'bob@ex.com', access_level: 'lecture' }],
        },
        'bob@ex.com',
      ),
    ).toBe(false)
  })

  test('un utilisateur ni propriétaire ni partagé ne peut pas modifier', () => {
    expect(
      peutModifierProjet({ owner_id: 'alice@ex.com', shared_with: [] }, 'inconnu@ex.com'),
    ).toBe(false)
  })
})

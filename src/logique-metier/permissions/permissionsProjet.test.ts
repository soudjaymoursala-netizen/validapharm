import { describe, expect, test } from 'vitest'
import { peutModifierProjet, peutVoirProjet } from './permissionsProjet'

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

describe('peutVoirProjet', () => {
  test('le propriétaire peut toujours voir', () => {
    expect(peutVoirProjet({ owner_id: 'alice@ex.com', shared_with: [] }, 'alice@ex.com')).toBe(true)
  })

  test("un utilisateur partagé peut voir, même avec un accès 'lecture' seule", () => {
    expect(
      peutVoirProjet(
        {
          owner_id: 'alice@ex.com',
          shared_with: [{ user_id: 'bob@ex.com', access_level: 'lecture' }],
        },
        'bob@ex.com',
      ),
    ).toBe(true)
  })

  test('un utilisateur ni propriétaire ni partagé ne peut pas voir', () => {
    expect(peutVoirProjet({ owner_id: 'alice@ex.com', shared_with: [] }, 'inconnu@ex.com')).toBe(
      false,
    )
  })
})

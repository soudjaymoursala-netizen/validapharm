import { describe, expect, test } from 'vitest'
import {
  peutGererPartageProjet,
  peutModifierProjet,
  peutModifierSection,
  peutVoirProjet,
} from './permissionsProjet'

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

describe('peutGererPartageProjet — créateur et admin uniquement', () => {
  const projet = { owner_id: 'alice@ex.com' }

  test('le créateur gère le partage', () => {
    expect(peutGererPartageProjet(projet, 'alice@ex.com', false)).toBe(true)
  })

  test('un admin gère le partage', () => {
    expect(peutGererPartageProjet(projet, 'admin@ex.com', true)).toBe(true)
  })

  test('une personne partagée en édition ne gère jamais le partage', () => {
    expect(peutGererPartageProjet(projet, 'bob@ex.com', false)).toBe(false)
  })
})

describe('peutModifierSection', () => {
  const projet = {
    owner_id: 'alice@ex.com',
    shared_with: [{ user_id: 'bob@ex.com', access_level: 'édition' as const }],
  }
  const section = { owner_id: 'alice@ex.com', shared_with: [] }

  test('partagé en édition sur le projet -> peut modifier la section', () => {
    expect(peutModifierSection(projet, section, 'bob@ex.com', false)).toBe(true)
  })

  test('simple lecteur -> ne peut pas', () => {
    expect(peutModifierSection(projet, section, 'carol@ex.com', false)).toBe(false)
  })

  test('admin -> peut toujours', () => {
    expect(peutModifierSection(undefined, section, 'root@ex.com', true)).toBe(true)
  })
})

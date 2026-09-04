import { describe, expect, test, vi } from 'vitest'
import { signerJwt, verifierJwt } from './jwt'

const SECRET = 'secret-de-test-jamais-en-production'

describe('jwt — HS256 minimal (TD-046)', () => {
  test('un jeton signé se vérifie avec le même secret et porte le bon payload', async () => {
    const jeton = await signerJwt({ sub: 'user-1', email: 'q@example.com', role: 'admin' }, SECRET)
    const payload = await verifierJwt(jeton, SECRET)
    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('user-1')
    expect(payload?.email).toBe('q@example.com')
    expect(payload?.role).toBe('admin')
  })

  test('un jeton signé avec un autre secret est rejeté', async () => {
    const jeton = await signerJwt(
      { sub: 'user-1', email: 'q@example.com', role: 'utilisateur' },
      SECRET,
    )
    const payload = await verifierJwt(jeton, 'autre-secret')
    expect(payload).toBeNull()
  })

  test('un jeton altéré (payload modifié après signature) est rejeté', async () => {
    const jeton = await signerJwt(
      { sub: 'user-1', email: 'q@example.com', role: 'utilisateur' },
      SECRET,
    )
    const parties = jeton.split('.')
    const jetonAltere = `${parties[0]}.altere.${parties[2]}`
    expect(await verifierJwt(jetonAltere, SECRET)).toBeNull()
  })

  test('un jeton expiré est rejeté', async () => {
    vi.useFakeTimers()
    const jeton = await signerJwt(
      { sub: 'user-1', email: 'q@example.com', role: 'utilisateur' },
      SECRET,
    )
    vi.advanceTimersByTime(13 * 60 * 60 * 1000) // 13h > durée de validité (12h)
    expect(await verifierJwt(jeton, SECRET)).toBeNull()
    vi.useRealTimers()
  })

  test('un jeton malformé (pas 3 segments) est rejeté sans exception', async () => {
    expect(await verifierJwt('pas-un-jwt', SECRET)).toBeNull()
  })
})

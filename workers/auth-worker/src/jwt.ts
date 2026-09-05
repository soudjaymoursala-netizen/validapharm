/**
 * Jeton de session — implémentation minimale JWT HS256, sans
 * dépendance externe (Web Crypto native, même discipline que
 * `motDePasse.ts`/`verrouLocal.ts` — "ne pas installer une librairie
 * généraliste quand le besoin réel est étroit et vérifiable").
 *
 * Portée volontairement minimale : signature/expiration seulement, aucune
 * révocation immédiate (limite assumée) — expiration courte
 * (`DUREE_VALIDITE_SECONDES`) comme seule protection dans ce lot.
 */

const DUREE_VALIDITE_SECONDES = 12 * 60 * 60 // 12h

export interface PayloadJwt {
  sub: string // id utilisateur
  email: string
  role: 'admin' | 'utilisateur'
  iat: number
  exp: number
}

function base64UrlEncoder(octets: Uint8Array): string {
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecoder(valeur: string): Uint8Array {
  const normalise = valeur.replace(/-/g, '+').replace(/_/g, '/')
  const complete = normalise.padEnd(normalise.length + ((4 - (normalise.length % 4)) % 4), '=')
  const binaire = atob(complete)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return octets
}

function encoderJson(valeur: unknown): string {
  return base64UrlEncoder(new TextEncoder().encode(JSON.stringify(valeur)))
}

async function importerCleHmac(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signerJwt(
  payload: Omit<PayloadJwt, 'iat' | 'exp'>,
  secret: string,
): Promise<string> {
  const maintenant = Math.floor(Date.now() / 1000)
  const payloadComplet: PayloadJwt = {
    ...payload,
    iat: maintenant,
    exp: maintenant + DUREE_VALIDITE_SECONDES,
  }
  const entete = encoderJson({ alg: 'HS256', typ: 'JWT' })
  const corps = encoderJson(payloadComplet)
  const donneesSignees = `${entete}.${corps}`
  const cle = await importerCleHmac(secret)
  const signature = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(donneesSignees))
  return `${donneesSignees}.${base64UrlEncoder(new Uint8Array(signature))}`
}

/** Vérifie la signature et l'expiration — retourne `null` si invalide/expiré. */
export async function verifierJwt(jeton: string, secret: string): Promise<PayloadJwt | null> {
  const parties = jeton.split('.')
  if (parties.length !== 3) return null
  const [entete, corps, signature] = parties as [string, string, string]

  const cle = await importerCleHmac(secret)
  const signatureValide = await crypto.subtle.verify(
    'HMAC',
    cle,
    base64UrlDecoder(signature) as BufferSource,
    new TextEncoder().encode(`${entete}.${corps}`),
  )
  if (!signatureValide) return null

  let payload: PayloadJwt
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecoder(corps)))
  } catch {
    return null
  }

  const maintenant = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp < maintenant) return null

  return payload
}

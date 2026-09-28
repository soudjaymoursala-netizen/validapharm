/**
 * Hachage de mot de passe — mêmes paramètres que
 * `src/logique-metier/securite/verrouLocal.ts` (PBKDF2-SHA-256,
 * 100 000 itérations, sel aléatoire, Web Crypto native) pour rester
 * cohérent avec le reste du projet, mais dupliqué ici : ce Worker est un
 * déploiement indépendant (comme `workers/ocr-relay/`), jamais couplé au
 * bundle de la PWA. Différence de fond avec `verrouLocal.ts` : ce module
 * s'exécute **côté serveur**, ce qui lui donne une vraie valeur probante —
 * `verrouLocal.ts` reste explicitement documenté comme n'en ayant aucune
 * (hash inspectable côté navigateur).
 */

const ITERATIONS_PBKDF2 = 100_000
const LONGUEUR_SEL_OCTETS = 16
const LONGUEUR_HASH_BITS = 256

function octetsVersHex(octets: Uint8Array): string {
  return Array.from(octets)
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')
}

function hexVersOctets(hex: string): Uint8Array {
  const octets = new Uint8Array(hex.length / 2)
  for (let i = 0; i < octets.length; i++) {
    octets[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return octets
}

export function genererSel(): string {
  return octetsVersHex(crypto.getRandomValues(new Uint8Array(LONGUEUR_SEL_OCTETS)))
}

export async function hacherMotDePasse(motDePasse: string, selHex: string): Promise<string> {
  const encoder = new TextEncoder()
  const cleBase = await crypto.subtle.importKey(
    'raw',
    encoder.encode(motDePasse),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexVersOctets(selHex) as BufferSource,
      iterations: ITERATIONS_PBKDF2,
      hash: 'SHA-256',
    },
    cleBase,
    LONGUEUR_HASH_BITS,
  )
  return octetsVersHex(new Uint8Array(bits))
}

export async function verifierMotDePasse(
  motDePasse: string,
  selHex: string,
  hashAttendu: string,
): Promise<boolean> {
  const hashCalcule = await hacherMotDePasse(motDePasse, selHex)
  return chainesEgalesTempsConstant(hashCalcule, hashAttendu)
}

/**
 * Égalité de deux secrets sans fuite par le temps de réponse (audit
 * sécurité a3 : le jeton d'initialisation était comparé avec `!==`, qui
 * s'arrête au premier caractère différent). Les deux valeurs sont d'abord
 * condensées (SHA-256, longueur fixe), puis comparées octet par octet sans
 * sortie anticipée.
 */
export async function chainesEgalesTempsConstant(a: string, b: string): Promise<boolean> {
  const encodeur = new TextEncoder()
  const [ea, eb] = await Promise.all([
    crypto.subtle.digest('SHA-256', encodeur.encode(a)),
    crypto.subtle.digest('SHA-256', encodeur.encode(b)),
  ])
  const va = new Uint8Array(ea)
  const vb = new Uint8Array(eb)
  let difference = 0
  for (let i = 0; i < va.length; i++) difference |= (va[i] ?? 0) ^ (vb[i] ?? 0)
  return difference === 0
}

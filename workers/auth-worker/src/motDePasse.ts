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
  return hashCalcule === hashAttendu
}

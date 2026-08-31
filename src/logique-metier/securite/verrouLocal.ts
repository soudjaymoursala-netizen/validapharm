/**
 * Verrou local par mot de passe (§4.31/URS-F-310, TD-033) — **pas** un
 * mécanisme d'authentification ni une signature électronique. Le mot de
 * passe est haché (PBKDF2-SHA-256, 100 000 itérations, sel aléatoire) et
 * stocké/vérifié uniquement côté client (aucun backend, Web Crypto API) :
 * cela protège contre une suppression accidentelle ou un geste impulsif
 * sur un poste partagé, **pas** contre un attaquant déterminé ayant accès
 * au navigateur (le hachage est inspectable via IndexedDB/DevTools comme
 * toute donnée locale).
 *
 * Dérogation explicite et documentée au principe "jamais de mot de passe"
 * du cadrage §5 — voir TD-033 (`docs/convergence/TECHNICAL_DECISIONS.md`)
 * et TD-011 (RBAC/signature électronique de façade interdite) : ce verrou
 * n'est jamais présenté dans l'UI ou l'export comme une authentification,
 * une session, ou une preuve de conformité 21 CFR Part 11/Annexe 11.
 *
 * @requirement URS-F-310, TD-033
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

/** Génère un sel aléatoire (hexadécimal) — un par profil, jamais réutilisé. */
export function genererSel(): string {
  return octetsVersHex(crypto.getRandomValues(new Uint8Array(LONGUEUR_SEL_OCTETS)))
}

/** Dérive le hachage PBKDF2-SHA-256 d'un mot de passe avec le sel fourni. */
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

/** Compare un mot de passe saisi au hachage stocké — jamais une comparaison en clair. */
export async function verifierMotDePasse(
  motDePasse: string,
  selHex: string,
  hashAttendu: string,
): Promise<boolean> {
  const hashCalcule = await hacherMotDePasse(motDePasse, selHex)
  return hashCalcule === hashAttendu
}

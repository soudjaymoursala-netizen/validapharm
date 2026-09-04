/**
 * Compare deux identifiants de version sémantique `major.minor.patch`.
 *
 * @param a Première version (ex. "1.2.0").
 * @param b Seconde version.
 * @returns -1 si a < b, 0 si a = b, 1 si a > b.
 *
 * Une comparaison naïve de chaînes ("2.10.0" < "2.9.0") serait incorrecte —
 * chaque segment doit être comparé numériquement.
 */
export function comparerVersions(a: string, b: string): -1 | 0 | 1 {
  const [majorA, minorA, patchA] = decouperVersion(a)
  const [majorB, minorB, patchB] = decouperVersion(b)

  if (majorA !== majorB) return majorA < majorB ? -1 : 1
  if (minorA !== minorB) return minorA < minorB ? -1 : 1
  if (patchA !== patchB) return patchA < patchB ? -1 : 1
  return 0
}

function decouperVersion(version: string): [number, number, number] {
  const segments = version.split('.').map((segment) => Number.parseInt(segment, 10))
  const [major, minor, patch] = segments
  if (
    segments.length !== 3 ||
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    Number.isNaN(major) ||
    Number.isNaN(minor) ||
    Number.isNaN(patch)
  ) {
    throw new Error(`Version sémantique invalide : "${version}" (attendu "major.minor.patch")`)
  }
  return [major, minor, patch]
}

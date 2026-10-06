/**
 * Accord singulier/pluriel en français (0 et 1 prennent le singulier) —
 * remplace les « (s) » des libellés (audit UX entrée #24).
 * `pluriel(2, 'projet actif', 'projets actifs')` → « 2 projets actifs ».
 */
export function pluriel(n: number, singulier: string, pluriel: string): string {
  return `${n} ${n < 2 ? singulier : pluriel}`
}

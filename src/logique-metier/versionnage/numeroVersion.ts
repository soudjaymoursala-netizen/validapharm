/**
 * Extrait le numéro d'une version au format `vN` (convention `MethodProfile*`).
 * Utilisé pour trier les versions
 * par récence : `created_at` seul n'est pas fiable pour ce tri (deux
 * versions créées dans la même milliseconde produisent le même timestamp
 * ISO — bug trouvé le 25/08/2026), alors que le numéro de version
 * est strictement croissant et unique par construction (`prochaineVersion`).
 */
export function numeroVersion(version: string): number {
  const nombre = Number.parseInt(version.replace(/^v/, ''), 10)
  return Number.isNaN(nombre) ? 0 : nombre
}

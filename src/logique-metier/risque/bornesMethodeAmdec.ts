/**
 * Bornes d'une méthode AMDEC (audit d'intégrité M10) — même règle que le
 * Worker (`refusBornesAmdec`, `workers/auth-worker/src/verdictsEvaluation.ts`) :
 * entiers, échelle qui commence à 1 au moins, seuil atteignable et non
 * trivial (`min³ < seuil ≤ max³`). Un seuil de 200 sur une échelle 1-5
 * (IPR maximal 125) rendait toute ligne « acceptable ».
 *
 * Renvoie un message lisible, ou `null` si la méthode est acceptable.
 */
export function messageBornesAmdec(
  echelleMin: number,
  echelleMax: number,
  seuilAction: number,
): string | null {
  if (![echelleMin, echelleMax, seuilAction].every(Number.isInteger)) {
    return "L'échelle et le seuil doivent être des nombres entiers."
  }
  if (echelleMin < 1) return "L'échelle minimale doit valoir au moins 1."
  if (echelleMax <= echelleMin) {
    return "L'échelle minimale doit être strictement inférieure à l'échelle maximale — sinon aucune note ne serait jamais dans l'échelle et aucun IPR ne pourrait être calculé."
  }
  const iprMin = echelleMin ** 3
  const iprMax = echelleMax ** 3
  if (seuilAction <= iprMin || seuilAction > iprMax) {
    return `Le seuil d'action doit être compris entre ${iprMin + 1} et ${iprMax} (IPR possibles avec cette échelle) — sinon toutes les lignes auraient le même verdict.`
  }
  return null
}

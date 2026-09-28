/**
 * Date lisible en français (audit m3) : `created_at.slice(0, 10)` affichait
 * la date UTC au format ISO (« 2026-09-25 »), décalée d'un jour la nuit en
 * France. Une date seule (« 2026-09-25 », sans heure) est lue telle quelle,
 * jamais décalée par le fuseau.
 */
export function formaterDateFr(valeur: string | null | undefined): string {
  if (!valeur) return ''
  const dateSeule = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur)
  if (dateSeule) return `${dateSeule[3]}/${dateSeule[2]}/${dateSeule[1]}`
  const date = new Date(valeur)
  return Number.isNaN(date.getTime()) ? valeur : date.toLocaleDateString('fr-FR')
}

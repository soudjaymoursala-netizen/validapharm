/**
 * Correspondance de recherche — sous-chaîne insensible à la casse sur un ou
 * plusieurs champs, jamais une recherche floue/à score : cohérent avec le
 * reste de l'application ("le volume par installation reste modeste,
 * filtrage client-side comme le reste"), aucune dépendance d'indexation
 * plein texte n'est nécessaire à ce stade.
 */
export function correspondPourRecherche(
  requete: string,
  ...champs: Array<string | null | undefined>
): boolean {
  const q = requete.trim().toLowerCase()
  if (q.length === 0) return false
  return champs.some((champ) => (champ ?? '').toLowerCase().includes(q))
}

import { listerTousLesGabarits } from '../gabarits/catalogue'
import type { TemplateType } from '../domaine/types'

/**
 * Bibliothèque de normes (§4.5, Phase 34, URS-F-040) — agrégation
 * déterministe des `normes_associees` déjà portées par chaque gabarit du
 * catalogue (FDS §4) : aucune norme n'est saisie ou dupliquée ici, cette
 * fonction ne fait qu'indexer ce qui existe déjà pour permettre la
 * recherche par mot-clé exigée par l'URS.
 *
 * @requirement URS-F-040, FS §4.5
 */
export interface NormeReferencee {
  norme: string
  gabarits: TemplateType[]
}

function normaliserPourRecherche(texte: string): string {
  return texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Toutes les normes du catalogue, une entrée par norme distincte, triée alphabétiquement. */
export function listerNormesCatalogue(): NormeReferencee[] {
  const parNorme = new Map<string, Set<TemplateType>>()

  for (const gabarit of listerTousLesGabarits()) {
    for (const norme of gabarit.normes_associees) {
      const gabaritsExistants = parNorme.get(norme) ?? new Set<TemplateType>()
      gabaritsExistants.add(gabarit.template_id)
      parNorme.set(norme, gabaritsExistants)
    }
  }

  return [...parNorme.entries()]
    .map(([norme, gabarits]) => ({ norme, gabarits: [...gabarits].sort() }))
    .sort((a, b) => a.norme.localeCompare(b.norme))
}

/** Recherche par mot-clé (insensible à la casse et aux accents) sur le nom de la norme — chaîne vide retourne le catalogue complet. */
export function rechercherNormes(motCle: string): NormeReferencee[] {
  const toutes = listerNormesCatalogue()
  const motCleNormalise = normaliserPourRecherche(motCle.trim())
  if (motCleNormalise.length === 0) return toutes
  return toutes.filter((entree) => normaliserPourRecherche(entree.norme).includes(motCleNormalise))
}

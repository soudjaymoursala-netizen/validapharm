import type { LienProjet, TemplateType } from '../domaine/types'

export interface SectionMinimale {
  id: string
  template_type: TemplateType
}

/**
 * Détermine si une section possède au moins un lien (`project.links[]`),
 * dans un sens ou dans l'autre, vers une section du projet dont le
 * gabarit est `typeCible`.
 *
 * @requirement Détection de liens manquants, utilisé par les
 * garde-fous de finalisation (gardesFinalisation.ts)
 *
 * Un lien (`project.links[]`) est créé par sélection explicite
 * source + cible, sans direction canonique imposée par le
 * modèle — pour la question posée ici ("cette section est-elle liée à une
 * section Contexte procédé/Métrologie/Maintenance ?"), les deux sens
 * comptent : ce qui importe est l'existence du lien, pas qui l'a créé en
 * premier.
 */
export function aLienVersTypeSection(
  sectionId: string,
  typeCible: TemplateType,
  liens: readonly LienProjet[],
  sectionsDuProjet: readonly SectionMinimale[],
): boolean {
  const idsSectionsCibles = new Set(
    sectionsDuProjet
      .filter((section) => section.template_type === typeCible)
      .map((section) => section.id),
  )

  return liens.some(
    (lien) =>
      (lien.from_section_id === sectionId && idsSectionsCibles.has(lien.to_section_id)) ||
      (lien.to_section_id === sectionId && idsSectionsCibles.has(lien.from_section_id)),
  )
}

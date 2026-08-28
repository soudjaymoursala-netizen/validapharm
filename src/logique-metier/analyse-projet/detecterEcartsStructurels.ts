import type { LienProjet, TemplateType } from '../domaine/types'

/**
 * Analyse de documents et challenge de dossier (§4.8, Phase 34, TD-032) —
 * détection **déterministe** des écarts structurels d'un projet, jamais un
 * appel IA. Répond à la partie d'URS-F-082 réellement grounded dans le
 * modèle de données existant : une section "exigence URS" (gabarit `urs`)
 * sans aucun lien (`project.links[]`) vers une autre section du projet est
 * un signal structurel objectif — rien ne trace/couvre cette exigence.
 *
 * **Garde-fou non négociable (URS-F-083)** : ce module ne produit jamais de
 * verdict de conformité ("conforme"/"non conforme") — chaque `EcartStructurel`
 * est un **constat**, jamais un jugement final attribué à l'outil. Le champ
 * `message` est rédigé en conséquence ; ne jamais l'employer pour afficher
 * un texte qui suggérerait une conclusion de conformité tranchée.
 *
 * **Limite assumée** : la seconde moitié d'URS-F-082 ("document attendu
 * absent de la section Documents") N'EST PAS implémentée dans ce lot —
 * aucune règle réelle et sourcée n'existe à ce jour pour décider quel type
 * de document est "attendu" pour quel gabarit (même discipline que les
 * `MethodProfile` déjà établis : jamais une règle universelle fixée sans
 * grounding client réel). Resterait une fabrication si codée en dur ici.
 *
 * @requirement URS-F-082 (partiel), URS-F-083
 */

export interface EcartStructurel {
  code: 'section_urs_isolee'
  sectionId: string
  message: string
}

export interface SectionMinimaleAnalyse {
  id: string
  template_type: TemplateType
}

function sectionEstIsolee(sectionId: string, liens: readonly LienProjet[]): boolean {
  return !liens.some(
    (lien) => lien.from_section_id === sectionId || lien.to_section_id === sectionId,
  )
}

export function detecterEcartsStructurels(
  sections: readonly SectionMinimaleAnalyse[],
  liens: readonly LienProjet[],
): EcartStructurel[] {
  return sections
    .filter((section) => section.template_type === 'urs' && sectionEstIsolee(section.id, liens))
    .map((section) => ({
      code: 'section_urs_isolee',
      sectionId: section.id,
      message:
        "Constat : cette exigence URS n'est reliée à aucune autre section du projet — à vérifier (aucun test, aucune preuve, aucune section de conception ne la référence).",
    }))
}

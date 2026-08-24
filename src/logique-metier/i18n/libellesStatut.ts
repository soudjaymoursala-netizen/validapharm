import type { Langue, StatutSection } from '../domaine/types'

/**
 * Libellés de statut de section (FS §4.2) — jamais le nom technique brut
 * de l'enum affiché tel quel à l'utilisateur.
 *
 * @requirement URS-F-011bis, mitige AR-R-14
 *
 * **Garde-fou non négociable** : `valide_en_interne` DOIT toujours
 * afficher le rappel "pas une signature électronique opposable", **à
 * l'écran ET sur les exports, jamais raccourci** (FS §4.2/§4.3) — jamais
 * seulement "Validé en interne" seul, qui laisserait croire à tort à une
 * validation réglementaire opposable.
 *
 * Vit dans `logique-metier/` (pas `presentation/i18n/`) parce que
 * `genererExportWord.ts` (pur, sans dépendance Vue) en a besoin pour
 * produire ce même libellé sur les exports — `logique-metier` ne peut
 * jamais importer depuis `presentation` (règle de couches,
 * 08-conventions-codage.md §4). Réexporté depuis
 * `presentation/i18n/messages.ts` pour les écrans.
 */
export const libellesStatut = {
  brouillon_aide: {
    fr: 'Brouillon (aide à la rédaction)',
    en: 'Draft (writing aid)',
    de: 'Entwurf (Schreibhilfe)',
  },
  propose_par_ia_non_valide: {
    fr: "Proposé par l'IA — non validé",
    en: 'AI-proposed — not validated',
    de: 'KI-Vorschlag — nicht validiert',
  },
  en_verification: { fr: 'En vérification', en: 'Under review', de: 'In Prüfung' },
  en_approbation: { fr: 'En approbation', en: 'Under approval', de: 'In Genehmigung' },
  valide_en_interne: {
    fr: 'Validé en interne — pas une signature électronique opposable',
    en: 'Internally validated — not a legally binding electronic signature',
    de: 'Intern validiert — keine rechtsverbindliche elektronische Signatur',
  },
} as const satisfies Record<StatutSection, Record<Langue, string>>

export function libelleStatut(statut: StatutSection, langue: Langue): string {
  return libellesStatut[statut][langue]
}

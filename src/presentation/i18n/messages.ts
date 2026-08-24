import type { Langue } from '../../logique-metier/domaine/types'

/**
 * Dictionnaire de messages système (FDS §7, "garde-fous non négociables"),
 * multilingue dès Phase 1 (URS-NF-040/040bis) — jamais codé en dur dans une
 * seule langue.
 *
 * @requirement FDS §7, URS-NF-040/040bis
 *
 * Seuls les codes déjà mobilisés par un écran construit à ce stade sont
 * transcrits (U-01/U-02/U-03/U-12) — les autres (U-04 à U-11, export/chat
 * IA/Structure Système/QMS) seront ajoutés avec chaque module correspondant
 * plutôt que traduits par avance sans écran pour les vérifier à l'usage.
 *
 * **Traductions EN/DE non relues par un locuteur natif du domaine
 * réglementaire** — traduction directe depuis le texte français source de
 * la FDS, à faire valider avant toute mise en production (particulièrement
 * la terminologie GxP allemande, plus sensible à une erreur de sens qu'un
 * texte général).
 */
export const messagesSysteme = {
  'U-01': {
    fr: 'Cette section ne peut être finalisée sans lien vers une section Contexte procédé de ce projet.',
    en: 'This section cannot be finalized without a link to a Process Context section of this project.',
    de: 'Dieser Abschnitt kann nicht abgeschlossen werden ohne Verknüpfung zu einem Abschnitt "Prozesskontext" dieses Projekts.',
  },
  'U-02': {
    fr: 'Cette section IQ ne peut être finalisée sans lien vers un Plan de métrologie/étalonnage de ce projet.',
    en: 'This IQ section cannot be finalized without a link to a Metrology/Calibration Plan of this project.',
    de: 'Dieser IQ-Abschnitt kann nicht abgeschlossen werden ohne Verknüpfung zu einem Metrologie-/Kalibrierplan dieses Projekts.',
  },
  'U-03': {
    fr: 'Cette section OQ ne peut être clôturée sans lien vers un Plan de maintenance préventive de ce projet.',
    en: 'This OQ section cannot be closed without a link to a Preventive Maintenance Plan of this project.',
    de: 'Dieser OQ-Abschnitt kann nicht geschlossen werden ohne Verknüpfung zu einem vorbeugenden Wartungsplan dieses Projekts.',
  },
  'U-12': {
    fr: "Cette version de ValidaPharm ne peut pas ouvrir ces données — elles ont été créées ou migrées avec une version plus récente. Mettez à jour l'application avant de continuer, ou revenez à la version {x} pour les rouvrir.",
    en: 'This version of ValidaPharm cannot open this data — it was created or migrated with a newer version. Update the application before continuing, or revert to version {x} to reopen it.',
    de: 'Diese Version von ValidaPharm kann diese Daten nicht öffnen — sie wurden mit einer neueren Version erstellt oder migriert. Aktualisieren Sie die Anwendung, oder kehren Sie zu Version {x} zurück, um sie erneut zu öffnen.',
  },
} as const

export type CodeMessageSysteme = keyof typeof messagesSysteme

/**
 * Résout un message système dans la langue demandée, avec interpolation
 * simple `{cle}` (ex. `{x}` dans U-12).
 */
export function messageSysteme(
  code: CodeMessageSysteme,
  langue: Langue,
  parametres: Record<string, string> = {},
): string {
  const gabarit: string = messagesSysteme[code][langue]
  return Object.entries(parametres).reduce<string>(
    (texte, [cle, valeur]) => texte.replaceAll(`{${cle}}`, valeur),
    gabarit,
  )
}

// Libellés de statut de section (URS-F-011bis) : déplacés dans
// logique-metier/i18n/libellesStatut.ts — genererExportWord.ts (pur, sans
// dépendance Vue) en a besoin lui aussi pour respecter le garde-fou "à
// l'écran ET sur les exports" (FS §4.2/§4.3), et logique-metier ne peut
// jamais importer depuis presentation (règle ESLint de couches). Réexporté
// ici pour ne rien casser côté écrans.
export { libelleStatut, libellesStatut } from '../../logique-metier/i18n/libellesStatut'

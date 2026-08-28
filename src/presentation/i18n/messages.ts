import type { Langue } from '../../logique-metier/domaine/types'

/**
 * Dictionnaire de messages système (FDS §7, "garde-fous non négociables"),
 * multilingue dès Phase 1 (URS-NF-040/040bis) — jamais codé en dur dans une
 * seule langue.
 *
 * @requirement FDS §7, URS-NF-040/040bis
 *
 * Seuls les codes déjà mobilisés par un écran construit à ce stade sont
 * transcrits (U-01/U-02/U-03/U-05/U-06/U-07/U-08/U-12) — les autres (U-04,
 * U-09 à U-11, Structure Système/QMS) seront ajoutés avec chaque module
 * correspondant plutôt que traduits par avance sans écran pour les
 * vérifier à l'usage.
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
  'U-05': {
    fr: 'Ce fournisseur ne peut être activé pour un usage réel : la qualification de fiabilité (échantillon versionné) est requise au préalable.',
    en: 'This provider cannot be activated for real use: reliability qualification (versioned test sample) is required beforehand.',
    de: 'Dieser Anbieter kann nicht für den realen Einsatz aktiviert werden: Eine Zuverlässigkeitsqualifizierung (versioniertes Testmuster) ist vorher erforderlich.',
  },
  'U-06': {
    fr: 'Le contenu de « {titre} » sera transmis à {fournisseur}. Continuer ?',
    en: 'The content of "{titre}" will be sent to {fournisseur}. Continue?',
    de: 'Der Inhalt von „{titre}“ wird an {fournisseur} übermittelt. Fortfahren?',
  },
  'U-07': {
    fr: "Confirmez-vous disposer du droit d'utiliser « {titre} » comme base pour cette génération (propriété intellectuelle / confidentialité, notamment vis-à-vis d'un autre client) ?",
    en: 'Do you confirm you have the right to use "{titre}" as a basis for this generation (intellectual property / confidentiality, particularly regarding another client)?',
    de: 'Bestätigen Sie, dass Sie berechtigt sind, „{titre}“ als Grundlage für diese Generierung zu verwenden (geistiges Eigentum / Vertraulichkeit, insbesondere gegenüber einem anderen Kunden)?',
  },
  'U-08': {
    fr: 'Donnée technique/numérique reprise ou adaptée depuis le document de référence — à vérifier avant validation.',
    en: 'Technical/numeric data taken or adapted from the reference document — to be checked before validation.',
    de: 'Technischer/numerischer Wert, der aus dem Referenzdokument übernommen oder angepasst wurde — vor der Validierung zu prüfen.',
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

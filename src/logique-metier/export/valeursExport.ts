import type { Langue, Section } from '../domaine/types'
import type { ColonneTableau, DefinitionChamp } from '../gabarits/definitionGabarit'

/**
 * Mise en forme des valeurs destinées à un livrable exporté (Word, CSV) —
 * audit UX du 25/09/2026 (constats 8 et 9) : les exports contenaient les
 * codes internes des listes (`non_fonctionnelle`, `must`) au lieu de leurs
 * libellés, des dates ISO et des fichiers nommés par identifiant.
 *
 * Fonctions pures, partagées par tous les générateurs : l'écran, le Word
 * et le CSV montrent toujours la même chose.
 */

type ChampScalaire = Exclude<DefinitionChamp, { type: 'tableau_dynamique' }> | ColonneTableau

const LOCALES: Record<Langue, string> = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE' }

/** Libellé lisible d'une valeur de champ : option traduite, date et nombre au format de la langue. */
export function valeurLisible(
  champ: ChampScalaire,
  valeur: string | number | null | undefined,
  langue: Langue,
): string {
  if (valeur === null || valeur === undefined || valeur === '') return ''
  switch (champ.type) {
    case 'liste': {
      const option = champ.options.find((o) => o.valeur === String(valeur))
      return option ? (option.labels[langue] ?? option.labels.fr) : String(valeur)
    }
    case 'date':
      return dateLisible(String(valeur), langue)
    case 'nombre': {
      const nombre = typeof valeur === 'number' ? valeur : Number(String(valeur).replace(',', '.'))
      return Number.isFinite(nombre)
        ? nombre.toLocaleString(LOCALES[langue], { maximumFractionDigits: 6, useGrouping: false })
        : String(valeur)
    }
    default:
      return String(valeur)
  }
}

/** `2026-09-29` → `29/09/2026` (fr) ; une valeur qui n'est pas une date reste telle quelle. */
export function dateLisible(valeur: string, langue: Langue): string {
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur)
  if (!correspondance) return valeur
  const [, annee, mois, jour] = correspondance
  if (langue === 'de') return `${jour}.${mois}.${annee}`
  return `${jour}/${mois}/${annee}`
}

/** Horodatage ISO → date et heure lisibles (heure de Paris, celle des équipes qualité utilisatrices). */
export function dateHeureLisible(iso: string, langue: Langue = 'fr'): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(LOCALES[langue], {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  })
}

/**
 * Nom de fichier lisible : `{référence ou type}_{titre}_v{version}.{extension}`
 * (constat 9 : les fichiers portaient l'identifiant technique de la
 * section dès que la référence était vide). Sans accents ni caractères
 * refusés par les systèmes de fichiers.
 */
export function nomFichierExport(
  elements: { prefixe: string; titre: string; version: string; suffixe?: string },
  extension: string,
): string {
  const morceaux = [
    slug(elements.prefixe),
    slug(elements.titre),
    elements.version.trim().length > 0 ? `v${slug(elements.version)}` : '',
    elements.suffixe ? slug(elements.suffixe) : '',
  ].filter((m) => m.length > 0)
  return `${(morceaux.join('_') || 'export').slice(0, 120)}.${extension}`
}

function slug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface RecapitulatifWorkflow {
  redacteurs: string[]
  avis: Array<{ relecteur: string; avis: string; date: string; cycleCourant: boolean }>
  approbateurDesigne: string | null
  /** Approbation effective (entrée d'historique `changement_statut: approuver`), `null` tant qu'elle n'a pas eu lieu. */
  approbation: { par: string; date: string } | null
}

/**
 * Qui a rédigé, relu et approuvé, et quand — lu dans le workflow et
 * l'historique de la section (constat 13 : ces traces disparaissaient de
 * l'écran une fois la section validée ; constat 8 : absentes du Word).
 */
export function recapitulatifWorkflow(
  section: Pick<Section, 'workflow' | 'audit_log' | 'status'>,
): RecapitulatifWorkflow {
  let finDeCycle: string | null = null
  let approbation: RecapitulatifWorkflow['approbation'] = null
  for (const entree of section.audit_log) {
    if (entree.action.startsWith('rejet') || entree.action.startsWith('retour en rédaction')) {
      finDeCycle = entree.timestamp
    }
    if (entree.action.startsWith('changement_statut: approuver')) {
      approbation = { par: entree.actor, date: entree.timestamp }
    }
  }
  return {
    redacteurs: section.workflow.authors,
    avis: section.workflow.reviewers.map((r) => ({
      relecteur: r.user_id,
      avis: r.avis,
      date: r.date,
      cycleCourant: finDeCycle === null || r.date > finDeCycle,
    })),
    approbateurDesigne: section.workflow.approver_final,
    approbation: section.status === 'valide_en_interne' ? approbation : null,
  }
}

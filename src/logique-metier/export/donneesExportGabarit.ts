import type { Langue, Section } from '../domaine/types'
import type { DefinitionGabarit } from '../gabarits/definitionGabarit'
import { evaluerColonneCalculee } from '../gabarits/evaluerColonneCalculee'
import { libelleStatut } from '../i18n/libellesStatut'
import { dateHeureLisible, recapitulatifWorkflow, valeurLisible } from './valeursExport'

/**
 * Données d'export construites une seule fois et consommées par **tous**
 * les générateurs de document (HTML/`.doc`, `.docx` OOXML réel via un
 * gabarit client) — jamais reconstruites séparément par
 * chaque renderer. C'est ce partage qui garantit par construction
 * l'équivalence de contenu exigée entre gabarit par défaut et gabarit
 * personnalisé : les deux renderers reçoivent exactement les
 * mêmes valeurs, seule la mise en forme differe.
 *
 * Toutes les chaînes sont **brutes, non échappées** — l'échappement (HTML
 * ou XML) est une responsabilité du renderer, jamais de cette fonction.
 */
export interface DonneesExportGabaritChamp {
  libelle: string
  valeur: string
}

/** `lignes`/`entetes` déjà aplaties en texte (une ligne par cellule jointe) — la fidélité structurelle complète d'un tableau dynamique reste portée par son export CSV dédié, inchangé. */
export interface DonneesExportGabaritTableau {
  libelle: string
  entetes: string
  lignes: string[]
  /** Même contenu, cellule par cellule — pour les générateurs qui produisent un vrai tableau. */
  colonnes: string[]
  cellules: string[][]
}

export interface DonneesExportGabaritSection {
  titre: string
  champs: DonneesExportGabaritChamp[]
  tableaux: DonneesExportGabaritTableau[]
}

export interface DonneesExportGabarit {
  titre: string
  reference: string
  version: string
  statut: string
  responsabilite_transferee: boolean
  redacteurs: string
  approbateur_final: string
  /** Non vide seulement si aucune `DefinitionGabarit` n'existe pour ce `template_type` (repli déjà appliqué à l'écran, `EditeurSection.vue`). */
  contenu_generique: string | null
  sections: DonneesExportGabaritSection[]
  historique_revisions: Array<{ version: string; date: string; auteur: string; motif: string }>
  /** Avis de relecture, du plus ancien au plus récent ; `cycle` précise s'il porte sur le contenu actuel. */
  avis_relecture: Array<{ relecteur: string; avis: string; date: string; cycle: string }>
  /** Personne et date de l'approbation effective ; vides tant que la section n'est pas validée. */
  approuve_par: string
  date_approbation: string
}

export function construireDonneesExportGabarit(
  section: Section,
  definition: DefinitionGabarit | undefined,
  langue: Langue,
): DonneesExportGabarit {
  const recap = recapitulatifWorkflow(section)
  return {
    titre: section.meta.titre,
    reference: section.meta.ref,
    version: section.meta.version,
    statut: libelleStatut(section.status, langue),
    responsabilite_transferee: section.status === 'valide_en_interne',
    redacteurs: section.workflow.authors.join(', ') || '—',
    approbateur_final: section.workflow.approver_final ?? '—',
    contenu_generique:
      definition === undefined
        ? typeof section.values.contenu === 'string'
          ? section.values.contenu
          : ''
        : null,
    sections: definition === undefined ? [] : construireSections(section, definition, langue),
    historique_revisions: section.revisions.map((r) => ({
      version: r.version,
      date: dateHeureLisible(r.date, langue),
      auteur: r.auteur,
      motif: r.motif,
    })),
    avis_relecture: recap.avis.map((a) => ({
      relecteur: a.relecteur,
      avis: a.avis,
      date: dateHeureLisible(a.date, langue),
      cycle: a.cycleCourant ? 'cycle en cours' : 'cycle clos : contenu modifié ou rejeté depuis',
    })),
    approuve_par: recap.approbation?.par ?? '',
    date_approbation: recap.approbation ? dateHeureLisible(recap.approbation.date, langue) : '',
  }
}

function construireSections(
  section: Section,
  definition: DefinitionGabarit,
  langue: Langue,
): DonneesExportGabaritSection[] {
  return definition.sections.map((s) => {
    const champs: DonneesExportGabaritChamp[] = []
    const tableaux: DonneesExportGabaritTableau[] = []
    for (const champ of s.fields) {
      const libelle = champ.labels[langue] ?? champ.labels.fr
      if (champ.type === 'tableau_dynamique') {
        const lignes = (section.tables[champ.field_key] ?? []) as Array<
          Record<string, string | number | null>
        >
        const colonnes = champ.colonnes.map((c) => c.labels[langue] ?? c.labels.fr)
        const cellules = lignes.map((ligne) =>
          champ.colonnes.map((c) => {
            // Colonne calculée (ex. IPR) : jamais persistée
            // (`ligne[c.field_key]` vaut toujours `null`) — recalculée
            // ici comme le fait `RenduGabarit.vue` à l'écran, sinon le
            // livrable exporté affiche une cellule vide là où l'écran
            // montre une valeur (bug réel trouvé en testant un export
            // Word réel : colonne IPR vide dans le document produit).
            const valeur =
              c.type === 'nombre' && c.formule !== undefined
                ? evaluerColonneCalculee(c, champ.colonnes, ligne)
                : ligne[c.field_key]
            return valeurLisible(c, valeur, langue)
          }),
        )
        tableaux.push({
          libelle,
          entetes: colonnes.join(' | '),
          lignes: cellules.map((rangee) => rangee.join(' | ')),
          colonnes,
          cellules,
        })
        continue
      }
      champs.push({
        libelle,
        valeur: valeurLisible(champ, section.values[champ.field_key], langue),
      })
    }
    return { titre: s.labels[langue] ?? s.labels.fr, champs, tableaux }
  })
}

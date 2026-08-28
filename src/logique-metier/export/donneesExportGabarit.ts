import type { Langue, Section } from '../domaine/types'
import type { DefinitionGabarit } from '../gabarits/definitionGabarit'
import { evaluerColonneCalculee } from '../gabarits/evaluerColonneCalculee'
import { libelleStatut } from '../i18n/libellesStatut'

/**
 * Données d'export construites une seule fois et consommées par **tous**
 * les générateurs de document (HTML/`.doc`, `.docx` OOXML réel via un
 * gabarit client — Phase 26, TD-024) — jamais reconstruites séparément par
 * chaque renderer. C'est ce partage qui garantit par construction
 * l'équivalence de contenu exigée entre gabarit par défaut et gabarit
 * personnalisé (URS-F-025) : les deux renderers reçoivent exactement les
 * mêmes valeurs, seule la mise en forme differe.
 *
 * Toutes les chaînes sont **brutes, non échappées** — l'échappement (HTML
 * ou XML) est une responsabilité du renderer, jamais de cette fonction.
 */
export interface DonneesExportGabaritChamp {
  libelle: string
  valeur: string
}

/** `lignes`/`entetes` déjà aplaties en texte (une ligne par cellule jointe) — la fidélité structurelle complète d'un tableau dynamique reste portée par son export CSV dédié (URS-F-021), inchangé. */
export interface DonneesExportGabaritTableau {
  libelle: string
  entetes: string
  lignes: string[]
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
}

export function construireDonneesExportGabarit(
  section: Section,
  definition: DefinitionGabarit | undefined,
  langue: Langue,
): DonneesExportGabarit {
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
      date: r.date,
      auteur: r.auteur,
      motif: r.motif,
    })),
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
        tableaux.push({
          libelle,
          entetes: champ.colonnes.map((c) => c.labels[langue] ?? c.labels.fr).join(' | '),
          lignes: lignes.map((ligne) =>
            champ.colonnes
              .map((c) => {
                // Colonne calculée (ex. IPR, FDS §5) : jamais persistée
                // (`ligne[c.field_key]` vaut toujours `null`) — recalculée
                // ici comme le fait `RenduGabarit.vue` à l'écran, sinon le
                // livrable exporté affiche une cellule vide là où l'écran
                // montre une valeur (bug réel trouvé en testant un export
                // Word réel : colonne IPR vide dans le document produit).
                const valeur =
                  c.type === 'nombre' && c.formule !== undefined
                    ? evaluerColonneCalculee(c, champ.colonnes, ligne)
                    : ligne[c.field_key]
                return String(valeur ?? '')
              })
              .join(' | '),
          ),
        })
        continue
      }
      const valeur = section.values[champ.field_key]
      champs.push({
        libelle,
        valeur: valeur === null || valeur === undefined ? '' : String(valeur),
      })
    }
    return { titre: s.labels[langue] ?? s.labels.fr, champs, tableaux }
  })
}

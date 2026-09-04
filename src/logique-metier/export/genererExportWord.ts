import type { Langue, Section } from '../domaine/types'
import type { DefinitionGabarit } from '../gabarits/definitionGabarit'
import { construireDonneesExportGabarit, type DonneesExportGabarit } from './donneesExportGabarit'

/**
 * Export Word (FS §4.3) — "document HTML structuré encapsulé
 * `.doc` (compatible Microsoft Word)". Technique volontaire et documentée
 * par la spec elle-même : pas un vrai binaire OOXML, un fichier HTML avec
 * les espaces de noms Word ouvert nativement par le filtre d'import HTML
 * de Word quand l'extension est `.doc` — aucune dépendance tierce.
 *
 * @requirement FS §4.3
 *
 * En-tête/statut en toutes lettres/historique de révisions/bloc de rôles
 * (exigés par FS §4.3) + rappel de transfert de responsabilité
 * quand `valide_en_interne` — présent sur l'export au même
 * titre qu'à l'écran, jamais seulement l'un des deux (FS §4.2).
 *
 * Consomme `construireDonneesExportGabarit` (Phase 26, TD-024) — la même
 * fonction que le générateur `.docx` réel au format gabarit client
 * (`connecteurs/office/GenerationDocxAdapter.ts`) : les deux renderers
 * reçoivent exactement les mêmes valeurs, ce qui garantit par construction
 * l'équivalence de contenu exigée entre gabarit par défaut et personnalisé
 * — jamais deux chemins de lecture des données divergents.
 */
export function genererExportWord(
  section: Section,
  definition: DefinitionGabarit | undefined,
  langue: Langue,
): string {
  const donnees = construireDonneesExportGabarit(section, definition, langue)
  const corps =
    donnees.contenu_generique !== null
      ? `<h2>Contenu</h2><p>${echapperHTML(donnees.contenu_generique)}</p>`
      : rendreCorpsGabarit(donnees)

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${echapperHTML(donnees.titre)}</title></head>
<body>
<h1>${echapperHTML(donnees.titre)}</h1>
<p><strong>Référence :</strong> ${echapperHTML(donnees.reference)} — <strong>Version :</strong> ${echapperHTML(donnees.version)}</p>
<p><strong>Statut :</strong> ${echapperHTML(donnees.statut)}</p>
${donnees.responsabilite_transferee ? rendreBandeauResponsabilite() : ''}
<h2>Rôles</h2>
<table border="1" cellpadding="4">
<tr><th>Rôle</th><th>Utilisateur</th></tr>
<tr><td>Rédacteur(s)</td><td>${echapperHTML(donnees.redacteurs)}</td></tr>
<tr><td>Approbateur final</td><td>${echapperHTML(donnees.approbateur_final)}</td></tr>
</table>
${corps}
<h2>Historique des révisions</h2>
${rendreHistoriqueRevisions(donnees)}
</body>
</html>`
}

function rendreBandeauResponsabilite(): string {
  return `<p style="border:1px solid #000;padding:8px"><strong>Responsabilité de conformité et de conservation réglementaire :</strong> transférée au système qualité du client dès la reprise formelle de ce livrable. ValidaPharm n'est jamais le système d'enregistrement officiel.</p>`
}

function rendreHistoriqueRevisions(donnees: DonneesExportGabarit): string {
  if (donnees.historique_revisions.length === 0) return '<p>Aucune révision.</p>'
  const lignes = donnees.historique_revisions
    .map(
      (r) =>
        `<tr><td>${echapperHTML(r.version)}</td><td>${echapperHTML(r.date)}</td><td>${echapperHTML(r.auteur)}</td><td>${echapperHTML(r.motif)}</td></tr>`,
    )
    .join('')
  return `<table border="1" cellpadding="4"><tr><th>Version</th><th>Date</th><th>Auteur</th><th>Motif</th></tr>${lignes}</table>`
}

function rendreCorpsGabarit(donnees: DonneesExportGabarit): string {
  return donnees.sections
    .map((s) => {
      const champs = s.champs
        .map(
          (champ) =>
            `<p><strong>${echapperHTML(champ.libelle)} :</strong> ${echapperHTML(champ.valeur)}</p>`,
        )
        .join('')
      const tableaux = s.tableaux
        .map((tableau) => {
          if (tableau.lignes.length === 0) {
            return `<p><strong>${echapperHTML(tableau.libelle)} :</strong> —</p>`
          }
          const entetes = tableau.entetes
            .split(' | ')
            .map((e) => `<th>${echapperHTML(e)}</th>`)
            .join('')
          const rangees = tableau.lignes
            .map(
              (ligne) =>
                `<tr>${ligne
                  .split(' | ')
                  .map((cellule) => `<td>${echapperHTML(cellule)}</td>`)
                  .join('')}</tr>`,
            )
            .join('')
          return `<p><strong>${echapperHTML(tableau.libelle)}</strong></p><table border="1" cellpadding="4"><tr>${entetes}</tr>${rangees}</table>`
        })
        .join('')
      return `<h2>${echapperHTML(s.titre)}</h2>${champs}${tableaux}`
    })
    .join('')
}

function echapperHTML(texte: string): string {
  return texte
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

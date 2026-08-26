import type { Langue, Section } from '../domaine/types'
import type { DefinitionGabarit } from '../gabarits/definitionGabarit'
import { libelleStatut } from '../i18n/libellesStatut'

/**
 * Export Word (FS §4.3, URS-F-020) — "document HTML structuré encapsulé
 * `.doc` (compatible Microsoft Word)". Technique volontaire et documentée
 * par la spec elle-même : pas un vrai binaire OOXML, un fichier HTML avec
 * les espaces de noms Word ouvert nativement par le filtre d'import HTML
 * de Word quand l'extension est `.doc` — aucune dépendance tierce.
 *
 * @requirement URS-F-020, URS-F-011bis, URS-F-028ter, FS §4.3
 *
 * En-tête/statut en toutes lettres/historique de révisions/bloc de rôles
 * (exigés par FS §4.3) + rappel de transfert de responsabilité
 * (URS-F-028ter) quand `valide_en_interne` — présent sur l'export au même
 * titre qu'à l'écran, jamais seulement l'un des deux (FS §4.2).
 *
 * Corps du document : rendu à partir de la définition du gabarit si elle
 * existe (mêmes champs que RenduGabarit.vue, valeurs uniquement — jamais
 * de logique d'édition ici), sinon repli sur `values.contenu` brut, pour
 * rester cohérent avec le repli déjà appliqué à l'écran (EditeurSection.vue).
 */
export function genererExportWord(
  section: Section,
  definition: DefinitionGabarit | undefined,
  langue: Langue,
): string {
  const corps =
    definition !== undefined
      ? rendreCorpsGabarit(section, definition, langue)
      : rendreCorpsGenerique(section)

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${echapperHTML(section.meta.titre)}</title></head>
<body>
<h1>${echapperHTML(section.meta.titre)}</h1>
<p><strong>Référence :</strong> ${echapperHTML(section.meta.ref)} — <strong>Version :</strong> ${echapperHTML(section.meta.version)}</p>
<p><strong>Statut :</strong> ${echapperHTML(libelleStatut(section.status, langue))}</p>
${section.status === 'valide_en_interne' ? rendreBandeauResponsabilite() : ''}
<h2>Rôles</h2>
<table border="1" cellpadding="4">
<tr><th>Rôle</th><th>Utilisateur</th></tr>
<tr><td>Rédacteur(s)</td><td>${echapperHTML(section.workflow.authors.join(', ') || '—')}</td></tr>
<tr><td>Approbateur final</td><td>${echapperHTML(section.workflow.approver_final ?? '—')}</td></tr>
</table>
${corps}
<h2>Historique des révisions</h2>
${rendreHistoriqueRevisions(section)}
</body>
</html>`
}

function rendreBandeauResponsabilite(): string {
  return `<p style="border:1px solid #000;padding:8px"><strong>Responsabilité de conformité et de conservation réglementaire :</strong> transférée au système qualité du client dès la reprise formelle de ce livrable. ValidaPharm n'est jamais le système d'enregistrement officiel.</p>`
}

function rendreHistoriqueRevisions(section: Section): string {
  if (section.revisions.length === 0) return '<p>Aucune révision.</p>'
  const lignes = section.revisions
    .map(
      (r) =>
        `<tr><td>${echapperHTML(r.version)}</td><td>${echapperHTML(r.date)}</td><td>${echapperHTML(r.auteur)}</td><td>${echapperHTML(r.motif)}</td></tr>`,
    )
    .join('')
  return `<table border="1" cellpadding="4"><tr><th>Version</th><th>Date</th><th>Auteur</th><th>Motif</th></tr>${lignes}</table>`
}

function rendreCorpsGenerique(section: Section): string {
  const contenu = section.values.contenu
  return `<h2>Contenu</h2><p>${echapperHTML(typeof contenu === 'string' ? contenu : '')}</p>`
}

function rendreCorpsGabarit(
  section: Section,
  definition: DefinitionGabarit,
  langue: Langue,
): string {
  return definition.sections
    .map((s) => {
      const champs = s.fields
        .map((champ) => {
          const libelle = champ.labels[langue] ?? champ.labels.fr
          if (champ.type === 'tableau_dynamique') {
            const lignes = (section.tables[champ.field_key] ?? []) as Array<
              Record<string, string | number | null>
            >
            if (lignes.length === 0) return `<p><strong>${echapperHTML(libelle)} :</strong> —</p>`
            const entetes = champ.colonnes
              .map((c) => `<th>${echapperHTML(c.labels[langue] ?? c.labels.fr)}</th>`)
              .join('')
            const rangees = lignes
              .map(
                (ligne) =>
                  `<tr>${champ.colonnes.map((c) => `<td>${echapperHTML(String(ligne[c.field_key] ?? ''))}</td>`).join('')}</tr>`,
              )
              .join('')
            return `<p><strong>${echapperHTML(libelle)}</strong></p><table border="1" cellpadding="4"><tr>${entetes}</tr>${rangees}</table>`
          }
          const valeur = section.values[champ.field_key]
          return `<p><strong>${echapperHTML(libelle)} :</strong> ${echapperHTML(valeur === null || valeur === undefined ? '' : String(valeur))}</p>`
        })
        .join('')
      return `<h2>${echapperHTML(s.labels[langue] ?? s.labels.fr)}</h2>${champs}`
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

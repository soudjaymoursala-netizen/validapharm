import type {
  AssetNode,
  ContextSnapshotItem,
  ManufacturingContext,
  QualityEvent,
} from '../domaine/types'

/**
 * Narratif enrichi d'un `ContextSnapshot` (Phase 27 de convergence
 * architecturale, TD-025) — organise les éléments déjà résolus par
 * `assemblerElementsContextSnapshot` (Phase 14) en facettes narratives
 * (OÙ/QUOI/COMMENT/POURQUOI-IMPACT), au lieu de la simple liste plate
 * d'objets typés existant jusqu'ici (`ContextSnapshotItem[]`, affichée
 * telle quelle dans `MissionWorkspace.vue`).
 *
 * **Aucune nouvelle résolution** : ce module ne lit que ce que
 * `assemblerElementsContextSnapshot` a déjà déterminé pertinent — il
 * réorganise, ne réinterprète jamais quels objets appartiennent au
 * contexte.
 *
 * `comment` (procédure applicable) reste **toujours vide** dans ce lot —
 * `Procedure` (Phase 20) n'a aucun rattachement `AssetNode`/`Workspace` à
 * ce jour (limite déjà documentée, TD-016) ; l'ajouter serait une
 * résolution non éprouvée, jamais fabriquée ici.
 */
export interface FaitNarratif {
  id: string
  texte: string
}

export interface NarratifContexteSnapshot {
  ou: FaitNarratif[]
  quoi: FaitNarratif[]
  comment: FaitNarratif[]
  pourquoiImpact: FaitNarratif[]
}

export interface DonneesNarratifContexte {
  items: readonly ContextSnapshotItem[]
  assetNodes: readonly AssetNode[]
  manufacturingContexts: readonly ManufacturingContext[]
  qualityEvents: readonly QualityEvent[]
}

export function construireNarratifContexte(
  donnees: DonneesNarratifContexte,
): NarratifContexteSnapshot {
  const ou: FaitNarratif[] = []
  const quoi: FaitNarratif[] = []
  const pourquoiImpact: FaitNarratif[] = []

  for (const item of donnees.items) {
    if (item.type_objet === 'asset_node') {
      const noeud = donnees.assetNodes.find((n) => n.id === item.objet_id)
      if (noeud) ou.push({ id: noeud.id, texte: texteNoeud(noeud) })
      continue
    }
    if (item.type_objet === 'manufacturing_context') {
      const contexte = donnees.manufacturingContexts.find((c) => c.id === item.objet_id)
      if (contexte) quoi.push({ id: contexte.id, texte: texteManufacturingContext(contexte) })
      continue
    }
    if (item.type_objet === 'quality_event') {
      const evenement = donnees.qualityEvents.find((e) => e.id === item.objet_id)
      if (evenement) pourquoiImpact.push({ id: evenement.id, texte: texteQualityEvent(evenement) })
    }
  }

  return { ou, quoi, comment: [], pourquoiImpact }
}

function texteNoeud(noeud: AssetNode): string {
  return `${noeud.name} (${noeud.code}) — statut de qualification : ${noeud.qualification_status}`
}

function texteManufacturingContext(contexte: ManufacturingContext): string {
  const details = [
    contexte.recette ? `recette ${contexte.recette}` : null,
    contexte.format ? `format ${contexte.format}` : null,
    contexte.configuration ? `configuration ${contexte.configuration}` : null,
  ].filter((d): d is string => d !== null)
  return `Produit ${contexte.produit}${details.length > 0 ? ` (${details.join(', ')})` : ''}`
}

function texteQualityEvent(evenement: QualityEvent): string {
  return `${evenement.type} "${evenement.titre}" — statut ${evenement.statut} : ${evenement.description}`
}

export function estNarratifVide(narratif: NarratifContexteSnapshot): boolean {
  return (
    narratif.ou.length === 0 &&
    narratif.quoi.length === 0 &&
    narratif.comment.length === 0 &&
    narratif.pourquoiImpact.length === 0
  )
}

/** Texte prêt à injecter dans le prompt du Reasoning Engine ou à afficher à l'écran — sections omises quand vides, jamais un intitulé suivi de rien. */
export function serialiserNarratifContexte(narratif: NarratifContexteSnapshot): string {
  const sections: string[] = []
  if (narratif.ou.length > 0) {
    sections.push(`OÙ (localisation) :\n${narratif.ou.map((f) => `- ${f.texte}`).join('\n')}`)
  }
  if (narratif.quoi.length > 0) {
    sections.push(`QUOI (faits connus) :\n${narratif.quoi.map((f) => `- ${f.texte}`).join('\n')}`)
  }
  if (narratif.comment.length > 0) {
    sections.push(
      `COMMENT (procédure applicable) :\n${narratif.comment.map((f) => `- ${f.texte}`).join('\n')}`,
    )
  }
  if (narratif.pourquoiImpact.length > 0) {
    sections.push(
      `POURQUOI / IMPACT (événements qualité en cours) :\n${narratif.pourquoiImpact.map((f) => `- ${f.texte}`).join('\n')}`,
    )
  }
  return sections.join('\n\n')
}

/** Identifiants des faits du narratif — traités comme obtenus avec la même garantie qu'un appel d'outil (données déterministes déjà résolues), pour la vérification de citation (spec Phase 15 §4). */
export function idsNarratifContexte(narratif: NarratifContexteSnapshot): string[] {
  return [...narratif.ou, ...narratif.quoi, ...narratif.comment, ...narratif.pourquoiImpact].map(
    (f) => f.id,
  )
}

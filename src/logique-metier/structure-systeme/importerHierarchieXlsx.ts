import type { AssetHierarchySchema, AssetNode } from '../domaine/types'

/**
 * Planification pure de l'import d'une hiérarchie d'actifs depuis une
 * grille tabulaire (Phase 36, TD-042, `TECHNICAL_DECISIONS.md`) — jamais
 * d'écriture ici : une fonction pure testable qui transforme une grille
 * en plan d'actions, à charge du store de l'exécuter (même discipline
 * que `evaluerVerdictRiskAssessment.ts`/`construireReadinessContentPlan.ts`).
 *
 * Convention attendue, documentée à l'utilisateur, jamais devinée :
 * - première ligne = en-têtes, un en-tête par colonne de niveau, dans le
 *   même ordre que `AssetHierarchySchema.levels[]` (du plus générique au
 *   plus spécifique) — correspondance par `key` ou par `label` (une des
 *   3 langues), insensible à la casse/aux accents ;
 * - une colonne "Code" optionnelle s'applique au nœud le plus profond
 *   décrit par la ligne (sinon un code est généré) ;
 * - chaque ligne suivante décrit un chemin racine→feuille : les colonnes
 *   remplies avant la dernière colonne non vide de la ligne sont les
 *   ancêtres — créés une seule fois même s'ils se répètent sur plusieurs
 *   lignes (même chemin = même nœud) ;
 * - une case vide *entre* deux cases remplies dans une même ligne est une
 *   erreur explicite pour cette ligne, jamais une case "sautée"
 *   silencieusement ;
 * - une ligne entièrement vide sur les colonnes de niveau est ignorée
 *   (séparateur courant dans un export tableur).
 *
 * Ne fabrique jamais un niveau de hiérarchie absent de `schema.levels[]`
 * — si un en-tête ne correspond à aucun niveau connu, l'import entier
 * est rejeté avec un message invitant à créer le niveau d'abord (même
 * principe que "ne jamais inventer une règle métier sans grounding réel").
 */

export interface NoeudAImporter {
  id: string
  level_key: string
  name: string
  code: string
  parent_id: string | null
}

export interface ErreurLigneImportHierarchie {
  ligne: number
  raison: 'case_vide_au_milieu' | 'code_deja_utilise'
}

export interface PlanImportHierarchie {
  aCreer: NoeudAImporter[]
  erreurs: ErreurLigneImportHierarchie[]
}

export type ResultatPreparationImportHierarchie =
  | { ok: true; plan: PlanImportHierarchie }
  | { ok: false; raison: 'grille_vide' }
  | { ok: false; raison: 'colonne_niveau_inconnue'; entete: string }
  | { ok: false; raison: 'ordre_colonnes_incoherent'; entete: string }

const MOT_ENTETE_CODE = 'code'

function normaliser(texte: string): string {
  return texte
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function genererCode(levelKey: string, dejaUtilises: ReadonlySet<string>): string {
  let suffixe = 1
  let candidat = `${levelKey}-${suffixe}`
  while (dejaUtilises.has(candidat)) {
    suffixe += 1
    candidat = `${levelKey}-${suffixe}`
  }
  return candidat
}

export function preparerImportHierarchie(
  grille: readonly string[][],
  schema: Pick<AssetHierarchySchema, 'levels'>,
  noeudsExistants: readonly Pick<AssetNode, 'id' | 'code'>[],
): ResultatPreparationImportHierarchie {
  const entetes = grille[0]
  if (!entetes) return { ok: false, raison: 'grille_vide' }
  const lignesDonnees = grille.slice(1)
  const clesNiveauxOrdre = schema.levels.map((n) => n.key)

  const colonnesNiveau: Array<{ colonne: number; level_key: string }> = []
  let colonneCode: number | null = null

  for (let colonne = 0; colonne < entetes.length; colonne += 1) {
    const entete = entetes[colonne] ?? ''
    const normalise = normaliser(entete)
    if (normalise === '') continue
    if (normalise === MOT_ENTETE_CODE) {
      colonneCode = colonne
      continue
    }
    const niveau = schema.levels.find(
      (n) =>
        normaliser(n.key) === normalise ||
        Object.values(n.label).some((libelle) => normaliser(libelle) === normalise),
    )
    if (!niveau) {
      return { ok: false, raison: 'colonne_niveau_inconnue', entete }
    }
    colonnesNiveau.push({ colonne, level_key: niveau.key })
  }

  for (let i = 1; i < colonnesNiveau.length; i += 1) {
    const actuel = colonnesNiveau[i]
    const precedent = colonnesNiveau[i - 1]
    if (!actuel || !precedent) continue
    const ordreActuel = clesNiveauxOrdre.indexOf(actuel.level_key)
    const ordrePrecedent = clesNiveauxOrdre.indexOf(precedent.level_key)
    if (ordreActuel <= ordrePrecedent) {
      return {
        ok: false,
        raison: 'ordre_colonnes_incoherent',
        entete: entetes[actuel.colonne] ?? '',
      }
    }
  }

  const aCreer: NoeudAImporter[] = []
  const erreurs: ErreurLigneImportHierarchie[] = []
  const idsParChemin = new Map<string, string>()
  const codesUtilises = new Set(noeudsExistants.map((n) => n.code))

  lignesDonnees.forEach((ligne, indexLigne) => {
    const numeroLigne = indexLigne + 2 // ligne 1 = en-têtes, humain compte à partir de 1

    const valeurs = colonnesNiveau.map((c) => (ligne[c.colonne] ?? '').trim())
    const dernierIndexRempli = valeurs.reduce(
      (dernier, valeur, i) => (valeur !== '' ? i : dernier),
      -1,
    )

    if (dernierIndexRempli === -1) return // ligne vide : ignorée silencieusement

    const caseVideAuMilieu = valeurs.slice(0, dernierIndexRempli + 1).some((v) => v === '')
    if (caseVideAuMilieu) {
      erreurs.push({ ligne: numeroLigne, raison: 'case_vide_au_milieu' })
      return
    }

    let parentId: string | null = null
    let echecLigne = false

    for (let i = 0; i <= dernierIndexRempli; i += 1) {
      const colonneNiveau = colonnesNiveau[i]
      const name = valeurs[i]
      if (!colonneNiveau || name === undefined) continue
      const levelKey = colonneNiveau.level_key
      const cle = `${parentId ?? ''}|${levelKey}|${name}`

      const existant = idsParChemin.get(cle)
      if (existant) {
        parentId = existant
        continue
      }

      const estFeuille = i === dernierIndexRempli
      const codeExplicite =
        estFeuille && colonneCode !== null ? (ligne[colonneCode] ?? '').trim() : ''

      let code = codeExplicite
      if (code === '') {
        code = genererCode(levelKey, codesUtilises)
      } else if (codesUtilises.has(code)) {
        erreurs.push({ ligne: numeroLigne, raison: 'code_deja_utilise' })
        echecLigne = true
        break
      }
      codesUtilises.add(code)

      const nouvelId = crypto.randomUUID()
      idsParChemin.set(cle, nouvelId)
      aCreer.push({ id: nouvelId, level_key: levelKey, name, code, parent_id: parentId })
      parentId = nouvelId
    }

    if (echecLigne) return
  })

  return { ok: true, plan: { aCreer, erreurs } }
}

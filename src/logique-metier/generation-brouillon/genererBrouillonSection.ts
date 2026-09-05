import type { ContexteEnvoi, ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type {
  ChampTableauDynamique,
  DefinitionChamp,
  DefinitionGabarit,
} from '../gabarits/definitionGabarit'
import { validerChamp } from '../gabarits/validerChamp'
import type { Langue, Section } from '../domaine/types'

/**
 * Génération de brouillon par adaptation d'un document de référence
 * (§4.1bis ; étendue aux lignes de tableau dynamique).
 *
 * Fonction pure côté client (aucune logique métier dans le prompt lui-même
 * n'est déléguée à l'IA au-delà de la proposition de valeurs) — même
 * discipline que `proposerStructureProcedureParIA` : protocole
 * de sortie contraint (un marqueur par ligne, jamais du JSON libre) et
 * **aucune valeur proposée n'est acceptée sans revalider contre la
 * définition du champ** (`validerChamp`, déjà utilisé par l'écran de
 * saisie manuelle) — un champ `liste` avec une option inconnue, une date
 * hors format, un nombre hors plage sont silencieusement rejetés plutôt que
 * d'écrire un état que l'écran de saisie manuelle refuserait lui-même.
 *
 * **Lignes de tableau dynamique** : proposées
 * uniquement pour un tableau **actuellement vide** (`tablesExistantes`) —
 * jamais un ajout à des lignes déjà saisies, même discipline que les
 * champs scalaires ("déjà saisi → jamais écrasé"). Nombre de lignes
 * plafonné (`NOMBRE_MAX_LIGNES_PAR_TABLEAU`) — limite le risque
 * d'hallucination sur un nombre de lignes non contraint identifié comme
 * limite assumée. Une ligne dont une seule cellule échoue
 * `validerChamp` est rejetée entièrement — jamais une ligne partielle.
 *
 * @requirement §4.1bis
 */

const NOMBRE_MAX_LIGNES_PAR_TABLEAU = 20

export interface EntreesGenerationBrouillon {
  gabarit: DefinitionGabarit
  texteDocumentReference: string
  contexteNouveauCas: string
  langue: Langue
  /** Tables déjà présentes sur la section — détermine quels tableaux sont adressables. */
  tablesExistantes: Section['tables']
}

export interface ChampProposeIA {
  section_key: string
  field_key: string
  valeur: string | number
  /**
   * `true` si le champ est de type `nombre` — critère déterministe retenu
   * pour "donnée technique/numérique" (valeur, tolérance,
   * critère d'acceptation) : dans ce moteur de gabarits, un champ numérique
   * EST par construction une valeur/tolérance/critère, jamais du texte
   * libre. Consommé par l'écran pour le surlignage distinct exigé.
   */
  origineTechnique: boolean
}

export interface LigneTableauProposeeIA {
  section_key: string
  field_key: string
  lignes: Array<Record<string, string | number | null>>
}

export interface PropositionBrouillonIA {
  champs: ChampProposeIA[]
  lignesTableaux: LigneTableauProposeeIA[]
  texteReponseBrute: string
}

const RE_LIGNE_CHAMP = /^CHAMP\|([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\|(.*)$/
const RE_LIGNE_TABLEAU = /^LIGNE_TABLEAU\|([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\|(.*)$/

interface ChampAdressable {
  section_key: string
  champ: DefinitionChamp
}

interface TableauAdressable {
  section_key: string
  champ: ChampTableauDynamique
}

function champsAdressables(gabarit: DefinitionGabarit): ChampAdressable[] {
  return gabarit.sections.flatMap((section) =>
    section.fields
      .filter((champ) => champ.type !== 'tableau_dynamique')
      .map((champ) => ({ section_key: section.section_key, champ })),
  )
}

/** Un tableau n'est adressable que s'il ne porte encore aucune ligne — jamais un ajout. */
function tableauxAdressables(
  gabarit: DefinitionGabarit,
  tablesExistantes: Section['tables'],
): TableauAdressable[] {
  return gabarit.sections.flatMap((section) =>
    section.fields
      .filter(
        (champ): champ is ChampTableauDynamique =>
          champ.type === 'tableau_dynamique' &&
          (tablesExistantes[champ.field_key]?.length ?? 0) === 0,
      )
      .map((champ) => ({ section_key: section.section_key, champ })),
  )
}

function construirePrompt(entrees: EntreesGenerationBrouillon): string {
  const catalogue = champsAdressables(entrees.gabarit)
    .map(({ section_key, champ }) => {
      const libelle = champ.labels[entrees.langue] ?? champ.labels.fr
      return `- ${section_key}.${champ.field_key} (${libelle}) [type: ${champ.type}]`
    })
    .join('\n')

  const tableaux = tableauxAdressables(entrees.gabarit, entrees.tablesExistantes)
  const catalogueTableaux = tableaux
    .map(({ section_key, champ }) => {
      const libelle = champ.labels[entrees.langue] ?? champ.labels.fr
      const colonnes = champ.colonnes
        .map((c) => `${c.field_key} (${c.labels[entrees.langue] ?? c.labels.fr}) [${c.type}]`)
        .join(', ')
      return `- ${section_key}.${champ.field_key} (${libelle}) — colonnes : ${colonnes}`
    })
    .join('\n')

  const instructionsTableaux =
    tableaux.length > 0
      ? [
          '',
          `Tableaux dynamiques disponibles (vides, au plus ${NOMBRE_MAX_LIGNES_PAR_TABLEAU} lignes chacun) :`,
          catalogueTableaux,
          '',
          'Pour chaque ligne proposée pour un tableau, ajoute une ligne au format :',
          'LIGNE_TABLEAU|<section_key>.<field_key>|<col1>=<valeur1>;<col2>=<valeur2>;...',
        ].join('\n')
      : ''

  return [
    `Voici un document de référence et le contexte d'un nouveau cas. Génère un brouillon pour le gabarit "${entrees.gabarit.template_id}" en ADAPTANT la structure, le langage et le raisonnement du document de référence au nouveau cas — jamais une simple recopie telle quelle.`,
    "N'INVENTE JAMAIS une valeur que tu ne peux pas raisonnablement déduire du document de référence ou du contexte du nouveau cas : omets purement et simplement la ligne pour ce champ plutôt que de deviner.",
    `Réponds dans la langue suivante : ${entrees.langue}.`,
    'Champs disponibles à proposer :',
    catalogue,
    '',
    "Réponds UNIQUEMENT avec des lignes au format suivant, une par ligne, rien d'autre :",
    'CHAMP|<section_key>.<field_key>|<valeur proposée>',
    instructionsTableaux,
    '',
    '--- CONTEXTE DU NOUVEAU CAS ---',
    entrees.contexteNouveauCas,
    '',
    '--- DOCUMENT DE RÉFÉRENCE ---',
    entrees.texteDocumentReference,
  ].join('\n')
}

function analyserReponse(texteReponse: string, gabarit: DefinitionGabarit): ChampProposeIA[] {
  const parDefinition = new Map<string, ChampAdressable>(
    champsAdressables(gabarit).map((entree) => [
      `${entree.section_key}.${entree.champ.field_key}`,
      entree,
    ]),
  )
  const champs: ChampProposeIA[] = []

  for (const ligneBrute of texteReponse.split('\n')) {
    const match = ligneBrute.trim().match(RE_LIGNE_CHAMP)
    if (!match) continue
    const [, sectionKey, fieldKey, valeurBrute] = match
    if (sectionKey === undefined || fieldKey === undefined || valeurBrute === undefined) continue
    const cle = `${sectionKey}.${fieldKey}`
    const definition = parDefinition.get(cle)
    if (!definition) continue // champ halluciné/inconnu — jamais écrit

    const valeurTexte = valeurBrute.trim()
    if (valeurTexte.length === 0) continue

    const valeur: string | number =
      definition.champ.type === 'nombre' ? Number(valeurTexte) : valeurTexte
    if (!validerChamp(definition.champ, valeur).valide) continue // jamais un état que la saisie manuelle refuserait

    champs.push({
      section_key: sectionKey,
      field_key: fieldKey,
      valeur,
      origineTechnique: definition.champ.type === 'nombre',
    })
  }

  return champs
}

/** Une ligne dont une seule cellule échoue `validerChamp` est rejetée entièrement — jamais partielle. */
function ligneValide(
  cellulesBrutes: string,
  tableau: TableauAdressable,
): Record<string, string | number | null> | null {
  const colonnesParCle = new Map(tableau.champ.colonnes.map((c) => [c.field_key, c]))
  const ligne: Record<string, string | number | null> = {}

  for (const paire of cellulesBrutes.split(';')) {
    const indexEgal = paire.indexOf('=')
    if (indexEgal === -1) continue
    const cle = paire.slice(0, indexEgal).trim()
    const valeurTexte = paire.slice(indexEgal + 1).trim()
    const colonne = colonnesParCle.get(cle)
    if (!colonne) return null // colonne inconnue/hallucinée — ligne entière rejetée
    if (valeurTexte.length === 0) {
      ligne[cle] = null
      continue
    }
    const valeur: string | number = colonne.type === 'nombre' ? Number(valeurTexte) : valeurTexte
    if (!validerChamp(colonne, valeur).valide) return null
    ligne[cle] = valeur
  }

  return ligne
}

function analyserLignesTableaux(
  texteReponse: string,
  gabarit: DefinitionGabarit,
  tablesExistantes: Section['tables'],
): LigneTableauProposeeIA[] {
  const parDefinition = new Map<string, TableauAdressable>(
    tableauxAdressables(gabarit, tablesExistantes).map((entree) => [
      `${entree.section_key}.${entree.champ.field_key}`,
      entree,
    ]),
  )
  const lignesParTableau = new Map<string, Array<Record<string, string | number | null>>>()

  for (const ligneBrute of texteReponse.split('\n')) {
    const match = ligneBrute.trim().match(RE_LIGNE_TABLEAU)
    if (!match) continue
    const [, sectionKey, fieldKey, cellulesBrutes] = match
    if (sectionKey === undefined || fieldKey === undefined || cellulesBrutes === undefined) continue
    const cle = `${sectionKey}.${fieldKey}`
    const tableau = parDefinition.get(cle)
    if (!tableau) continue // tableau halluciné/déjà rempli — jamais écrit

    const dejaAccumulees = lignesParTableau.get(cle) ?? []
    if (dejaAccumulees.length >= NOMBRE_MAX_LIGNES_PAR_TABLEAU) continue // plafond, jamais un nombre non contraint

    const ligne = ligneValide(cellulesBrutes, tableau)
    if (ligne === null) continue
    lignesParTableau.set(cle, [...dejaAccumulees, ligne])
  }

  return Array.from(lignesParTableau.entries()).map(([cle, lignes]) => {
    const [sectionKey, fieldKey] = cle.split('.')
    return { section_key: sectionKey ?? '', field_key: fieldKey ?? '', lignes }
  })
}

export async function genererBrouillonSection(
  entrees: EntreesGenerationBrouillon,
  provider: ProviderAdapter,
): Promise<PropositionBrouillonIA> {
  const contexte: ContexteEnvoi = {
    contenu_joint: true,
    contenu: entrees.texteDocumentReference,
    titre_document: 'Document de référence (génération de brouillon, §4.1bis)',
  }

  const reponse = await provider.envoyerMessage(
    'chat_normatif',
    contexte,
    construirePrompt(entrees),
  )
  const champs = analyserReponse(reponse.texte, entrees.gabarit)
  const lignesTableaux = analyserLignesTableaux(
    reponse.texte,
    entrees.gabarit,
    entrees.tablesExistantes,
  )

  return { champs, lignesTableaux, texteReponseBrute: reponse.texte }
}

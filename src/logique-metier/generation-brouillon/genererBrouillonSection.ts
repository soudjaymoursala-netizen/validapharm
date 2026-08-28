import type { ContexteEnvoi, ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type { DefinitionChamp, DefinitionGabarit } from '../gabarits/definitionGabarit'
import { validerChamp } from '../gabarits/validerChamp'
import type { Langue } from '../domaine/types'

/**
 * Génération de brouillon par adaptation d'un document de référence
 * (§4.1bis, Phase 33, TD-031 — URS-F-060 à 064).
 *
 * Fonction pure côté client (aucune logique métier dans le prompt lui-même
 * n'est déléguée à l'IA au-delà de la proposition de valeurs) — même
 * discipline que `proposerStructureProcedureParIA` (Phase 24) : protocole
 * de sortie contraint (un marqueur par ligne, jamais du JSON libre) et
 * **aucune valeur proposée n'est acceptée sans revalider contre la
 * définition du champ** (`validerChamp`, déjà utilisé par l'écran de
 * saisie manuelle) — un champ `liste` avec une option inconnue, une date
 * hors format, un nombre hors plage sont silencieusement rejetés plutôt que
 * d'écrire un état que l'écran de saisie manuelle refuserait lui-même.
 *
 * **Limite assumée** : seuls les champs scalaires (`texte_court`,
 * `texte_long`, `liste`, `date`, `nombre`) sont proposés — jamais les
 * lignes d'un `tableau_dynamique` (risque d'hallucination bien plus élevé
 * sur un nombre de lignes/valeurs croisées non contraint ; backlog futur si
 * un besoin réel se confirme).
 *
 * @requirement URS-F-060, URS-F-063, FS §4.1bis
 */

export interface EntreesGenerationBrouillon {
  gabarit: DefinitionGabarit
  texteDocumentReference: string
  contexteNouveauCas: string
  langue: Langue
}

export interface ChampProposeIA {
  section_key: string
  field_key: string
  valeur: string | number
  /**
   * `true` si le champ est de type `nombre` — critère déterministe retenu
   * pour "donnée technique/numérique" (URS-F-063 : valeur, tolérance,
   * critère d'acceptation) : dans ce moteur de gabarits, un champ numérique
   * EST par construction une valeur/tolérance/critère, jamais du texte
   * libre. Consommé par l'écran pour le surlignage distinct exigé.
   */
  origineTechnique: boolean
}

export interface PropositionBrouillonIA {
  champs: ChampProposeIA[]
  texteReponseBrute: string
}

const RE_LIGNE_CHAMP = /^CHAMP\|([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\|(.*)$/

interface ChampAdressable {
  section_key: string
  champ: DefinitionChamp
}

function champsAdressables(gabarit: DefinitionGabarit): ChampAdressable[] {
  return gabarit.sections.flatMap((section) =>
    section.fields
      .filter((champ) => champ.type !== 'tableau_dynamique')
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

  return [
    `Voici un document de référence et le contexte d'un nouveau cas. Génère un brouillon pour le gabarit "${entrees.gabarit.template_id}" en ADAPTANT la structure, le langage et le raisonnement du document de référence au nouveau cas — jamais une simple recopie telle quelle.`,
    "N'INVENTE JAMAIS une valeur que tu ne peux pas raisonnablement déduire du document de référence ou du contexte du nouveau cas : omets purement et simplement la ligne pour ce champ plutôt que de deviner.",
    `Réponds dans la langue suivante : ${entrees.langue}.`,
    'Champs disponibles à proposer :',
    catalogue,
    '',
    "Réponds UNIQUEMENT avec des lignes au format suivant, une par ligne, rien d'autre :",
    'CHAMP|<section_key>.<field_key>|<valeur proposée>',
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

  return { champs, texteReponseBrute: reponse.texte }
}

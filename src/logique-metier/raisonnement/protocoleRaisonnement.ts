import type { EtatConfianceIA } from '../domaine/types'

/**
 * Protocole textuel d'appel d'outils (Phase 15, `docs/convergence/
 * PHASE_15_REASONING_ENGINE_SPEC.md` §2) : le relais IA est un simple proxy
 * texte à un seul tour (`ProviderAdapter.envoyerMessage`), sans support
 * natif d'appel d'outils — ce protocole est entièrement défini et
 * interprété côté navigateur, jamais côté relais (TD-007).
 */

export interface DefinitionOutilRaisonnement {
  nom: string
  description: string
}

export interface AppelOutil {
  nom: string
  parametres: Record<string, string>
}

export interface ReponseFinaleModele {
  texte: string
  etat_confiance: EtatConfianceIA
  citations: string[]
}

export type SortieModeleAnalysee =
  | { type: 'appel_outil'; appel: AppelOutil }
  | { type: 'reponse_finale'; reponse: ReponseFinaleModele }
  | { type: 'non_reconnu'; texteBrut: string }

const ETATS_CONFIANCE_VALIDES: readonly EtatConfianceIA[] = [
  'connu',
  'infere',
  'inconnu',
  'conflit',
  'a_verifier',
]

/**
 * Construit le texte de question envoyé au fournisseur IA — objectif,
 * narratif de contexte assemblé (Phase 27, TD-025 — optionnel, omis si
 * aucun `ContextSnapshot` n'est en vigueur), catalogue d'outils
 * disponibles, transcript des tours précédents, et instructions strictes
 * de format. Le transcript est reconstruit à chaque appel (le relais reste
 * sans état, TD-007) plutôt que porté par une session côté serveur.
 */
export function construirePrompt(
  objectif: string,
  outils: readonly DefinitionOutilRaisonnement[],
  transcript: readonly string[],
  narratifContexte?: string,
): string {
  const catalogue = outils.map((o) => `- ${o.nom} : ${o.description}`).join('\n')
  const historique =
    transcript.length > 0 ? `\n\nHistorique de ce raisonnement :\n${transcript.join('\n')}` : ''
  const contexte =
    narratifContexte && narratifContexte.length > 0
      ? `Contexte assemblé pour ce raisonnement :\n${narratifContexte}\n\n`
      : ''

  return [
    `${contexte}Objectif : ${objectif}`,
    '',
    `Outils disponibles :\n${catalogue}`,
    historique,
    '',
    "Réponds STRICTEMENT dans l'un des deux formats suivants, rien d'autre :",
    '',
    'APPEL_OUTIL: {"nom": "<nom_outil>", "parametres": {"<cle>": "<valeur>"}}',
    '',
    'ou',
    '',
    'REPONSE_FINALE: {"texte": "...", "etat_confiance": "connu|infere|inconnu|conflit|a_verifier", "citations": ["<id>", ...]}',
  ].join('\n')
}

/**
 * Analyse la sortie du modèle. Robuste à un modèle qui ne respecte pas le
 * format (prose libre, JSON malformé) : retourne `non_reconnu` plutôt que
 * de lever une exception — la boucle d'orchestration dégrade alors
 * gracieusement (spec §2), jamais un crash.
 */
export function parserSortieModele(texteBrut: string): SortieModeleAnalysee {
  const appelOutil = extraireBloc(texteBrut, 'APPEL_OUTIL:')
  if (appelOutil !== null) {
    const analyse = tenterAnalyserJson(appelOutil)
    if (
      analyse !== null &&
      typeof analyse === 'object' &&
      typeof (analyse as { nom?: unknown }).nom === 'string' &&
      estObjetDeChaines((analyse as { parametres?: unknown }).parametres)
    ) {
      const a = analyse as { nom: string; parametres: Record<string, string> }
      return { type: 'appel_outil', appel: { nom: a.nom, parametres: a.parametres } }
    }
    return { type: 'non_reconnu', texteBrut }
  }

  const reponseFinale = extraireBloc(texteBrut, 'REPONSE_FINALE:')
  if (reponseFinale !== null) {
    const analyse = tenterAnalyserJson(reponseFinale)
    if (
      analyse !== null &&
      typeof analyse === 'object' &&
      typeof (analyse as { texte?: unknown }).texte === 'string' &&
      ETATS_CONFIANCE_VALIDES.includes(
        (analyse as { etat_confiance?: unknown }).etat_confiance as EtatConfianceIA,
      ) &&
      Array.isArray((analyse as { citations?: unknown }).citations)
    ) {
      const r = analyse as {
        texte: string
        etat_confiance: EtatConfianceIA
        citations: unknown[]
      }
      return {
        type: 'reponse_finale',
        reponse: {
          texte: r.texte,
          etat_confiance: r.etat_confiance,
          citations: r.citations.filter((c): c is string => typeof c === 'string'),
        },
      }
    }
    return { type: 'non_reconnu', texteBrut }
  }

  return { type: 'non_reconnu', texteBrut }
}

function extraireBloc(texte: string, prefixe: string): string | null {
  const index = texte.lastIndexOf(prefixe)
  if (index === -1) return null
  return texte.slice(index + prefixe.length).trim()
}

function tenterAnalyserJson(texte: string): unknown {
  // Le modèle peut entourer le JSON de texte additionnel malgré la
  // consigne stricte : on ne tente l'analyse que sur le premier bloc
  // accolade équilibré, jamais sur la chaîne brute entière.
  const debut = texte.indexOf('{')
  if (debut === -1) return null
  let profondeur = 0
  for (let i = debut; i < texte.length; i++) {
    if (texte[i] === '{') profondeur++
    if (texte[i] === '}') {
      profondeur--
      if (profondeur === 0) {
        try {
          return JSON.parse(texte.slice(debut, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function estObjetDeChaines(valeur: unknown): valeur is Record<string, string> {
  if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) return false
  return Object.values(valeur).every((v) => typeof v === 'string')
}

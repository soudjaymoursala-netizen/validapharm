import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
} from '../../connecteurs/ia/ProviderAdapter'
import {
  estNarratifVide,
  idsNarratifContexte,
  serialiserNarratifContexte,
  type NarratifContexteSnapshot,
} from '../contexte/narratifContexteSnapshot'
import type { EtatConfianceIA, TraceAppelOutil } from '../domaine/types'
import { construirePrompt, parserSortieModele } from './protocoleRaisonnement'
import {
  CATALOGUE_OUTILS_RAISONNEMENT,
  type DonneesOutilsRaisonnement,
  type ResultatExecutionOutil,
  executerOutil,
} from './outilsRaisonnement'

const PLAFOND_ITERATIONS_PAR_DEFAUT = 6
const CONTEXTE_SANS_DOCUMENT: ContexteEnvoi = { contenu_joint: false }

export interface EntreesBoucleRaisonnement {
  objectif: string
  fournisseur: ProviderAdapter
  mode: ModeUsageIA
  donnees: DonneesOutilsRaisonnement
  /** Plafond d'itérations — voir spec §3 (jamais une boucle sans limite, budget cap explicite). */
  maxIterations?: number
  /** Narratif du `ContextSnapshot` en vigueur (Phase 27, TD-025) — omis si aucun snapshot n'a été assemblé pour ce raisonnement. */
  narratifContexte?: NarratifContexteSnapshot
}

export interface ReponseRaisonnement {
  texte: string
  etatConfiance: EtatConfianceIA
  citations: string[]
}

export interface ResultatBoucleRaisonnement {
  reponse: ReponseRaisonnement
  trace: TraceAppelOutil[]
  versionMoteur: string | null
  iterationsUtilisees: number
  /** `true` si le plafond a été atteint sans réponse finale — jamais silencieux (spec §3). */
  arretPourLimite: boolean
}

/**
 * Boucle d'orchestration du moteur de raisonnement (Phase 15, spec §2/§3).
 * Le relais IA reste un simple proxy sans état (TD-007) : la conversation
 * est reconstruite à chaque tour via `construirePrompt`, jamais portée par
 * une session côté serveur.
 *
 * **Vérification de citation déterministe (spec §4, non négociable)** :
 * une réponse taguée `connu` sans citation, ou dont une citation ne
 * correspond à aucun id réellement obtenu par un appel d'outil pendant
 * cette session, est automatiquement rétrogradée à `a_verifier` — jamais
 * l'IA seule ne décide qu'elle "sait" (principe fondateur n°1, invariant
 * #8 de `03_DOMAIN_DATA_MODEL.md`). Depuis la Phase 27 (TD-025), les ids
 * du narratif de contexte assemblé sont considérés obtenus dès le premier
 * tour, avec la même garantie qu'un appel d'outil (données déterministes
 * déjà résolues au moment de l'assemblage du `ContextSnapshot`) — jamais
 * une confiance accrue sur la seule affirmation du modèle.
 */
export async function executerBoucleRaisonnement(
  entrees: EntreesBoucleRaisonnement,
): Promise<ResultatBoucleRaisonnement> {
  const outils = CATALOGUE_OUTILS_RAISONNEMENT
  const maxIterations = entrees.maxIterations ?? PLAFOND_ITERATIONS_PAR_DEFAUT
  const transcript: string[] = []
  const trace: TraceAppelOutil[] = []
  const idsConnus = new Set<string>()
  let versionMoteur: string | null = null

  const narratifTexte =
    entrees.narratifContexte && !estNarratifVide(entrees.narratifContexte)
      ? serialiserNarratifContexte(entrees.narratifContexte)
      : undefined
  if (entrees.narratifContexte) {
    idsNarratifContexte(entrees.narratifContexte).forEach((id) => idsConnus.add(id))
  }

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const prompt = construirePrompt(entrees.objectif, outils, transcript, narratifTexte)
    const reponseIA = await entrees.fournisseur.envoyerMessage(
      entrees.mode,
      CONTEXTE_SANS_DOCUMENT,
      prompt,
    )
    versionMoteur = reponseIA.version_moteur
    const sortie = parserSortieModele(reponseIA.texte)

    if (sortie.type === 'appel_outil') {
      const resultatOutil: ResultatExecutionOutil = executerOutil(sortie.appel, entrees.donnees)
      resultatOutil.idsObtenus.forEach((id) => idsConnus.add(id))
      const horodatage = new Date().toISOString()
      trace.push({
        outil: sortie.appel.nom,
        parametres: sortie.appel.parametres,
        resultat: resultatOutil.resultat,
        horodatage,
      })
      transcript.push(
        `APPEL_OUTIL: ${JSON.stringify(sortie.appel)}`,
        `RESULTAT_OUTIL: ${resultatOutil.resultat}`,
      )
      continue
    }

    if (sortie.type === 'reponse_finale') {
      const etatConfiance = verifierConfiance(
        sortie.reponse.etat_confiance,
        sortie.reponse.citations,
        idsConnus,
      )
      return {
        reponse: {
          texte: sortie.reponse.texte,
          etatConfiance,
          citations: sortie.reponse.citations,
        },
        trace,
        versionMoteur,
        iterationsUtilisees: iteration,
        arretPourLimite: false,
      }
    }

    // Dégradation gracieuse (TD-007 A3) : le modèle n'a pas respecté le
    // protocole — le texte brut devient la réponse finale, jamais un
    // crash ni une confiance fabriquée.
    return {
      reponse: { texte: sortie.texteBrut, etatConfiance: 'a_verifier', citations: [] },
      trace,
      versionMoteur,
      iterationsUtilisees: iteration,
      arretPourLimite: false,
    }
  }

  return {
    reponse: {
      texte: "Le plafond d'itérations a été atteint sans réponse finale.",
      etatConfiance: 'a_verifier',
      citations: [],
    },
    trace,
    versionMoteur,
    iterationsUtilisees: maxIterations,
    arretPourLimite: true,
  }
}

function verifierConfiance(
  etatDeclare: EtatConfianceIA,
  citations: readonly string[],
  idsConnus: ReadonlySet<string>,
): EtatConfianceIA {
  if (etatDeclare !== 'connu') return etatDeclare
  if (citations.length === 0) return 'a_verifier'
  const toutesVerifiees = citations.every((c) => idsConnus.has(c))
  return toutesVerifiees ? 'connu' : 'a_verifier'
}

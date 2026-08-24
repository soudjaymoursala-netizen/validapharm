import { IndisponibleError, TimeoutError } from '../../connecteurs/ia/erreurs'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'

export interface ResultatEnvoiRoute {
  reponse: Reponse
  fournisseurUtilise: ProviderAdapter
  bascule: boolean
}

/**
 * Orchestration du routeur IA (SDS §6) : intercepte spécifiquement
 * `TimeoutError`/`IndisponibleError` pour basculer automatiquement vers
 * le modèle local, avec indicateur de bascule — jamais pour
 * `QuotaExceededError`/`ReponseInvalideError`, remontées telles quelles
 * (un quota dépassé n'est pas une indisponibilité, ne doit pas déclencher
 * un changement de fournisseur silencieux).
 *
 * @requirement URS-F-033, SDS §6, mitige AR-R-12
 *
 * Fonction pure d'orchestration — ne décide d'aucune règle métier
 * au-delà de ce routage ; les adaptateurs eux-mêmes (connecteurs/ia/)
 * portent toute la logique d'appel réseau.
 */
export async function envoyerAvecBascule(
  fournisseurPrincipal: ProviderAdapter,
  fournisseurLocal: ProviderAdapter,
  mode: ModeUsageIA,
  contexte: ContexteEnvoi,
  question: string,
): Promise<ResultatEnvoiRoute> {
  try {
    const reponse = await fournisseurPrincipal.envoyerMessage(mode, contexte, question)
    return { reponse, fournisseurUtilise: fournisseurPrincipal, bascule: false }
  } catch (erreur) {
    if (erreur instanceof TimeoutError || erreur instanceof IndisponibleError) {
      const reponse = await fournisseurLocal.envoyerMessage(mode, contexte, question)
      return { reponse, fournisseurUtilise: fournisseurLocal, bascule: true }
    }
    throw erreur
  }
}

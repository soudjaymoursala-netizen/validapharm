import { OllamaProviderAdapter } from '../../connecteurs/ia/OllamaProviderAdapter'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
} from '../../connecteurs/ia/ProviderAdapter'
import { RelayProviderAdapter } from '../../connecteurs/ia/RelayProviderAdapter'
import { envoyerAvecBascule } from '../../logique-metier/routeur-ia/envoyerAvecBascule'

// Aucun écran de sélection du modèle local n'est spécifié à ce stade ;
// valeur par défaut documentée plutôt que silencieusement câblée en dur
// sans trace (backlog : rendre configurable si un client utilise un
// modèle Ollama différent). Extrait de `usePanneauChatStore` (Phase 17)
// pour être réutilisé par le Mission workspace sans dupliquer la logique.
const MODELE_OLLAMA_PAR_DEFAUT = 'llama3'

export interface EntreesConstructionAdaptateurs {
  estFournisseurCloud: boolean
  nomFournisseurActuel: string
  relayUrl: string | undefined
  jetonRelais: string | undefined
}

export function construireAdaptateursIA(entrees: EntreesConstructionAdaptateurs): {
  principal: ProviderAdapter
  local: ProviderAdapter
} {
  const local = new OllamaProviderAdapter({ modele: MODELE_OLLAMA_PAR_DEFAUT })
  if (!entrees.estFournisseurCloud) {
    return { principal: local, local }
  }
  const principal = new RelayProviderAdapter({
    relayUrl: entrees.relayUrl ?? '',
    jeton: entrees.jetonRelais,
    nomAffiche: entrees.nomFournisseurActuel,
  })
  return { principal, local }
}

/**
 * Adapte la paire principal/local en un unique `ProviderAdapter` appliquant
 * la bascule automatique (`envoyerAvecBascule`, SDS §6) à chaque appel —
 * nécessaire là où l'appelant (ex. `executerBoucleRaisonnement`, Phase 15)
 * attend un seul `ProviderAdapter`, sans connaître la logique de bascule.
 */
export function adaptateurAvecBascule(
  principal: ProviderAdapter,
  local: ProviderAdapter,
): ProviderAdapter {
  return {
    nomAffiche: principal.nomAffiche,
    estCloud: principal.estCloud,
    async envoyerMessage(mode: ModeUsageIA, contexte: ContexteEnvoi, question: string) {
      if (!principal.estCloud) return principal.envoyerMessage(mode, contexte, question)
      const resultat = await envoyerAvecBascule(principal, local, mode, contexte, question)
      return resultat.reponse
    },
  }
}

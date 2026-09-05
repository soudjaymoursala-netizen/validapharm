/**
 * Contrat commun à tous les fournisseurs IA — Claude, OpenAI,
 * Copilot, DeepSeek, modèle local (Ollama) implémentent tous cette même
 * interface. Aucune logique de routage ne doit dépendre du fournisseur
 * spécifique au-delà du choix de l'adaptateur actif
 * (`client_config.ai_provider`).
 *
 * @requirement Contrat commun des fournisseurs IA
 */

export type ModeUsageIA = 'chat_normatif' | 'audit_simule'

/**
 * `contenu_joint` distingue explicitement le cas "aucun contenu" (false,
 * `contenu` absent) du cas "contenu joint après confirmation utilisateur"
 * (true) — jamais un simple champ optionnel : le routeur refuse
 * de transmettre un contenu si ce indicateur n'est pas `true`, quelle que
 * soit la présence de `contenu` (mitige le risque de transmission d'un contenu non acquitté).
 */
export type ContexteEnvoi =
  { contenu_joint: false } | { contenu_joint: true; contenu: string; titre_document: string }

export interface Reponse {
  texte: string
  /** Identifiant de version de modèle, quand le fournisseur l'expose. */
  version_moteur: string | null
  /** Normes/référentiels cités par la réponse, quand pertinent. */
  citations: string[]
}

export interface ProviderAdapter {
  /** Nom d'affichage du fournisseur ("bandeau nomme explicitement le fournisseur actif"). */
  readonly nomAffiche: string
  /** `true` pour un fournisseur cloud, `false` pour le modèle local ("[cloud] ou [local]"). */
  readonly estCloud: boolean

  /**
   * @throws {TimeoutError} Délai dépassé — déclenche la bascule automatique.
   * @throws {IndisponibleError} Fournisseur injoignable — déclenche la bascule automatique.
   * @throws {QuotaExceededError} Quota dépassé — jamais de bascule automatique.
   * @throws {ReponseInvalideError} Réponse illisible — jamais de bascule automatique.
   */
  envoyerMessage(mode: ModeUsageIA, contexte: ContexteEnvoi, question: string): Promise<Reponse>
}

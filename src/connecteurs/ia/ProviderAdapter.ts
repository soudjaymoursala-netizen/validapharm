/**
 * Contrat commun à tous les fournisseurs IA (SDS §6) — Claude, OpenAI,
 * Copilot, DeepSeek, modèle local (Ollama) implémentent tous cette même
 * interface. Aucune logique de routage ne doit dépendre du fournisseur
 * spécifique au-delà du choix de l'adaptateur actif
 * (`client_config.ai_provider`).
 *
 * @requirement SDS §6, URS-F-030 à 037
 */

export type ModeUsageIA = 'chat_normatif' | 'audit_simule'

/**
 * `contenu_joint` distingue explicitement le cas "aucun contenu" (false,
 * `contenu` absent) du cas "contenu joint après confirmation utilisateur"
 * (true) — jamais un simple champ optionnel : le routeur (§6 SDS) refuse
 * de transmettre un contenu si ce indicateur n'est pas `true`, quelle que
 * soit la présence de `contenu` (répond à URS-F-031, mitige AR-R-06).
 */
export type ContexteEnvoi =
  { contenu_joint: false } | { contenu_joint: true; contenu: string; titre_document: string }

export interface Reponse {
  texte: string
  /** Identifiant de version de modèle, quand le fournisseur l'expose (URS-F-032quinquies). */
  version_moteur: string | null
  /** Normes/référentiels cités par la réponse, quand pertinent (URS-F-035). */
  citations: string[]
}

export interface ProviderAdapter {
  /** Nom d'affichage du fournisseur (URS-F-034 : "bandeau nomme explicitement le fournisseur actif"). */
  readonly nomAffiche: string
  /** `true` pour un fournisseur cloud, `false` pour le modèle local (URS-F-034 : "[cloud] ou [local]"). */
  readonly estCloud: boolean

  /**
   * @throws {TimeoutError} Délai dépassé — déclenche la bascule automatique (URS-F-033).
   * @throws {IndisponibleError} Fournisseur injoignable — déclenche la bascule automatique (URS-F-033).
   * @throws {QuotaExceededError} Quota dépassé — jamais de bascule automatique.
   * @throws {ReponseInvalideError} Réponse illisible — jamais de bascule automatique.
   */
  envoyerMessage(mode: ModeUsageIA, contexte: ContexteEnvoi, question: string): Promise<Reponse>
}

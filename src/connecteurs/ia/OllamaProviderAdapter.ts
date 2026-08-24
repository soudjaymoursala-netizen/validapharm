import { IndisponibleError, ReponseInvalideError, TimeoutError } from './erreurs'
import type { ContexteEnvoi, ModeUsageIA, ProviderAdapter, Reponse } from './ProviderAdapter'

export interface ConfigOllamaProviderAdapter {
  /** URL du serveur Ollama local (défaut : instance standard du poste de travail). */
  url?: string
  modele: string
  delaiMaxMs?: number
}

const URL_PAR_DEFAUT = 'http://localhost:11434'
const DELAI_MAX_PAR_DEFAUT_MS = 30_000

/**
 * Adaptateur "modèle local" (cadrage §principe 5 "dégradation gracieuse",
 * URS-F-033) — Ollama exécuté sur le poste de l'utilisateur, aucune
 * dépendance réseau externe. Dernier recours de `envoyerAvecBascule`
 * quand aucun fournisseur cloud n'est joignable.
 *
 * @requirement URS-F-033, mitige AR-R-12
 *
 * N'expose jamais de citation de normes (contrairement à un fournisseur
 * cloud qualifié) — capacité en repli dégradé, pas une garantie de
 * qualité équivalente ; l'indicateur de bascule (`envoyerAvecBascule`)
 * reste visible à l'utilisateur pour cette raison (URS-F-033 : "en
 * informant l'utilisateur du changement de moteur").
 */
export class OllamaProviderAdapter implements ProviderAdapter {
  readonly estCloud = false
  readonly nomAffiche = 'Modèle local (Ollama)'
  private readonly delaiMaxMs: number

  constructor(private readonly config: ConfigOllamaProviderAdapter) {
    this.delaiMaxMs = config.delaiMaxMs ?? DELAI_MAX_PAR_DEFAUT_MS
  }

  async envoyerMessage(
    _mode: ModeUsageIA,
    contexte: ContexteEnvoi,
    question: string,
  ): Promise<Reponse> {
    const controleur = new AbortController()
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMaxMs)

    const invite = contexte.contenu_joint ? `${question}\n\n---\n${contexte.contenu}` : question

    let reponse: Response
    try {
      reponse = await fetch(`${this.config.url ?? URL_PAR_DEFAUT}/api/generate`, {
        method: 'POST',
        signal: controleur.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.config.modele, prompt: invite, stream: false }),
      })
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') throw new TimeoutError()
      // Ollama non démarré/injoignable sur le poste — c'est le cas nominal
      // qui justifie ce garde-fou de dernier recours, jamais une erreur
      // générique.
      throw new IndisponibleError("Le modèle local (Ollama) n'est pas joignable sur ce poste.")
    } finally {
      clearTimeout(minuteur)
    }

    if (!reponse.ok) {
      throw new IndisponibleError(`Le modèle local a répondu une erreur (${reponse.status}).`)
    }

    let corps: unknown
    try {
      corps = await reponse.json()
    } catch {
      throw new ReponseInvalideError()
    }
    if (
      typeof corps !== 'object' ||
      corps === null ||
      typeof (corps as { response?: unknown }).response !== 'string'
    ) {
      throw new ReponseInvalideError()
    }

    return {
      texte: (corps as { response: string }).response,
      version_moteur: this.config.modele,
      citations: [],
    }
  }
}

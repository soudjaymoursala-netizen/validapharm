import { ErreurFournisseurIA, type FournisseurIA, type ResultatEnvoiIA } from './FournisseurIA'

/**
 * Fournisseur ChatGPT (OpenAI) — Chat Completions API, contrat REST
 * documenté par OpenAI (dernière vérification par recherche le 07/09/2026
 * — **à revérifier contre la documentation OpenAI au moment du
 * déploiement réel**, aucun appel en conditions réelles n'a été possible
 * depuis cette session, même limite que `ClaudeProvider`/`AzureVisionProvider`).
 *
 * Choix explicite de l'utilisateur (07/09/2026), remplace `ClaudeProvider`
 * comme fournisseur câblé dans `index.ts` — voir `FournisseurIA.ts` et le
 * README pour l'architecture swappable qui rend ce remplacement possible
 * en une seule ligne. `ClaudeProvider` reste dans le dépôt, non supprimé,
 * pour un retour en arrière ou un usage ultérieur sans reconstruction.
 *
 * `POST {endpoint}/v1/chat/completions`, en-tête `Authorization: Bearer
 * <clé>`, corps `{ model, max_tokens, messages: [{role:'system',
 * content}, {role:'user', content}] }` → `choices[0].message.content`
 * porte la réponse, `model` confirme la version réellement utilisée.
 *
 * **Identifiants de modèle à vérifier avant mise en production** :
 * `gpt-4o` est un identifiant connu au moment de l'écriture de ce code,
 * jamais confirmé contre le catalogue de modèles OpenAI réellement
 * disponible en septembre 2026 (aucun accès à un compte OpenAI depuis
 * cette session) — ne jamais supposer qu'il reste valide sans
 * vérification, ajuster dans `wrangler.toml` (`MODELE_CHAT_NORMATIF`/
 * `MODELE_AUDIT_SIMULE`) si besoin, sans redéploiement de code.
 *
 * Aucune donnée n'est conservée par ce fournisseur au-delà du traitement
 * de la requête en cours (principe d'absence d'état, même limite que
 * `ClaudeProvider`) — un seul appel HTTP, jamais de sondage ni d'état
 * intermédiaire.
 */
export interface ConfigOpenaiProvider {
  cleApi: string
  /** Nombre maximal de jetons de sortie — plafond de coût par appel, jamais illimité. */
  maxTokens?: number
  endpoint?: string
}

const MAX_TOKENS_PAR_DEFAUT = 4096
const ENDPOINT_PAR_DEFAUT = 'https://api.openai.com'

interface ReponseChatCompletionsOpenai {
  choices?: Array<{ message?: { content?: string } }>
  model?: string
}

interface ReponseErreurOpenai {
  error?: { type?: string; message?: string }
}

export class OpenaiProvider implements FournisseurIA {
  private readonly endpoint: string
  private readonly maxTokens: number

  constructor(private readonly config: ConfigOpenaiProvider) {
    this.endpoint = config.endpoint ?? ENDPOINT_PAR_DEFAUT
    this.maxTokens = config.maxTokens ?? MAX_TOKENS_PAR_DEFAUT
  }

  async envoyerMessage(
    systemPrompt: string,
    userMessage: string,
    modele: string,
  ): Promise<ResultatEnvoiIA> {
    let reponse: Response
    try {
      reponse = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.cleApi}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modele,
          max_tokens: this.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      })
    } catch {
      throw new ErreurFournisseurIA('Appel réseau au fournisseur ChatGPT échoué.', null)
    }

    if (!reponse.ok) {
      const message = await messageErreur(reponse)
      throw new ErreurFournisseurIA(
        `Appel ChatGPT refusé (statut ${reponse.status}) : ${message}`,
        reponse.status,
      )
    }

    const corps = (await reponse.json()) as ReponseChatCompletionsOpenai
    const texte = corps.choices?.[0]?.message?.content ?? ''

    if (texte.length === 0) {
      throw new ErreurFournisseurIA('Réponse ChatGPT sans contenu textuel exploitable.', null)
    }

    return { texte, version_moteur: corps.model ?? null }
  }
}

async function messageErreur(reponse: Response): Promise<string> {
  try {
    const corps = (await reponse.json()) as ReponseErreurOpenai
    return corps.error?.message ?? 'erreur inconnue'
  } catch {
    return 'erreur inconnue'
  }
}

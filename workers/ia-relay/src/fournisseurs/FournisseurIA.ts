/**
 * Contrat commun à tout fournisseur IA relayé par ce Worker — même pattern
 * exact que `workers/ocr-relay/src/fournisseurs/FournisseurOcr.ts`
 * (interface swappable : `relayHandler.ts` ne connaît que ce contrat,
 * jamais un fournisseur concret directement).
 *
 * Fournisseur initial : Claude (Anthropic) — décision déjà actée en
 * conception (`09-architecture-detaillee.md` §10 : "fournisseur IA cloud
 * payant, Claude par défaut"), jamais un choix fabriqué ici. Remplacer ou
 * ajouter un fournisseur (ex. OpenAI) n'exige de modifier ni
 * `relayHandler.ts` ni le contrat client (`RelayProviderAdapter` côté
 * PWA) — seul un nouveau fichier `fournisseurs/*.ts` implémentant ce
 * contrat est nécessaire.
 */

export interface ResultatEnvoiIA {
  texte: string
  /** Identifiant de version de modèle, quand le fournisseur l'expose. */
  version_moteur: string | null
}

/**
 * Erreur typée distinguant un quota/débit dépassé (`statutHttp: 429`,
 * jamais de bascule automatique côté client, cf. `QuotaExceededError`)
 * d'une indisponibilité générique (tout le reste, cf. `IndisponibleError`)
 * — même distinction que `src/connecteurs/ia/erreurs.ts`, appliquée ici
 * côté serveur avant que `relayHandler.ts` ne traduise en code HTTP.
 */
export class ErreurFournisseurIA extends Error {
  constructor(
    message: string,
    readonly statutHttp: number | null,
  ) {
    super(message)
    this.name = 'ErreurFournisseurIA'
  }
}

export interface FournisseurIA {
  /**
   * @param systemPrompt Cadrage fixe du relais (jamais un prompt engineered
   * par mode — pour `audit_simule`, `userMessage` porte déjà le prompt
   * enrichi construit côté navigateur par `construirePromptAuditSimule`,
   * cf. `docs/GUIDE-UTILISATEUR.md` §28 : "toujours la question brute qui
   * s'affiche... jamais le prompt réellement enrichi").
   * @param modele Identifiant de modèle résolu par `relayHandler.ts` selon
   * le `mode` de la requête — ce fournisseur ne décide jamais lui-même du
   * modèle.
   */
  envoyerMessage(
    systemPrompt: string,
    userMessage: string,
    modele: string,
  ): Promise<ResultatEnvoiIA>
}

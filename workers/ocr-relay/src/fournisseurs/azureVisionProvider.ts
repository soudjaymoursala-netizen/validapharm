import type { FournisseurOcr, ResultatExtractionOcr } from './FournisseurOcr'

/**
 * Fournisseur Azure AI Vision — Read API v3.2 (asynchrone : soumission,
 * puis interrogation du résultat par sondage, contrairement à un appel
 * synchrone classique). Contrat REST documenté par Microsoft (dernière
 * vérification par recherche le 25/08/2026 — **à revérifier contre la
 * documentation Azure au moment du déploiement réel**, aucune vérification
 * en environnement réel n'a été possible depuis cette session) :
 *
 * 1. `POST {endpoint}/vision/v3.2/read/analyze` (en-tête
 *    `Ocp-Apim-Subscription-Key`, corps = octets bruts de l'image,
 *    `Content-Type` transmis tel quel) → `202 Accepted` avec un en-tête
 *    `Operation-Location` donnant l'URL de sondage.
 * 2. `GET {Operation-Location}` (même en-tête de clé), répété jusqu'à ce
 *    que `status` vaille `succeeded` (ou `failed`) : `analyzeResult.
 *    readResults[].lines[].text` porte le texte extrait, par page et par
 *    ligne.
 *
 * Aucune donnée n'est conservée par ce fournisseur au-delà du traitement
 * de la requête en cours (principe d'absence d'état appliqué par
 * analogie au relais OCR) — le sondage interroge Azure lui-même,
 * ce Worker ne persiste rien de son côté.
 */
export interface ConfigAzureVisionProvider {
  endpoint: string
  cleAbonnement: string
  /** Nombre maximal de sondages avant abandon (évite une boucle infinie si Azure ne conclut jamais). */
  nombreSondagesMax?: number
  /** Délai entre deux sondages, en ms. */
  delaiSondageMs?: number
}

const NOMBRE_SONDAGES_MAX_PAR_DEFAUT = 15
const DELAI_SONDAGE_MS_PAR_DEFAUT = 1000

interface ReponseSondageAzure {
  status: 'notStarted' | 'running' | 'succeeded' | 'failed'
  analyzeResult?: {
    version?: string
    readResults?: Array<{
      lines?: Array<{ text?: string }>
    }>
  }
}

export class AzureVisionProvider implements FournisseurOcr {
  constructor(private readonly config: ConfigAzureVisionProvider) {}

  async extraireTexte(
    imageBytes: ArrayBuffer,
    contentType: string,
  ): Promise<ResultatExtractionOcr> {
    const operationLocation = await this.soumettre(imageBytes, contentType)
    const resultat = await this.sonder(operationLocation)
    return {
      texte: extraireTexteDesLignes(resultat),
      fournisseur: 'azure_ai_vision',
      version_moteur: resultat.analyzeResult?.version ?? null,
    }
  }

  private async soumettre(imageBytes: ArrayBuffer, contentType: string): Promise<string> {
    const reponse = await fetch(`${this.config.endpoint}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.cleAbonnement,
        'Content-Type': contentType,
      },
      body: imageBytes,
    })

    if (reponse.status !== 202) {
      throw new Error(`Soumission Azure Vision refusée (statut ${reponse.status}).`)
    }
    const operationLocation = reponse.headers.get('Operation-Location')
    if (!operationLocation) {
      throw new Error("Réponse Azure Vision sans en-tête 'Operation-Location'.")
    }
    return operationLocation
  }

  private async sonder(operationLocation: string): Promise<ReponseSondageAzure> {
    const nombreSondagesMax = this.config.nombreSondagesMax ?? NOMBRE_SONDAGES_MAX_PAR_DEFAUT
    const delaiSondageMs = this.config.delaiSondageMs ?? DELAI_SONDAGE_MS_PAR_DEFAUT

    for (let tentative = 0; tentative < nombreSondagesMax; tentative++) {
      const reponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': this.config.cleAbonnement },
      })
      if (!reponse.ok) {
        throw new Error(`Sondage Azure Vision échoué (statut ${reponse.status}).`)
      }
      const corps = (await reponse.json()) as ReponseSondageAzure
      if (corps.status === 'succeeded') return corps
      if (corps.status === 'failed') {
        throw new Error("Extraction Azure Vision terminée en échec ('failed').")
      }
      await new Promise((resolve) => setTimeout(resolve, delaiSondageMs))
    }
    throw new Error(`Extraction Azure Vision non conclue après ${nombreSondagesMax} sondages.`)
  }
}

function extraireTexteDesLignes(resultat: ReponseSondageAzure): string {
  const pages = resultat.analyzeResult?.readResults ?? []
  return pages
    .flatMap((page) => page.lines ?? [])
    .map((ligne) => ligne.text ?? '')
    .join('\n')
}

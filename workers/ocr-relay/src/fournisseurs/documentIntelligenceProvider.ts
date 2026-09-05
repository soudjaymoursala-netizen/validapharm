import type { FournisseurOcr, ResultatExtractionOcr, TableauOcr } from './FournisseurOcr'

/**
 * Fournisseur Azure AI Document Intelligence — modèle `prebuilt-layout`
 * (point 2 de la
 * demande explicite de l'utilisateur, "voir dans tous les catalogues s'il
 * y a des outils pour parser lire et comprendre des tableaux [...] sous
 * tableau"). Contrairement à `AzureVisionProvider` (Read API, lignes de
 * texte plates uniquement), ce modèle reconstruit nativement la structure
 * ligne/colonne/cellule d'un tableau, sur image **et** PDF — pertinent
 * pour une SOP scannée avec des étapes présentées en tableau (même genre
 * que `extraireTableauxDocx`, mais pour un document
 * numérisé plutôt qu'un `.docx` natif).
 *
 * Contrat REST documenté d'après connaissance de formation (dernière
 * vérification par recherche le 27/08/2026 : `learn.microsoft.com` et
 * `azure.microsoft.com` étaient bloqués par le proxy réseau de cette
 * session — **à revérifier contre la documentation Azure au moment du
 * déploiement réel**, aucune vérification en environnement réel n'a été
 * possible depuis cette session, même réserve que `azureVisionProvider.ts`) :
 *
 * 1. `POST {endpoint}/documentintelligence/documentModels/prebuilt-layout:
 *    analyze?api-version={VERSION_API}` (en-tête `Ocp-Apim-Subscription-Key`,
 *    corps = octets bruts, `Content-Type` transmis tel quel — image *ou*
 *    `application/pdf`) → `202 Accepted` avec `Operation-Location`.
 * 2. `GET {Operation-Location}` (même en-tête de clé), répété jusqu'à ce
 *    que `status` vaille `succeeded`/`failed` : `analyzeResult.content`
 *    porte le texte brut complet, `analyzeResult.tables[].cells[]`
 *    (`rowIndex`/`columnIndex`/`content`) porte la structure des tableaux.
 *
 * **Non câblé comme fournisseur actif** (`index.ts` reste sur
 * `AzureVisionProvider`) — ajouter/remplacer un fournisseur est un choix
 * de compte Azure (quota, coût potentiel) qui revient explicitement à
 * l'utilisateur, jamais une bascule silencieuse. Ce fichier rend la
 * capacité disponible, prête à être activée sur décision explicite —
 * exactement le rôle pour lequel l'interface `FournisseurOcr` a été
 * conçue (voir son docstring).
 *
 * **`ocrHandler.ts` rejette aujourd'hui tout `Content-Type` qui ne
 * commence pas par `image/`** — router un PDF vers ce fournisseur
 * demanderait d'assouplir cette garde, non fait ici (changerait le
 * contrat de la requête, hors périmètre de ce lot).
 */
export interface ConfigDocumentIntelligenceProvider {
  endpoint: string
  cleAbonnement: string
  /** Nombre maximal de sondages avant abandon (évite une boucle infinie si Azure ne conclut jamais). */
  nombreSondagesMax?: number
  /** Délai entre deux sondages, en ms. */
  delaiSondageMs?: number
}

const NOMBRE_SONDAGES_MAX_PAR_DEFAUT = 15
const DELAI_SONDAGE_MS_PAR_DEFAUT = 1000
const VERSION_API = '2024-11-30'

interface CelluleTableauAzure {
  rowIndex: number
  columnIndex: number
  content?: string
}

interface TableauAzure {
  rowCount: number
  columnCount: number
  cells?: CelluleTableauAzure[]
}

interface ReponseSondageDocumentIntelligence {
  status: 'notStarted' | 'running' | 'succeeded' | 'failed'
  analyzeResult?: {
    apiVersion?: string
    content?: string
    tables?: TableauAzure[]
  }
}

export class DocumentIntelligenceProvider implements FournisseurOcr {
  constructor(private readonly config: ConfigDocumentIntelligenceProvider) {}

  async extraireTexte(
    imageBytes: ArrayBuffer,
    contentType: string,
  ): Promise<ResultatExtractionOcr> {
    const operationLocation = await this.soumettre(imageBytes, contentType)
    const resultat = await this.sonder(operationLocation)
    return {
      texte: resultat.analyzeResult?.content ?? '',
      fournisseur: 'azure_document_intelligence',
      version_moteur: resultat.analyzeResult?.apiVersion ?? null,
      tableaux: reconstruireTableaux(resultat.analyzeResult?.tables ?? []),
    }
  }

  private async soumettre(imageBytes: ArrayBuffer, contentType: string): Promise<string> {
    const reponse = await fetch(
      `${this.config.endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=${VERSION_API}`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.cleAbonnement,
          'Content-Type': contentType,
        },
        body: imageBytes,
      },
    )

    if (reponse.status !== 202) {
      throw new Error(`Soumission Document Intelligence refusée (statut ${reponse.status}).`)
    }
    const operationLocation = reponse.headers.get('Operation-Location')
    if (!operationLocation) {
      throw new Error("Réponse Document Intelligence sans en-tête 'Operation-Location'.")
    }
    return operationLocation
  }

  private async sonder(operationLocation: string): Promise<ReponseSondageDocumentIntelligence> {
    const nombreSondagesMax = this.config.nombreSondagesMax ?? NOMBRE_SONDAGES_MAX_PAR_DEFAUT
    const delaiSondageMs = this.config.delaiSondageMs ?? DELAI_SONDAGE_MS_PAR_DEFAUT

    for (let tentative = 0; tentative < nombreSondagesMax; tentative++) {
      const reponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': this.config.cleAbonnement },
      })
      if (!reponse.ok) {
        throw new Error(`Sondage Document Intelligence échoué (statut ${reponse.status}).`)
      }
      const corps = (await reponse.json()) as ReponseSondageDocumentIntelligence
      if (corps.status === 'succeeded') return corps
      if (corps.status === 'failed') {
        throw new Error("Extraction Document Intelligence terminée en échec ('failed').")
      }
      await new Promise((resolve) => setTimeout(resolve, delaiSondageMs))
    }
    throw new Error(
      `Extraction Document Intelligence non conclue après ${nombreSondagesMax} sondages.`,
    )
  }
}

/** Reconstruit une grille dense (lignes × colonnes) à partir de la liste plate de cellules Azure — une cellule absente (fusion, ou simplement non renvoyée) reste une chaîne vide, jamais un contenu deviné. */
function reconstruireTableaux(tables: TableauAzure[]): TableauOcr[] {
  return tables.map((table) => {
    const lignes: string[][] = Array.from({ length: table.rowCount }, () =>
      new Array<string>(table.columnCount).fill(''),
    )
    for (const cellule of table.cells ?? []) {
      const ligne = lignes[cellule.rowIndex]
      if (ligne && cellule.columnIndex < ligne.length) {
        ligne[cellule.columnIndex] = (cellule.content ?? '').trim()
      }
    }
    return { lignes }
  })
}

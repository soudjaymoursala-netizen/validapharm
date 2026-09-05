import { GitHubConnector, type ConfigGitHubConnector } from '../github/GitHubConnector'
import type { ConnecteurDocumentaire, DocumentExterne } from './ConnecteurDocumentaire'

/**
 * ADAPT : enveloppe `GitHubConnector` déjà existant et testé,
 * sans réécrire sa logique validée — première implémentation concrète de
 * `ConnecteurDocumentaire`. `GitHubConnector` reste le connecteur de
 * source de vérité de ValidaPharm lui-même ; cet adaptateur ne
 * fait qu'exposer le même contrat générique que les futurs connecteurs
 * QMS tiers.
 */
export class GitHubDocumentConnectorAdapter implements ConnecteurDocumentaire {
  private readonly connecteur: GitHubConnector

  constructor(config: ConfigGitHubConnector) {
    this.connecteur = new GitHubConnector(config)
  }

  async tester(): Promise<boolean> {
    await this.connecteur.shaBrancheActuel()
    return true
  }

  async listerDocuments(): Promise<DocumentExterne[]> {
    const arborescence = await this.connecteur.chargerArborescence()
    return arborescence.map((entree) => ({ identifiant: entree.sha, libelle: entree.chemin }))
  }

  async lireDocument(identifiant: string): Promise<string> {
    return this.connecteur.lireBlob(identifiant)
  }
}

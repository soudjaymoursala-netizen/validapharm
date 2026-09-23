import type { Connector } from '../../logique-metier/domaine/types'
import { DriveDocumentConnectorAdapter } from './DriveDocumentConnectorAdapter'
import { GitHubDocumentConnectorAdapter } from './GitHubDocumentConnectorAdapter'
import { OperationNonSupporteeError } from './erreurs'
import type { ConnecteurDocumentaire } from './ConnecteurDocumentaire'
import { VeevaVaultConnectorAdapter } from './VeevaVaultConnectorAdapter'

/**
 * Fabrique l'adaptateur `ConnecteurDocumentaire` concret correspondant au
 * `type` d'un `Connector` — seul point du code qui connaît la
 * correspondance type→classe, jamais dupliqué ailleurs (`useConnecteursQMSStore.tirerDocuments`).
 * `sharepoint`/`dossier_reseau`/`edms_generique` restent non implémentés
 * (voir `PHASE_10_INTEGRATION_GATEWAY_SPEC.md` §4) — lève une erreur typée
 * plutôt qu'un adaptateur factice.
 */
export function instancierConnecteurDocumentaire(connecteur: Connector): ConnecteurDocumentaire {
  switch (connecteur.type) {
    case 'github':
      return new GitHubDocumentConnectorAdapter({
        owner: connecteur.config.owner,
        repo: connecteur.config.repo,
        jeton: connecteur.config.jeton,
        ...(connecteur.config.branche ? { branche: connecteur.config.branche } : {}),
      })
    case 'google_drive':
      return new DriveDocumentConnectorAdapter(connecteur.config)
    case 'veeva_vault':
      return new VeevaVaultConnectorAdapter(connecteur.config)
    case 'sharepoint':
    case 'dossier_reseau':
    case 'edms_generique':
      throw new OperationNonSupporteeError(
        `Adaptateur non implémenté pour le type de connecteur "${connecteur.type}".`,
      )
  }
}

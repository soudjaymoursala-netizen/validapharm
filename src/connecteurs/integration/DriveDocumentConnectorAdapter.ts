import { DriveConnector, type ConfigDriveConnector } from '../drive/DriveConnector'
import { OperationNonSupporteeError } from './erreurs'
import type { ConnecteurDocumentaire, DocumentExterne } from './ConnecteurDocumentaire'

/**
 * ADAPT (TD-005) : enveloppe `DriveConnector` déjà existant et testé.
 * `DriveConnector` est un miroir d'écriture seule ("jamais lu
 * comme source") — `listerDocuments`/`lireDocument` lèvent donc
 * délibérément `OperationNonSupporteeError`, ce n'est pas un oubli.
 */
export class DriveDocumentConnectorAdapter implements ConnecteurDocumentaire {
  private readonly connecteur: DriveConnector

  constructor(config: ConfigDriveConnector) {
    this.connecteur = new DriveConnector(config)
  }

  async tester(): Promise<boolean> {
    await this.connecteur.verifierDossier()
    return true
  }

  async listerDocuments(): Promise<DocumentExterne[]> {
    throw new OperationNonSupporteeError(
      'Le miroir Drive est écriture seule — jamais lu comme source de documents.',
    )
  }

  async lireDocument(): Promise<string> {
    throw new OperationNonSupporteeError(
      'Le miroir Drive est écriture seule — jamais lu comme source de documents.',
    )
  }
}

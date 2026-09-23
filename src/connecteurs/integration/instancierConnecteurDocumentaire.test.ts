import { describe, expect, test } from 'vitest'
import type { Connector } from '../../logique-metier/domaine/types'
import { DriveDocumentConnectorAdapter } from './DriveDocumentConnectorAdapter'
import { GitHubDocumentConnectorAdapter } from './GitHubDocumentConnectorAdapter'
import { instancierConnecteurDocumentaire } from './instancierConnecteurDocumentaire'
import { OperationNonSupporteeError } from './erreurs'
import { VeevaVaultConnectorAdapter } from './VeevaVaultConnectorAdapter'

const BASE: Pick<Connector, 'id' | 'client_id' | 'nom' | 'actif' | 'created_at'> = {
  id: 'connecteur-1',
  client_id: 'client-1',
  nom: 'Connecteur de test',
  actif: true,
  created_at: '2026-01-01T00:00:00.000Z',
}

describe('instancierConnecteurDocumentaire', () => {
  test('github -> GitHubDocumentConnectorAdapter', () => {
    const adaptateur = instancierConnecteurDocumentaire({
      ...BASE,
      type: 'github',
      config: { owner: 'client', repo: 'depot', branche: null, jeton: 'x' },
    })
    expect(adaptateur).toBeInstanceOf(GitHubDocumentConnectorAdapter)
  })

  test('google_drive -> DriveDocumentConnectorAdapter', () => {
    const adaptateur = instancierConnecteurDocumentaire({
      ...BASE,
      type: 'google_drive',
      config: { dossierId: 'dossier-1', jeton: 'x' },
    })
    expect(adaptateur).toBeInstanceOf(DriveDocumentConnectorAdapter)
  })

  test('veeva_vault -> VeevaVaultConnectorAdapter', () => {
    const adaptateur = instancierConnecteurDocumentaire({
      ...BASE,
      type: 'veeva_vault',
      config: { vaultDns: 'client.veevavault.com', nomUtilisateur: 'u', motDePasse: 'p' },
    })
    expect(adaptateur).toBeInstanceOf(VeevaVaultConnectorAdapter)
  })

  test.each(['sharepoint', 'dossier_reseau', 'edms_generique'] as const)(
    '%s -> adaptateur non implémenté, jamais un adaptateur factice',
    (type) => {
      const connecteur: Connector =
        type === 'sharepoint'
          ? { ...BASE, type, config: { siteUrl: 'https://x', jeton: 'x' } }
          : type === 'dossier_reseau'
            ? { ...BASE, type, config: { chemin: '\\\\serveur\\partage' } }
            : { ...BASE, type, config: { url: 'https://x', jeton: 'x' } }
      expect(() => instancierConnecteurDocumentaire(connecteur)).toThrow(OperationNonSupporteeError)
    },
  )
})

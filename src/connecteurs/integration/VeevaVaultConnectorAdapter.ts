import type { ConfigConnectorVeevaVault } from '../../logique-metier/domaine/types'
import { AuthentificationError, DocumentIntrouvableError, IndisponibleError } from './erreurs'
import type { ConnecteurDocumentaire, DocumentExterne } from './ConnecteurDocumentaire'

const VERSION_API = 'v25.1'

/**
 * Squelette d'adaptateur Veeva Vault (Phase 10, spec
 * `docs/convergence/PHASE_10_INTEGRATION_GATEWAY_SPEC.md`) — **non testé
 * en conditions réelles**, aucun compte/identifiant Veeva réel disponible
 * dans cette session (même limite que le relais OCR Azure, Phase 6).
 *
 * Seul le flux d'authentification a été vérifié par recherche web le
 * 25/08/2026 (developer.veevavault.com) : chaque appel à l'API Vault
 * nécessite un jeton de session ("session ID") obtenu via l'endpoint
 * d'authentification, puis transmis dans l'en-tête `Authorization` de
 * chaque requête suivante. Les chemins d'endpoints ci-dessous
 * (`/objects/documents`) suivent le pattern documenté publiquement mais
 * n'ont **pas** été appelés en conditions réelles — à reverifier contre la
 * documentation Vault live avant tout déploiement réel.
 */
export class VeevaVaultConnectorAdapter implements ConnecteurDocumentaire {
  private sessionId: string | null = null

  constructor(private readonly config: ConfigConnectorVeevaVault) {}

  private async authentifier(): Promise<string> {
    if (this.sessionId) return this.sessionId

    const reponse = await fetch(`https://${this.config.vaultDns}/api/${VERSION_API}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: this.config.nomUtilisateur,
        password: this.config.motDePasse,
      }),
    })
    if (!reponse.ok) throw new AuthentificationError()

    const corps = (await reponse.json()) as { responseStatus: string; sessionId?: string }
    if (corps.responseStatus !== 'SUCCESS' || !corps.sessionId) throw new AuthentificationError()

    this.sessionId = corps.sessionId
    return this.sessionId
  }

  async tester(): Promise<boolean> {
    await this.authentifier()
    return true
  }

  async listerDocuments(): Promise<DocumentExterne[]> {
    const sessionId = await this.authentifier()
    const reponse = await fetch(
      `https://${this.config.vaultDns}/api/${VERSION_API}/objects/documents`,
      { headers: { Authorization: sessionId } },
    )
    if (!reponse.ok) throw new IndisponibleError()

    const corps = (await reponse.json()) as {
      documents?: Array<{ document: { id: number; name__v: string } }>
    }
    return (corps.documents ?? []).map((entree) => ({
      identifiant: String(entree.document.id),
      libelle: entree.document.name__v,
    }))
  }

  async lireDocument(identifiant: string): Promise<string> {
    const sessionId = await this.authentifier()
    const reponse = await fetch(
      `https://${this.config.vaultDns}/api/${VERSION_API}/objects/documents/${identifiant}/file`,
      { headers: { Authorization: sessionId } },
    )
    if (!reponse.ok) throw new DocumentIntrouvableError()
    return reponse.text()
  }
}

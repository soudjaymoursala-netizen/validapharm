/**
 * Interface générique d'un connecteur documentaire (Phase 10, spec
 * `docs/convergence/PHASE_10_INTEGRATION_GATEWAY_SPEC.md`) — même pattern
 * swappable que `FournisseurOcr` (Phase 6) : chaque système documentaire
 * externe (GitHub, Google Drive, Veeva Vault, SharePoint, dossier réseau,
 * EDMS générique) implémente ce contrat minimal, jamais son propre
 * mécanisme d'accès direct depuis la logique métier.
 */
export interface DocumentExterne {
  identifiant: string
  libelle: string
}

export interface ConnecteurDocumentaire {
  /** Vérifie réellement l'accès (authentification, portée) — jamais une simple validation de forme. */
  tester(): Promise<boolean>
  listerDocuments(): Promise<DocumentExterne[]>
  lireDocument(identifiant: string): Promise<string>
}

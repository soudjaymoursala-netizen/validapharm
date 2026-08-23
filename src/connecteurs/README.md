# Connecteurs

Implémentations des contrats d'interface : GitHub (`GitHubConnector`, SDS §5 — API GitHub, jamais un `git` local), Drive (`DriveConnector`, SDS §5bis — API Drive), IA — `ProviderAdapter` (SDS §6), QMS tiers — `QMSConnectorAdapter` (SDS §6bis). Exclusivement des appels API HTTPS — aucun accès disque natif, cohérent avec l'architecture web pure (SDS §10). Chaque connecteur lève des exceptions typées distinctes (jamais une exception générique) — voir SDS pour le contrat d'erreur de chacun.

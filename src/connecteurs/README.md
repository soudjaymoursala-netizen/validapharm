# Connecteurs

Implémentations des contrats d'interface : GitHub (`GitHubConnector` — API GitHub, jamais un `git` local), Drive (`DriveConnector` — API Drive), IA — `ProviderAdapter`, QMS tiers — `QMSConnectorAdapter`. Exclusivement des appels API HTTPS — aucun accès disque natif, cohérent avec l'architecture web pure. Chaque connecteur lève des exceptions typées distinctes (jamais une exception générique) — voir la conception interne pour le contrat d'erreur de chacun.

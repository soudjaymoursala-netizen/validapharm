# Persistance

Cache local (IndexedDB) — miroir de performance/hors-ligne, jamais la source de vérité (qui est le dépôt GitHub, accédé via `src/connecteurs/`). Migration de schéma (montée et descente/rollback, garde de compatibilité). Aucune logique de présentation ici, aucun accès disque natif (architecture web pure).

# Persistance

Cache local (IndexedDB, SDS §3) — miroir de performance/hors-ligne, jamais la source de vérité (qui est le dépôt GitHub, accédé via `src/connecteurs/`). Migration de schéma (montée : URS-NF-046 ; descente/rollback : URS-NF-055bis, garde de compatibilité). Aucune logique de présentation ici, aucun accès disque natif (architecture web pure, SDS §10).

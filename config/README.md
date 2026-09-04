# Configuration locale (non versionnée)

Ce dossier accueille la configuration locale de l'instance ValidaPharm : clés API des fournisseurs IA, jetons Git, secrets des connecteurs QMS tiers (Veeva/SAP/TrackWise), isolés par `client_id` (SDS §6bis, §7).

Aucun fichier de secrets réel ne doit être suivi par Git : voir `.gitignore` (`config/secrets.local.json`).

Structure attendue (créée au premier lancement, pas encore implémentée — choix de framework différé, SDS §10) :

```
config/
  secrets.local.json   # NON VERSIONNÉ — clés API par client_id, par fournisseur
```

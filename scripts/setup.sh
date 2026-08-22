#!/usr/bin/env bash
# Prépare l'environnement local de conception ValidaPharm (SDS §5, §7).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

chmod +x scripts/hooks/pre-commit
cp scripts/hooks/pre-commit .git/hooks/pre-commit
echo "Hook pre-commit (scan de secrets) installé."

# Driver de fusion applicatif JSON (SDS §5 — désactive la fusion par ligne de Git
# sur data/sections/*.json, tout conflit passe par la résolution applicative).
# Stub Phase 1 : rejette la fusion automatique en signalant un conflit explicite,
# à remplacer par l'implémentation réelle (diff structuré, FDS §3.6) lors du choix
# de framework (SDS §10).
git config merge.validapharm-json.name "Résolution applicative des sections ValidaPharm (SDS §5)"
git config merge.validapharm-json.driver "scripts/hooks/merge-validapharm-json.sh %O %A %B"
echo "Driver de fusion 'validapharm-json' configuré."

echo "Environnement de conception prêt."

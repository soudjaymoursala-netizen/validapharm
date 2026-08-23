#!/usr/bin/env bash
# Prépare l'environnement local de conception ValidaPharm (dépôt de conception,
# distinct de l'application déployée — voir docs/08-conventions-codage.md).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

chmod +x scripts/hooks/pre-commit
cp scripts/hooks/pre-commit .git/hooks/pre-commit
echo "Hook pre-commit (scan de secrets) installé."

echo "Environnement de conception prêt."

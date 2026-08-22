#!/usr/bin/env bash
# Driver de fusion Git pour data/sections/*.json (SDS §5).
# Stub Phase 1 : la fusion automatique par ligne de Git est désactivée par design
# (.gitattributes). Ce script ne tente aucune fusion textuelle : il échoue
# systématiquement pour forcer le passage par l'écran de résolution applicative
# (FDS §3.6), qui charge les deux versions en mémoire et calcule un diff structuré
# champ par champ / ligne par ligne — jamais les marqueurs Git bruts.
# %O = base commune, %A = version locale, %B = version distante
echo "merge-validapharm-json: fusion automatique désactivée pour $2 — résolution requise via l'application (FDS §3.6)." >&2
exit 1

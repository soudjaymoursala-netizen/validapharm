# Couche Logique métier

Fonctions pures, testables indépendamment de l'UI. N'importe **jamais** `src/presentation/` — vérifié par `eslint.config.js` (règle bloquante, pas seulement une convention).

- `moteur-calcul/` — `calculerIPR`, `evaluerGrilleQualification`, ...
- `machine-etats/` — transitions de statut (section, `qualification_status`)
- `structure-systeme/` — `validerAbsenceDeCycle`, `niveauUtilise`, `presenterStatut`
- `resolution-conflit/` — diff structuré sur conflit de SHA détecté par l'API GitHub

Chaque fonction : bloc TSDoc avec `@requirement` (voir `docs/08-conventions-codage.md` §4), fichier de test à côté (`x.ts` + `x.test.ts`).

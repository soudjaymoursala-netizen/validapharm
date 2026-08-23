# Revue multi-experts — Charte graphique et identité visuelle

| | |
|---|---|
| **Référence** | REV-FDS-VALIDAPHARM-2026-003 |
| **Objet** | Challenger la proposition de charte graphique (direction "Indigo premium + accents vifs") avant intégration dans URS/FS/FDS/SDS |
| **Panel** | E1 Fournisseur/IA-GAMP5-Part11, E2 Qualité/SMQ, E3 QA Réglementaire, E4 CSV, E5 Architecte logiciel, E6 Métrologie, E7 Maintenance |
| **Statut** | Clos |

## Constats retenus

1. **E5 (Architecte logiciel)** — La proposition initiale ne précisait pas comment garantir techniquement que les jetons de couleur/typographie de l'écran ne puissent jamais fuiter dans le moteur d'export. Intégré : SDS §7bis précise l'absence de partage technique de jetons entre les deux registres (pas seulement une convention documentaire).
2. **E4 (CSV)** — Le principe "densité d'information élevée" pourrait, mal borné, produire un corps de texte trop petit pour un usage prolongé (fatigue visuelle, public professionnel senior inclus). Intégré : ajout d'une taille de police minimale pour le corps de texte en FDS §2bis (14px équivalent, ou unité relative correspondante selon le framework retenu).
3. **E7 (Maintenance)** — Le mode sombre était présenté comme "optionnel Phase 1" sans trancher, ce qui laisserait la question ouverte jusqu'à l'implémentation et risquerait un choix par défaut non assumé. Intégré : mode sombre explicitement classé **Should** (souhaitable, non bloquant), pas Must, pour ne pas alourdir la Phase 1 — cohérent avec le principe de proportionnalité déjà appliqué ailleurs dans le projet.
4. **E3 (QA Réglementaire)** — A demandé confirmation que la séparation écran/export (URS-NF-054bis) couvre aussi les captures d'écran éventuellement insérées dans un livrable (ex. copie d'un graphique de tendance). Clarifié : toute image issue de l'écran insérée dans un livrable exporté reste hors du principe de séparation stricte des jetons (ce n'est pas un rendu automatique, mais un contenu explicitement choisi par l'utilisateur) — pas de nouvel ID nécessaire, la distinction "génération automatique d'export" vs "contenu inséré manuellement" était déjà implicite mais méritait d'être dite.

## Points non retenus (pour crédibilité de la revue)

- **E1** a proposé un système d'icônes entièrement personnalisé (jeu d'icônes propriétaire ValidaPharm) plutôt que des icônes standard. Non retenu en l'état : surcoût de conception disproportionné pour la Phase 1, aucun bénéfice fonctionnel identifié vs un jeu d'icônes existant cohérent — à revisiter si une identité de marque plus poussée est demandée en phase ultérieure.
- **E2** a suggéré un logo distinct du nom "ValidaPharm" en typographie. Non retenu : usage interne mono-utilisateur en Phase 1, aucun besoin de reconnaissance de marque externe à ce stade.

## Suite

Transmis pour audit ciblé accessibilité/facteurs humains (calibré : pas les 4 audits complets Swissmedic/FDA/cabinet GxP/QA — la palette de couleur n'est pas un sujet réglementaire opposable, mais la confusion de statut par un utilisateur daltonien est un vrai risque qualité résiduel, cf. AR-R-59).

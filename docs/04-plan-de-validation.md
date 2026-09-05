# Plan de validation de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | VMP-VALIDAPHARM-2026-001 |
| **Version** | 01 (brouillon de travail) |
| **Statut** | En rédaction |
| **Documents de référence** | AR-VALIDAPHARM-2026-001 |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

> ⚠️ **DOCUMENT À REVOIR (constaté le 21/08/2026 lors d'un audit de cohérence)**: ce Plan de validation v01 référence URS v01/AR v01/spécification fonctionnelle v01, aujourd'hui dépassées (URS en v20, catalogue de gabarits élargi à 15 familles, registre de risques passé de 14 à 58 entrées, **les documents de spécification et de conception ont depuis été réécrits et audités** — voir `03-specifications-fonctionnelles.md`). Sa structure (catégorisation GAMP 5, stratégie de vérification proportionnée au risque, étapes IQ/OQ/PQ) reste valide dans son principe, mais son contenu détaillé (§9 "13 gabarits", références R-xx) doit maintenant être mis à jour contre la conception à jour — la condition qui bloquait cette révision est levée. Ne pas utiliser pour piloter des tests réels en l'état.

## 1. Objet et portée

Définir la stratégie de qualification/validation de l'outil ValidaPharm lui-même (version locale, mono-utilisateur), proportionnée au risque identifié dans l'analyse de risque AR-VALIDAPHARM-2026-001, avant toute mise en service pour la production de livrables "approuvés dans l'outil".

Cette version vise un usage personnel; le niveau de rigueur appliqué reste néanmoins celui d'une approche GAMP 5, pour permettre une extension directe sans dette de validation à rattraper.

## 2. Catégorisation GAMP 5

| Composant | Catégorie GAMP 5 | Justification |
|---|---|---|
| Moteur de gabarits et de calcul déterministe | Catégorie 5 (sur mesure) | Logique métier spécifique développée pour cet usage, impact direct sur le contenu des livrables qualité |
| Routeur IA / connecteur chat expert | Catégorie 5 (sur mesure) pour l'orchestration; catégorie 3/4 pour le(s) moteur(s) sous-jacents (API tierce ou modèle local) | Composant d'orchestration développé sur mesure, dépendances tierces non modifiées |
| Bibliothèque de normes | Catégorie 3/4 | Données de référence structurées, faible logique |
| Connecteur Git / synchronisation Drive | Catégorie 4/5 | Configuration + logique de synchronisation développée sur mesure |

## 3. Stratégie de vérification (proportionnée au risque)

Conformément à AR-VALIDAPHARM-2026-001 §5, l'effort de vérification est concentré sur:

1. **Moteur de calcul déterministe** (R-01): tests unitaires systématiques, exécutés à chaque modification, couvrant les cas limites (valeurs nulles, valeurs maximales, échelles 1-5 et 1-10).
2. **Contrôle des statuts / verrouillage des documents approuvés** (R-04, R-05, R-13): tests fonctionnels dédiés au cycle de vie d'un livrable.
3. **Séparation contenu métier / IA cloud** (R-06): test de non-régression spécifique + revue de code ciblée sur le routeur IA.
4. **Continuité des données multi-poste** (R-02, R-03, R-09): test explicite de portabilité (clonage sur un second poste).
5. **Fiabilité perçue du chat expert** (R-07): contrôle de la présence systématique des avertissements, pas de test de "justesse" du contenu généré (non maîtrisable) — maîtrise par la conception (encadrement), pas par le test exhaustif.

Les fonctions à faible risque (ex. mise en forme de l'export PDF, libellés de la bibliothèque de normes) font l'objet d'une vérification allégée (test exploratoire, pas de protocole formel dédié).

## 4. Étapes de qualification

| Étape | Objectif | Référence protocole |
|---|---|---|
| IQ (Installation Qualification) | Vérifier que l'outil est correctement installé/déployé sur un poste (structure de fichiers, dépendances, configuration Git/Drive) | IQ-VALIDAPHARM-2026-001 |
| OQ (Operational Qualification) | Vérifier que chaque fonction opère conformément à la spécification fonctionnelle sur sa plage prévue (gabarits, calculs, statuts, exports, routeur IA) | OQ-VALIDAPHARM-2026-001 |
| PQ (Performance Qualification) | Vérifier la performance en conditions réelles d'utilisation prolongée (plusieurs livrables, plusieurs sessions, plusieurs postes) | PQ-VALIDAPHARM-2026-001 |

## 5. Rôles et responsabilités (mono-utilisateur)

| Rôle | Responsabilité |
|---|---|
| Rédacteur / développeur | Conçoit, développe, exécute les tests, documente les résultats |
| Vérificateur | Revoit les protocoles et résultats avant approbation (peut être la même personne, avec limite reconnue et à lever par une séparation réelle des rôles) |
| Approbateur | Décide de la mise en service de l'outil pour un usage "approuvé dans l'outil" |

**Limite reconnue**: l'absence de séparation stricte rédacteur/vérificateur/approbateur (une seule personne physique) est un écart assumé, documenté ici, à lever explicitement (multi-utilisateur) avant tout usage impliquant plusieurs parties prenantes ou un enjeu réglementaire opposable.

## 6. Livrables du dossier de validation

- [x] Analyse de risque (AR-VALIDAPHARM-2026-001)
- [x] Spécifications fonctionnelles
- [x] Plan de validation (ce document)
- [ ] Protocole et rapport IQ
- [ ] Protocole et rapport OQ
- [ ] Protocole et rapport PQ
- [ ] Matrice de traçabilité complète (URS → spécification fonctionnelle → implémentation → test)
- [ ] Rapport de validation final / synthèse et décision de mise en service

## 7. Gestion des écarts

Tout résultat de test non conforme lors de l'IQ/OQ/PQ est consigné, analysé (impact sur les autres exigences), et classé: bloquant (empêche la mise en service de la fonction concernée) ou mineur (accepté avec action de suivi documentée). Aucun écart bloquant sur un risque prioritaire (R-04, R-06, R-07 — voir AR §4) ne peut être accepté sans action corrective avant mise en service.

## 8. Maintien de l'état validé

- Toute évolution du moteur de calcul ou du cycle de vie des statuts déclenche une ré-exécution des tests unitaires et fonctionnels concernés avant mise à jour (répond à R-11).
- Les gabarits de contenu (normes, structure des livrables) étant versionnés indépendamment du moteur, leur mise à jour n'entraîne pas systématiquement une nouvelle qualification complète — à évaluer au cas par cas selon l'impact.
- Une revue périodique de l'outil (fréquence à définir) sera formalisée lors du passage à l'usage multi-utilisateur.

## 9. Critères d'acceptation (reprise d'URS §9)

1. Les 13 gabarits sont rejouables sans erreur et exportables en Word/PDF/JSON.
2. Aucune donnée n'est perdue après fermeture/réouverture sur le même poste.
3. Les mêmes données sont retrouvées à l'identique après clonage du dépôt Git dédié sur un second poste.
4. Une sauvegarde miroir Drive existe et est à jour après une session de travail.
5. Le chat expert répond en mode cloud quand le réseau est disponible, et bascule visiblement en mode local sinon.
6. Aucun calcul réglementaire n'est jamais généré par l'IA générative — uniquement par le moteur déterministe.

---
*Document vivant, version 01 — à faire vérifier/approuver avant exécution des protocoles IQ/OQ/PQ.*

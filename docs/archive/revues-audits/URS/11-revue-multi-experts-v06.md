# Revue du lot v06 : Contexte procédé, Métrologie/Maintenance, Workflows, Multilingue, Analyse de documents

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-004 |
| **Version** | 01 |
| **Document revu** | URS-VALIDAPHARM-2026-001 v06, AR-VALIDAPHARM-2026-001 v06 |
| **Panel** | E1 Fournisseur/IA-GAMP5-Part11, E2 Qualité/SMQ, E3 QA Réglementaire, E4 CSV, E5 Architecte logiciel/Lead développeur, **E6 Métrologie (nouveau)**, **E7 Maintenance (nouveau)** |

---

## 1. Contexte procédé (URS-F-000septies)

- **E4 (CSV)** : confirme le manque critique — sans CPP/CQA connus, les plages opératoires OQ et les critères d'acceptation PQ ne peuvent pas être correctement définis (Annexe 15 §3.2).
- **E3 (Réglementaire)** : cohérent avec ICH Q8 (Quality by Design).
- **E1** : faisable, section structurée liable comme "Documents" (URS-F-000quater).

**Décision** : intégré tel que proposé, priorité Must/Phase 1. AR R-26 (IPR=45).

## 2. Métrologie et Maintenance (catalogue §10.L/M)

- **E6 (Métrologie, nouveau)** : confirme que le plan de métrologie/étalonnage est un vrai livrable CQV distinct — pas juste une ligne dans une checklist IQ. Recommande qu'il référence les certificats d'étalonnage (lien naturel avec §4.8, analyse de certificats).
- **E7 (Maintenance, nouveau)** : confirme l'ancrage normatif (Annexe 15 §3.12 — finalisation des exigences de maintenance préventive à l'issue de l'OQ). Propose que le plan de maintenance soit lié à la section Équipement du registre (URS-F-071).

**Décision** : intégrés comme nouveaux mini-outils, catalogue §10.

## 3. Workflows rédaction/co-rédaction, revue, approbation (§4.2bis)

- **E4** : confirme qu'un vrai processus qualité suppose plusieurs relecteurs et un approbateur QA distinct — le modèle à champ unique actuel est trop simple pour rester crédible en Phase 3.
- **E1** : faisable comme extension du modèle de statuts existant, sans activer de signature en Phase 1.
- **E2 (Qualité)** : confirme le besoin d'un rôle "Approbateur final = QA" explicite.

**Décision** : intégré, AR R-27 (coût de refonte si non anticipé, IPR=18 — mitigé justement par cette anticipation).

## 4. Multilingue FR/EN/DE (§5.5, URS-NF-040 et suivants)

- **E3 (Réglementaire)** : un terme mal traduit dans un document réglementaire n'est pas cosmétique — chaque langue doit être validée par un expert natif du domaine avant mise en service (URS-NF-040ter), jamais une traduction automatique seule.
- **E1** : l'architecture (textes externalisés) doit supporter RTL/CJK dès la conception même si le chinois/l'arabe arrivent plus tard (URS-NF-040quater) — coût bien moindre à anticiper maintenant qu'à réintégrer après coup.
- **Décision utilisateur déjà actée** : FR/EN/DE en Phase 1, ZH/AR en phases ultérieures.

**Décision** : intégré tel qu'arbitré. AR R-28 (terminologie mal traduite, IPR=36).

## 5. Analyse de documents techniques, certificats, challenge de dossier (§4.8)

- **Point de départ** : tension identifiée avec le principe fondateur n°1 (l'IA ne décide jamais d'une conformité) — **résolue par l'utilisateur** : l'outil identifie/extrait (type de certificat, mesures rapportées, mentions présentes, y compris traduction terminologique pour une langue non maîtrisée) mais ne DOIT JAMAIS émettre de verdict "conforme"/"non conforme" — garde-fou explicite URS-F-083.
- **E4 (CSV)** : valide la distinction entre détection d'écarts structurels (déterministe, basée sur les liens du modèle Projet) et évaluation sémantique fine (IA, toujours proposition).
- **E3 (Réglementaire)** : confirme que cette formulation reste cohérente avec le principe n°1 — c'est la bonne limite à ne pas franchir.
- **E5 (technique)** : l'extraction depuis un PID/schéma complexe reste une limite réelle des LLM actuels sur l'analyse visuelle technique — cohérent avec la priorité "Could" (ambition Phase 3+) plutôt que Must.

**Décision** : intégré avec le garde-fou URS-F-083 comme condition non négociable. AR R-29 (IPR=36), **R-30 (IPR=60, le plus élevé du registre)**, R-31 (IPR=36).

## 6. Point d'attention transversal signalé par le panel

**E3** relève que R-30 (IPR=60) mérite une mention explicite dans toute documentation utilisateur de l'outil : la fonction "challenge de dossier" doit être présentée sans ambiguïté comme une aide à la revue, jamais comme une garantie d'exhaustivité — remarque à reporter dans la future documentation utilisateur (hors périmètre URS, à prévoir en conception).

## 7. Statut

Revue close. Tous les points du lot v06 intégrés à URS v06 et AR v06 (R-26 à R-31). Panel élargi à 7 profils de façon permanente pour les revues futures. Aucun point ouvert bloquant restant.

---
*Revue version 01, close le 21/08/2026.*

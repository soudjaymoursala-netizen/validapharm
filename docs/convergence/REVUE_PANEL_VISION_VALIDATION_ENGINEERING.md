# Revue panel E1-E7 — Vision "Validation Engineering Platform" (26/08/2026)

*Convoquée sur le même principe que `PHASE_13_17_REVUE_PANEL_MOTEUR_RAISONNEMENT.md`, en réponse à un document de vision produit approfondi de l'utilisateur (21 sections: Digital Validation Model, graphe de traçabilité, Continuous Validation State, GxP-by-design, benchmark ValGenesis/Kneat/Veeva/MasterControl) accompagné d'un échantillon UX/UI concurrent (`Sample_UXUI.docx`, 14 captures d'écran réelles).*

Panel repris tel que défini en `00-cadrage-projet.md` §6bis: **E1** Fournisseur/IA-GAMP5-Part11, **E2** Qualité/SMQ, **E3** QA Réglementaire, **E4** CSV, **E5** Architecte logiciel, **E6** Métrologie, **E7** Maintenance.

## Comprendre — ce que ce document confirme (déjà correct, aucune décision à reprendre)

Le document valide, presque mot pour mot, l'architecture déjà construite :
- Le "Digital Validation Model" (Requirement → Risk → Control → Test → Evidence → Deviation) est déjà `03_DOMAIN_DATA_MODEL.md`/`04_RELATIONSHIP_MATRIX_FINAL.md`, déjà la matière du graphe construit (Requirement/Couverture/Test/Execution/Evidence).
- Le rejet explicite de "document generator + chatbot + QMS clone" confirme le pivot Mission/Context/Reasoning Engine plutôt qu'une remise en cause.
- Human-in-the-loop obligatoire, IA jamais autorité seule, explicabilité: déjà le principe fondateur n°1 et le mécanisme des états de confiance discrets.
- GxP-by-design (audit trail, versioning, traçabilité): déjà appliqué (`audit_log` systématique, schéma versionné Dexie, `Confirmation`/`TestCandidate` jamais auto-promus).

**Aucune remise en cause de l'architecture existante — cette vision renforce la direction, elle ne la change pas.**

## Comparer / Identifier — ce qui est réellement nouveau ou en tension

### Point A — "Continuous Validation State" (état de validation vivant, calculé)

Nouveau dans la vision: connaître à tout moment "l'état de validation d'un système et pourquoi", recalculé après un changement (VALIDATED → CHANGE DETECTED → IMPACT ANALYSIS → REQUALIFICATION REQUIRED →... → VALIDATED). **MISSING** — n'existe pas aujourd'hui: `AssetNode.qualification_status` est un statut saisi manuellement (Structure Système), jamais dérivé du graphe.

**Débat**
- **E4 (CSV)**: dériver *automatiquement* `qualification_status` depuis une analyse (option promotion automatique) répéterait l'erreur déjà interdite pour `CriticalParameter → CPP` — une décision réglementaire ne doit jamais s'auto-appliquer, même par simple logique déterministe (invariant #8, principe fondateur n°1).
- **E1**: un état calculé doit rester une **suggestion diagnostique** ("le système semble toujours validé, voici pourquoi / voici ce qui a changé"), jamais une écriture automatique — même patron que `Confirmation`/`TestCandidate`.
- **E3 (QA Réglementaire)**: c'est exactement ce qu'un inspecteur appelle un "état de maîtrise" — une information de grande valeur si elle est calculée et *justifiée* (citations vers les objets du graphe), mais le statut officiel reste un acte humain distinct et déjà tracé.
- **E5 (Architecte)**: réalisable comme une **fonction de lecture pure** au-dessus du graphe déjà construit — voire un nouvel outil du Reasoning Engine plutôt qu'une nouvelle entité stockée. Aucune migration de schéma requise pour un premier incrément.
- **E7 (Maintenance)**: faible risque de dette si c'est une vue calculée à la demande, jamais un champ persistant à maintenir en cohérence.

**Décision**: "Validation State" est une **vue calculée diagnostique**, jamais un champ qui remplace ou écrase `qualification_status` — présentée avec sa justification (citations), review humaine avant tout changement de statut officiel.

### Point B — Tension GxP-by-design (e-signatures, RBAC, ségrégation des tâches) vs. (pas de backend, un seul utilisateur local)

La vision liste electronic signatures/RBAC/segregation-of-duties comme propriétés attendues "dès l'architecture". Ceci **entre en tension directe** avec (25/08/2026: extension serverless plutôt que backend complet, contrainte IT réelle, PWA mono-utilisateur local).

**Débat**
- **E5 (Architecte)**: rouvrir maintenant serait prématuré — rien de nouveau ne démontre un besoin réel multi-utilisateur aujourd'hui; reste fondée sur une contrainte IT réelle documentée.
- **E1/E3**: fabriquer un **semblant** de RBAC/signature électronique purement local (mot de passe par rôle stocké côté client, par exemple) serait **activement dangereux** — cela fabriquerait une fausse preuve de conformité 21 CFR Part 11/Annexe 11, pire que son absence honnête.
- **E2 (Qualité/SMQ)**: la seule option honnête est de documenter explicitement que l'outil, dans son état actuel, ne prétend pas satisfaire l'exigence e-signature/séparation des tâches multi-utilisateurs — l'`audit_log` actuel (horodatage + acteur déclaré) est un premier niveau de traçabilité, pas une signature électronique réglementaire.
- **E7**: documenter n'introduit aucune dette technique.

**Décision**: limite assumée documentée explicitement (`00-cadrage-projet.md`) — n'est **pas** rouverte; **aucun** RBAC/e-signature de façade n'est construit. Un vrai RBAC/e-signature nécessitera un jour un vrai service d'authentification serveur — à trancher quand un besoin réel (client multi-utilisateur) le démontrera.

### Point C — Le Reasoning Engine doit-il gagner des modes d'analyse dédiés ?

La vision détaille deux capacités IA concrètes non couvertes par les 4 outils actuels: (1) analyse de qualité d'exigences (ambiguës/non-testables/doublons — suppose un texte source non structuré, relève de Source Intelligence/, pas du Reasoning Engine actuel); (2) analyse d'impact de changement (Change → Composant → Requirement → Risk → Test → Evidence → Impact Assessment — directement câblable sur le graphe déjà lu par les 4 outils et sur `QualityEvent` (Change Control, déjà construit)).

**Décision**: la prochaine capacité concrète du Reasoning Engine est une **analyse d'impact de changement** ancrée sur `QualityEvent`/`Requirement`/`Test`/`Evidence` déjà construits — prolonge directement le scénario "changement de recette" déjà testé. L'analyse de qualité d'URS reste au backlog (dépend de Source Intelligence, non engagée).

## Enseignements UX du benchmark concurrent (`Sample_UXUI.docx`, captures réelles)

Observations tirées des 14 captures (ValGenesis VLMS, Veeva Quality, Kneat Gx, MasterControl) — à retenir comme inspiration, jamais à copier telles quelles:
- **Matrice de traçabilité en "chips" cliquables** (Kneat Gx): chaque ligne de Requirement affiche ses objets liés (IQ/Test Case/Test Run) comme des étiquettes cliquables avec statut coloré (Satisfied/Not satisfied) — plus lisible qu'un tableau de références textuelles brutes.
- **Diagramme de flux de traçabilité visuel** (ValGenesis Trace Matrix): URS → FRS → OQ/PQ/NEQ avec flèches, complémentaire à la vue tabulaire.
- **Tableau de bord à tuiles avec anneaux de progression** (ValGenesis Home: "High Risks 77%", "Risk Controls", "Productivity 255h") — visuellement dense mais scannable, cohérent avec le principe §13 de la vision ("complexité interne maximale, complexité utilisateur minimale").
- **Risque codé couleur systématique** (1-Low vert / 8-Medium jaune / 27-High rouge) sur chaque ligne d'exigence — déjà un principe établi dans ValidaPharm (`--vp-statut-*`, jamais la couleur seule).
- **Annotations collaboratives inline** (Veeva: commentaires de reviewers directement sur le document) — non retenu comme priorité immédiate, hors périmètre mono-utilisateur actuel (voir Point B).
- **MasterControl** (le plus ancien visuellement, widgets denses non hiérarchisés) illustre le contre-exemple à éviter — confirme que la coquille UX déjà construite (sidebar par intention) est la bonne direction plutôt qu'un mur de tuiles non priorisées.

## Synthèse des décisions actées

| # | Décision | Statut |
|---|---|---|
| A | "Validation State" = vue calculée diagnostique, jamais un remplacement automatique de `qualification_status` | **ACTÉE** — |
| B | non rouverte; aucun RBAC/e-signature de façade; limite assumée documentée | **ACTÉE** — |
| C | Prochaine capacité du Reasoning Engine: analyse d'impact de changement sur `QualityEvent` | **ACTÉE** — |

Ces trois décisions sont reportées dans `TECHNICAL_DECISIONS.md`. Aucun code n'est engagé dans cette revue — alignement documentaire et de vision uniquement, avant reprise du plan.

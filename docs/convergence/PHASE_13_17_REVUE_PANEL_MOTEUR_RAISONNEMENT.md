# Revue panel E1-E7 — Moteur de raisonnement (Mission/Context/AI), Phases 13-17

*26/08/2026 — convoquée sur demande explicite de l'utilisateur ("pour les points bloquants fais appel à tes experts et utilise des méthodes comme BMAD pour prendre la décision") avant d'aligner les documents vivants sur la vision complète décrite dans les deux notes de synthèse précédentes (`docs/convergence/CONVERGENCE_PLAN.md` §Phase 12, artefact "Cible Mission-Centrée").*

Panel repris tel que défini en `00-cadrage-projet.md` §6bis : **E1** Fournisseur/IA-GAMP5-Part11, **E2** Qualité/SMQ, **E3** QA Réglementaire, **E4** CSV, **E5** Architecte logiciel, **E6** Métrologie, **E7** Maintenance. Méthode : débat contradictoire par question, décision explicite avec dissidence tracée si non-consensus (jamais un simple vote).

---

## Question A — Où vit le moteur de raisonnement multi-étapes ?

**Options en présence**
- **A1.** Orchestration côté navigateur (Couche Présentation) : boucle qui appelle l'IA via le relais existant (Cloudflare Worker, sans état), lit les besoins d'information supplémentaire, va chercher les données dans les stores Dexie/Pinia déjà construits (function calling classique), les redonne à l'IA, recommence.
- **A2.** Nouveau backend serveur avec état, hébergeant l'orchestration et un historique de sessions de raisonnement.
- **A3.** Un seul appel LLM par cas, avec tout le contexte pré-assemblé côté client dans un prompt unique (pas de boucle itérative).

**Débat**
- **E5 (Architecte)** : A2 viole directement TD-001 (extension serverless plutôt que backend complet, décision déjà actée le 25/08/2026) sans qu'aucun fait nouveau ne justifie de la rouvrir — écarté. A1 est réalisable avec les briques déjà en place : le relais IA reste un simple proxy masquant la clé, la boucle d'appels et la lecture des stores restent 100 % client-side, cohérent avec l'architecture PWA sans backend. A3 est plus simple mais s'effondre dès qu'un cas réel dépasse la fenêtre de contexte ou nécessite une clarification humaine en cours de route (exactement le scénario §16/§38 de l'utilisateur : "il me manque une information, je la demande, j'attends la réponse, je continue") — A3 ne peut physiquement pas faire ça en un seul appel.
- **E1 (IA-GAMP5-Part11)** : peu importe où vit la boucle, ce qui compte est que chaque appel et chaque outil invoqué soit journalisé (quel outil, quels paramètres, quelle réponse) — sinon aucune reconstruction a posteriori n'est possible. Condition posée : le futur type `AIRequest` doit inclure la trace des appels d'outils, pas seulement le prompt et la réponse finale.
- **E4 (CSV)** : le moteur de raisonnement est lui-même un système informatisé à impact qualité (il influence des décisions de qualification) — sa configuration (prompts, outils, version de modèle) doit être versionnée (`AIConfiguration`, `AIModelVersion`, déjà nommés dans `03_DOMAIN_DATA_MODEL.md`) pour qu'une décision passée reste reconstructible même après une évolution du moteur.
- **E7 (Maintenance)** : A1 réutilise des stores et un relais déjà testés — surface de code nouvelle minimale (un seul module d'orchestration + définitions d'outils). Accord.
- **E2 (Qualité/SMQ)**, **E6 (Métrologie)** : RAS, pas d'impact direct sur cette question.

**Décision** : **A1 retenue**, avec les deux conditions d'E1/E4 intégrées à la spec de la Phase 15 (traçabilité des appels d'outils, configuration versionnée). A3 documenté comme dégradation gracieuse acceptable si l'IA (cloud ou locale) n'est pas disponible pour une boucle complète — un seul appel best-effort, explicitement marqué comme tel, jamais présenté comme équivalent au raisonnement complet.

---

## Question B — Taxonomie de confiance des propositions de l'IA

**Options en présence**
- **B1.** États discrets : `connu / inféré / inconnu / conflit / a_verifier` (proposés dans la note de synthèse précédente).
- **B2.** Binaire : confirmé / non confirmé.
- **B3.** Score de confiance numérique (0-100 %).

**Débat**
- **E1 (IA-GAMP5-Part11)** : B3 est explicitement à écarter — c'est la même erreur que la promotion automatique d'un `Parameter` en `CPP` à partir d'un score de criticité, déjà interdite ailleurs dans ce projet (`01_ARCHITECTURE_MASTER_FINAL.md` §10 : *"Un CPP ne doit jamais être promu automatiquement à partir d'un simple score de criticité"*) — un score numérique invite mécaniquement à fixer un seuil d'acceptation automatique, ce qui viole le principe fondateur n°1 (*"L'IA générative n'est jamais seule source de vérité"*, `00-cadrage-projet.md`).
- **E2 (Qualité/SMQ)** : B2 est insuffisant — il ne distingue pas "je ne sais pas" (l'IA doit poser une question) de "je déduis avec un raisonnement explicite" (l'IA peut proposer, mais l'humain doit voir le raisonnement) ; c'est exactement la distinction que l'utilisateur demande explicitement (§9 : *"KNOWN / INFERRED / UNKNOWN / CONFLICT / NEEDS REVIEW"*).
- **E3 (QA Réglementaire)** : B1 doit rester un état fermé et documenté mot pour mot (même discipline que les statuts `qualification_status` ou `TestCandidate` déjà actée) — jamais un champ libre.
- **E4 (CSV)**, **E5 (Architecte)** : B1 se code naturellement comme un type discriminant, cohérent avec les patterns déjà utilisés (`StatutKnowledgeItem`, `StatutTestCandidate`).

**Décision** : **B1 retenue**, sans modification — reprend en fait la proposition initiale de l'utilisateur presque mot pour mot, le panel confirme qu'elle est la seule cohérente avec le principe fondateur n°1 déjà acté.

---

## Question C — Périmètre du domaine « Work » pour ce premier incrément

**Options en présence**
- **C1.** Construire `Mission` + `Activity` seulement maintenant. Différer `WorkflowDefinition`/`WorkflowInstance`/`Approval` (workflow d'approbation formel générique) à un incrément ultérieur, sur besoin réel démontré.
- **C2.** Construire les cinq entités du domaine "Work" d'un seul coup.

**Débat**
- **E3 (QA Réglementaire)** : un workflow d'approbation générique mal spécifié maintenant (sans cas réel pour le calibrer) risque de fabriquer une mécanique d'approbation qui ne correspond à aucun processus qualité réel documenté — contraire à la règle "ne jamais fabriquer de contenu réglementaire". Il existe déjà un mécanisme d'approbation implicite ailleurs (ex. `QualityEvent`, `Confirmation` en Phase 8a) qui peut suffire tant qu'un vrai besoin de workflow *générique* transverse n'est pas démontré.
- **E5 (Architecte)**, **E7 (Maintenance)** : C2 reproduirait exactement l'erreur que ce chantier corrige — construire une capacité non éprouvée avant d'avoir un cas d'usage réel qui la valide (le lot précédent, "Mission+Context d'abord, UX ensuite", suit déjà cette logique). Cohérent avec TD-004 (séquencement Source Intelligence : structuration d'abord, compréhension de schémas complexes ensuite, "seulement après retour d'expérience réel").
- **E1 (IA-GAMP5-Part11)** : `Mission`/`Activity` suffisent pour que le moteur de raisonnement (Question A) ait un objet à référencer — `WorkflowDefinition`/`Instance`/`Approval` ne sont pas des prérequis techniques pour la Phase 15.

**Décision** : **C1 retenue**. `Mission`/`Activity` construits en Phase 13. `WorkflowDefinition`/`WorkflowInstance`/`Approval` restent nommés dans le modèle cible mais **non engagés**, documentés comme tel dans `CONVERGENCE_PLAN.md` au même titre que `8b`/`9-Generate-Render` déjà différés.

---

## Synthèse des décisions actées

| # | Décision | Statut |
|---|---|---|
| A | Orchestration du raisonnement côté navigateur (relais reste un simple proxy sans état) | **ACTÉE** — TD-007 |
| B | Taxonomie de confiance à 5 états discrets, jamais un score numérique | **ACTÉE** — TD-008 |
| C | Mission + Activity seulement pour ce lot ; Workflow/Approval différés sur besoin réel | **ACTÉE** — TD-009 |

Ces trois décisions sont reportées dans `TECHNICAL_DECISIONS.md` (TD-007 à TD-009) et dans le plan révisé de `CONVERGENCE_PLAN.md` (Phases 13 à 17).

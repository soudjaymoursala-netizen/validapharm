# ARCHITECTURE_CHALLENGES — Contestation argumentée de décisions techniques de la cible

| | |
|---|---|
| **Statut** | 5ᵉ livrable de la Phase 0. Règle appliquée (master prompt §14) : *"Ne challenge pas pour le plaisir"* — seulement si faisabilité, performance, sécurité, coût, complexité, dépendance fournisseur, problème offline/GMP/traçabilité/scalabilité le justifient. Ce document ne remet jamais en cause le **besoin métier** (§15 : *"Business Intent → Technical Challenge → Alternative → Better Technical Design"*, jamais *"→ supprimer le besoin"*). |

---

## CHALLENGE-001 — Diagram Intelligence (P&ID, schémas électriques, automatismes) comme capacité de premier niveau

- **Target Decision** : `08_SOURCE_DOCUMENT_MULTIMODAL.md`/`01_ARCHITECTURE_MASTER_FINAL.md` §20 — un diagramme doit être représenté structurellement (nœuds/décisions/branches YES-NO), pas traité comme une simple image OCR.
- **Technical Concern** : complexité excessive à ce stade. Comprendre *structurellement* un P&ID ou un schéma d'automatisme réel (au-delà d'un flowchart simple) est un problème de recherche en vision + graphe, pas une capacité "achetable" et fiable aujourd'hui à un niveau de confiance compatible avec un usage GxP. Le risque n'est pas l'impossibilité, c'est la **fausse confiance** : une extraction structurelle erronée d'un schéma d'alarme critique, non détectée, est plus dangereuse qu'une absence d'extraction (qui, elle, force une saisie manuelle prudente).
- **Evidence** : aucune capacité de ce type n'existe dans le repository actuel (`GAP.md`, "Source/Document Intelligence" = Total) ; le package lui-même reconnaît que les choix d'implémentation précis (OCR/parseur) sont volontairement "OPEN" après le GAP (`13_TRACEABILITY_ACCEPTANCE.md`).
- **Impact** : Si construit trop tôt et mal calibré, risque de générer des `KnowledgeItem` erronés à partir de schémas mal interprétés, avec un niveau de confiance affiché qui rassure à tort l'utilisateur.
- **Alternative** : séquencer en 2 temps — (1) OCR + structuration manuelle assistée (l'IA propose un découpage nœuds/branches, l'humain valide systématiquement avant tout `KnowledgeItem`, jamais d'auto-confirmation) pour les schémas simples (flowcharts de décision) ; (2) reporter la compréhension de P&ID/schémas électriques réels à une phase ultérieure, une fois le volume réel de documents de ce type et le taux d'erreur tolérable mieux connus.
- **Pros de l'alternative** : réduit drastiquement le risque de fausse confiance, livre de la valeur réelle plus tôt (les flowcharts de décision simples, ex. arbres GMP/non-GMP, sont un cas déjà rencontré cette semaine).
- **Cons** : ne livre pas immédiatement la promesse complète du package sur les schémas techniques complexes.
- **Recommendation** : adopter l'alternative en 2 temps. Le seuil de confiance `NEEDS_REVIEW` déjà prévu par le package (§35, §21) doit être **strict par défaut** pour tout diagramme technique complexe, pas seulement "configuré".
- **Risk si ignoré** : un `KnowledgeItem` erroné généré à partir d'un schéma mal compris peut se propager jusqu'à un livrable GxP sans qu'un humain l'ait vraiment vérifié — contradiction directe avec DEC-028 ("AI n'est pas source de vérité") si la revue devient une formalité.
- **Decision Required** : NON immédiatement — c'est une recommandation de séquencement technique, applicable dès que le chantier Source Intelligence est engagé (pas avant, cf. `GAP.md` priorité "basse dans l'immédiat" sur ce point).

---

## CHALLENGE-002 — IA locale (offline) promise pour les capacités multimodales (OCR, diagrammes)

- **Target Decision** : `01_ARCHITECTURE_MASTER_FINAL.md` §31 — "IA locale optionnelle", le Core doit rester fonctionnel offline, y compris implicitement pour la compréhension de documents/diagrammes.
- **Technical Concern** : problème offline réel et documenté. Le seul poste de travail confirmé pour cet outil est le poste professionnel de l'utilisateur, dont l'IT bloque déjà l'installation de logiciels non autorisés et dont la capacité matérielle (GPU) n'a jamais été vérifiée. Un modèle local capable d'OCR/compréhension de schémas de qualité correcte demande des ressources qu'un poste bureautique standard n'a typiquement pas — contrairement au chat expert textuel (déjà fonctionnel via Ollama, charge de calcul bien plus faible).
- **Evidence** : `00-cadrage-projet.md` confirme la contrainte IT réelle du poste, mais ne documente aucun test de capacité matérielle (CPU/GPU/RAM) — seul un test de joignabilité réseau (`api.github.com`, `*.github.io`) a été fait, jamais un test de capacité de calcul local.
- **Impact** : Moyen — promettre une capacité offline multimodale non vérifiée risque de créer une fonctionnalité qui échoue silencieusement ou trop lentement en usage réel sur le poste cible.
- **Alternative** : découpler explicitement les deux offline actuels — (1) chat expert textuel local (Ollama, déjà validé, léger) reste garanti offline ; (2) OCR/diagram intelligence offline devient une capacité **conditionnelle**, activée seulement si un test de capacité matérielle réel (comme celui déjà fait pour le réseau) confirme la faisabilité sur le poste réel de l'utilisateur.
- **Pros** : évite une promesse non tenable, cohérent avec la méthode déjà appliquée dans ce projet (tester avant de promettre — cf. le test réseau `api.github.com`/`*.github.io` du 24/08/2026).
- **Cons** : réduit la portée offline affichée tant que le test n'est pas fait.
- **Recommendation** : traiter la capacité matérielle du poste comme un point à vérifier explicitement (même méthode que R-62/AR-64 pour le réseau), avant d'inscrire l'OCR/diagram intelligence local comme acquis.
- **Risk si ignoré** : fonctionnalité offline promise mais inutilisable en pratique sur le seul poste réel connu du projet.
- **Decision Required** : OUI, à un horizon proche du chantier Source Intelligence — pas urgent maintenant, mais à ne pas oublier avant de committer sur une capacité offline multimodale.
- **Statut (25/08/2026, clôture des points ouverts)** : **reste ouvert, ne peut pas être clos par Claude** — le test ne peut être fait que sur le poste réel de l'utilisateur (même limite que le test réseau AR-R-64, déjà fait par l'utilisateur lui-même). Pas urgent (Source Intelligence n'est pas engagé, Phase 8 du plan), donc volontairement non bloquant maintenant. Quand l'utilisateur voudra le clore : vérifier CPU/RAM/GPU disponibles sur le poste professionnel (ex. Gestionnaire des tâches Windows → Performance, ou `wmic cpu get name` / `wmic memorychip get capacity` / `dxdiag` pour le GPU) et tester la latence réelle d'un modèle Ollama local déjà utilisé (URS-F-033) sur un exemple d'OCR/image simple, pas seulement le chat textuel.

---

## CHALLENGE-003 — Recherche sémantique / index vectoriel comme composant technique de premier niveau

- **Target Decision** : `12_TECHNICAL_SECURITY_LEGACY.md` §"Storage" — une couche "Search" (full text, metadata, sémantique, evidence) fait partie de l'architecture technique cible dès le départ.
- **Technical Concern** : coût et complexité disproportionnés à ce stade du projet. Une recherche sémantique/vectorielle de qualité suppose une base vectorielle, un pipeline d'embeddings versionné, et une politique de sécurité au niveau retrieval (`DEC-064`) — c'est un sous-système entier, alors que le repository actuel n'a même pas encore de recherche plein texte simple.
- **Evidence** : `GAP.md`/`CURRENT_ARCHITECTURE.md` confirment qu'il n'existe aujourd'hui **aucune** capacité de recherche, pas même basique.
- **Impact** : Faible à court terme (aucune dépendance actuelle), mais un risque de sur-ingénierie si la recherche sémantique est construite avant que le volume réel de contenu à indexer (documents, sections, `KnowledgeItem`) ne justifie sa complexité.
- **Alternative** : introduire une recherche plein texte simple d'abord (index en mémoire ou léger, cohérent avec l'objectif de performance déjà chiffré au cadrage — 500 projets/5000 sections, <2s perçues), et ne construire la couche sémantique/vectorielle que lorsque le volume réel de sources ingérées (une fois Source Intelligence construit) le justifie.
- **Pros** : livre de la valeur (recherche basique) beaucoup plus tôt, évite un investissement d'infrastructure (base vectorielle, hébergement) avant que CONFLICT-001 (architecture serveur) ne soit lui-même tranché.
- **Cons** : la recherche sémantique promise par la cible arrive plus tard.
- **Recommendation** : séquencer après CONFLICT-001 (l'architecture serveur doit être décidée avant qu'un index vectoriel ait un endroit où vivre) et après un premier volume réel de contenu ingéré.
- **Risk si ignoré** : investissement d'infrastructure de recherche avancée avant même de savoir où elle doit être hébergée.
- **Decision Required** : NON immédiatement — recommandation de séquencement, à revisiter une fois CONFLICT-001 tranché.
- **Statut (25/08/2026, clôture des points ouverts)** : CONFLICT-001 est tranché (TD-001, 25/08/2026) — **confirme cette recommandation plutôt que de la remettre en cause** : la décision retenue (recherche calculée côté navigateur, IndexedDB, puis JSON versionnés dans Git si le volume l'exige un jour) est exactement l'alternative "plein texte simple d'abord" proposée ici, pas une base vectorielle serveur. Aucune action supplémentaire requise maintenant ; revisiter seulement si un volume réel de contenu ingéré (Source Intelligence, Phase 8) le justifie un jour.

---

*Prochain livrable : `TECHNICAL_DECISIONS.md` (décisions techniques structurantes, y compris celles découlant des 3 challenges et des 3 conflits ci-dessus).*

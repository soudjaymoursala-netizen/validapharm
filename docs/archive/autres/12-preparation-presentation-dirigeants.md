# Préparation présentation — Questions probables (dirigeants + challenge technique)

| | |
|---|---|
| **Objet** | Support de préparation pour présenter ValidaPharm à des dirigeants d'entreprise et répondre à un challenge d'experts techniques |
| **Basé sur** | `00-cadrage-projet.md`, `01-URS-outil.md` v06, `02-analyse-de-risque-outil.md` v06, `04-plan-de-validation.md`, 4 revues multi-experts |
| **Statut** | Document vivant — à enrichir après chaque répétition/retour |

---

> ⚠️ **DOCUMENT HISTORIQUE (constaté le 22/08/2026 lors d'un audit de cohérence)** : cliché de l'état du projet à URS/AR v06 (avant les rounds v07-v10 : auto-challenge, revue multi-experts de la FS, audits Swissmedic et FDA simulés). Les affirmations factuelles datées (ex. §"FS/VMP/protocoles volontairement datés v01") sont dépassées — la FS est réécrite (v05 au 22/08/2026), le VMP et les protocoles restent, eux, encore à réviser. Conservé comme trace de l'exercice d'auto-challenge qui a mené à URS v07 ; ne pas citer pour décrire l'état actuel du projet.

---

## Comment utiliser ce document

Chaque question est traitée en 3 temps : **la réponse courte** (à dire telle quelle), **le développement** (si on te demande d'aller plus loin), et **la référence** (le document source, pour ne jamais improviser une réponse non traçable — cohérent avec la rigueur qu'on a appliquée à tout le projet).

---

## Partie 1 — Questions probables des dirigeants (angle business)

### 1. "Quel est le retour sur investissement concret ?"
**Réponse courte** : Réduction du temps de rédaction des livrables qualité (Change Control, protocoles IQ/OQ/PQ, AMDEC...), avec un raisonnement systématiquement structuré et tracé vers les normes applicables — moins de reprises, moins d'oublis d'exigences.
**Développement** : On mesure ça explicitement — URS-NF-042 exige que le temps de rédaction soit "significativement inférieur à une rédaction Word manuelle équivalente", et le protocole PQ de l'outil (PQ-06) prévoit une mesure qualitative de ce gain en usage réel avant toute généralisation.
**Référence** : URS-NF-042, PQ-VALIDAPHARM-2026-001 §3 (PQ-06).

### 2. "Combien ça coûte à développer et à faire tourner ?"
**Réponse courte** : Développement en propre (pas de licence logicielle tierce pour le cœur de l'outil), coût récurrent limité à l'usage de l'API cloud IA — avec un plafond technique explicitement prévu pour éviter toute dérive.
**Développement** : Le choix architectural (application locale, pas de serveur obligatoire en Phase 1) évite les coûts d'infrastructure cloud classiques. Le seul coût variable est l'API IA, plafonnée par construction (URS-NF-048).
**Référence** : Cadrage §4 (architecture locale-first), URS-NF-048, AR R-25.

### 3. "Pourquoi construire un outil plutôt qu'acheter Kneat, ValGenesis ou MasterControl ?"
**Réponse courte** : Ces outils gèrent le *workflow* et le *stockage* des dossiers de validation, très bien — mais aucun ne *rédige* le contenu ni ne raisonne sur la stratégie de qualification. ValidaPharm est complémentaire, pas concurrent : un futur export vers ces plateformes reste possible (gabarits d'export personnalisés, URS-F-023).
**Développement** : La revue littéraire qu'on a menée sur ces outils (Kneat, ValGenesis) a justement servi à identifier ce qu'ils font bien et qu'on doit reprendre (tableau de bord portefeuille, inventaire équipements) — pas à les concurrencer sur leur cœur de métier.
**Référence** : `10-revue-multi-experts-v05.md` §2.1, catalogue URS §10.

### 4. "Si l'IA se trompe, qui est responsable ?"
**Réponse courte** : L'humain, systématiquement — c'est un principe fondateur non négociable du projet : l'IA ne décide jamais d'une conformité, d'un calcul réglementaire, ni d'une approbation.
**Développement** : Ce n'est pas une posture marketing, c'est une contrainte de conception vérifiable : chaque calcul (IPR, MACO...) est du code déterministe testé unitairement, jamais généré par l'IA (URS-NF-001) ; chaque proposition IA reste visuellement distincte et non intégrée sans validation explicite (URS-NF-003) ; les fonctions les plus avancées (challenge de dossier, analyse de certificats) ont un garde-fou explicite leur interdisant de produire un verdict "conforme/non conforme" (URS-F-083).
**Référence** : Cadrage §2 principe n°1, URS-NF-001/003, URS-F-083.

### 5. "Quand sera-t-il utilisable en production ?"
**Réponse courte** : On est encore en phase d'expression et de validation des besoins (URS) — volontairement, pour éviter de construire un outil mal calibré. La conception détaillée (FS/DS) et le développement commencent une fois l'URS jugée complète.
**Développement** : Ce séquencement n'est pas de la lenteur gratuite — c'est le principe n°6 du cadrage : l'élicitation rigoureuse en amont minimise les refontes coûteuses après coup. L'URS a déjà traversé 4 revues à un panel d'experts multidisciplinaire.
**Référence** : Cadrage §2 principe n°6, `08` à `11-revue-multi-experts-*.md`.

### 6. "Peut-on le proposer à nos clients, ou c'est un outil interne ?"
**Réponse courte** : L'architecture est pensée dès le départ pour les deux usages — mono-utilisateur aujourd'hui, avec un modèle de données déjà prêt pour le multi-utilisateur, l'isolation stricte par client, et des gabarits d'export à la charte de chaque client.
**Référence** : Cadrage §3 (déploiement), URS-NF-022, URS-F-023/024.

### 7. "Quelles données partent à l'extérieur, et vers qui ?"
**Réponse courte** : Rien par défaut. Le contenu d'un livrable n'est jamais envoyé à un service cloud sans action explicite de l'utilisateur, avec avertissement affiché à chaque fois, nommant le fournisseur actif.
**Développement** : Séparation stricte entre le moteur de rédaction (100% local) et le chat expert (cloud optionnel). Même le chat, par défaut, ne reçoit que la question tapée — pas le document.
**Référence** : Cadrage §2 principe n°4, URS-F-031/034, URS-NF-020.

### 8. "Cet outil expose-t-il l'entreprise à un risque réglementaire ?"
**Réponse courte** : Non — au contraire, il est conçu selon une approche GAMP 5 dès le premier jour, avec son propre dossier de validation en cours de construction (URS, analyse de risque, plan de validation).
**Développement** : Tant que les livrables produits restent au statut "brouillon d'aide" (par défaut en Phase 1), ils ne remplacent aucun processus qualité existant — c'est une aide, pas un système de décision. Le passage à un usage "approuvé" reste au choix explicite de l'utilisateur, avec limites clairement affichées (pas encore équivalent à une signature Part 11).
**Référence** : URS §8 (hors périmètre), URS-F-011bis, URS-NF-043.

### 9. "Quelle est la roadmap ?"
**Réponse courte** : Phase 1 (fondations robustes, mono-utilisateur, locale) → Phase 2 (intelligence contextuelle, chat expert enrichi) → Phase 3 (multi-utilisateur réel, signature électronique Part 11, validation formelle de l'outil).
**Référence** : Cadrage §4.

### 10. "Quelle est la différenciation réelle par rapport à un chatbot IA générique ?"
**Réponse courte** : Un chatbot générique ne connaît pas la structure attendue d'un protocole IQ, ne calcule pas un IPR de façon fiable et reproductible, et n'a aucun garde-fou empêchant de confondre une suggestion avec une décision validée. ValidaPharm encode ces règles métier en dur, pas dans un prompt.
**Référence** : Cadrage §2 principe n°1, URS-NF-001/002.

---

## Partie 2 — Questions probables d'un challenge technique

### 1. "Pourquoi Git comme source de vérité plutôt qu'une vraie base de données ?"
**Réponse courte** : En Phase 1 mono-utilisateur, Git donne gratuitement le versionnage, l'attribution et l'horodatage — la première brique d'une piste d'audit — sans dépendance serveur. Ce n'est pas présenté comme équivalent à un audit trail Part 11 complet : c'est documenté explicitement comme une limite assumée de la Phase 1.
**Développement** : On a d'ailleurs renforcé ce point nous-mêmes en revue — un commit Git standard n'est pas une preuve d'intégrité opposable (auteur déclaratif, historique réécrivable). D'où l'exigence de commits signés et de branche protégée dès la Phase 1, pas seulement une "règle d'usage".
**Référence** : URS-NF-030, `09-revue-multi-experts-backlog-v03.md` §5, AR R-10.

### 2. "Comment on valide un logiciel qui contient de l'IA — c'est un territoire réglementaire encore mouvant ?"
**Réponse courte** : En traitant l'IA comme un composant *hors périmètre de validation déterministe* — elle ne prend jamais de décision réglementaire elle-même, donc l'effort de validation classique (GAMP 5) porte sur le moteur déterministe et sur les garde-fous qui encadrent l'IA, pas sur la "justesse" de l'IA elle-même.
**Développement** : C'est explicitement pourquoi certains risques (R-07, R-30) sont qualifiés de "non totalement éliminables par la conception" — on ne prétend pas les supprimer, on les maîtrise par l'encadrement et on le documente en toute transparence.
**Référence** : AR §5, AR R-07/R-30, URS-NF-001.

### 3. "Comment garantissez-vous que l'IA ne génère jamais un calcul réglementaire ?"
**Réponse courte** : Architecturalement — les calculs (IPR, MACO...) sont des fonctions de code séparées, testées unitairement, jamais exposées comme un outil que l'IA pourrait appeler pour "décider" un résultat.
**Référence** : URS-NF-001/002, FS §4 (moteur de gabarits).

### 4. "Quelle est la stack technique ?"
**Réponse courte** : Phase 1 : application client (navigateur), sans backend obligatoire ; stockage structuré versionné par Git ; routeur IA comme couche d'abstraction indépendante du fournisseur (Claude par défaut, extensible). *(Ce point sera précisé formellement dans la FS/DS, en cours de rédaction après clôture de l'URS.)*
**Référence** : FS v01 §2 (⚠️ dépassée, à réécrire), Cadrage §4.

### 5. "Comment gérez-vous la montée en charge si plusieurs clients/utilisateurs ?"
**Réponse courte** : Le modèle de données est déjà pensé multi-utilisateur (propriétaire, partage, niveau d'accès) dès la Phase 1, même si l'interface reste mono-utilisateur — la bascule vers une architecture serveur est prévue en Phase 3, pas une refonte de zéro.
**Référence** : Cadrage §3/§4, URS-NF-022.

### 6. "Comment sécurisez-vous les clés API et les secrets ?"
**Réponse courte** : Aucun secret n'est autorisé en clair dans le code ni dans le dépôt Git — exigence explicite et non négociable, ajoutée après une revue technique dédiée.
**Référence** : URS-NF-044, AR R-24.

### 7. "Que se passe-t-il en cas de conflit entre deux modifications simultanées ?"
**Réponse courte** : Détection et gestion explicite prévue (verrouillage optimiste, avertissement avant écrasement) — identifié comme un risque réel lors d'une revue technique dédiée, pas laissé au hasard.
**Référence** : URS-NF-045, AR R-23.

### 8. "Pourquoi autant de fournisseurs IA (Claude, Copilot, ChatGPT, DeepSeek) — n'est-ce pas un risque de fragmentation ?"
**Réponse courte** : C'est une exigence business réelle — un client peut n'avoir de contrat qu'avec un fournisseur donné. On le maîtrise en gardant Claude par défaut, en isolant le choix par client, et en exigeant une vérification explicite des conditions de traitement des données avant d'activer un nouveau fournisseur pour un client.
**Référence** : URS-F-032/032bis/032ter, AR R-22.

### 9. "Comment testez-vous que l'outil reste fiable après chaque mise à jour ?"
**Réponse courte** : Les gabarits sont versionnés indépendamment du code, avec un jeu de tests de non-régression avant toute nouvelle version — c'est une exigence, pas une intention.
**Référence** : URS-REG-003, AR §5 point 4, AR R-11.

### 10. "Quel est le vrai niveau de fiabilité de la fonction 'challenge de dossier' ?"
**Réponse courte** : C'est le risque le plus élevé de tout notre registre (IPR=60), et on le dit sans détour — un faux négatif (un manquement réel non détecté) est possible, car la détection sémantique fine reste probabiliste par nature. C'est pourquoi la fonction ne produit jamais de verdict final : uniquement des constats à vérifier, avec un avertissement explicite qu'elle n'est pas exhaustive.
**Développement** : C'est un exemple concret de notre méthode — on ne cache pas les limites de l'IA, on les chiffre et on conçoit des garde-fous en conséquence plutôt que de sur-promettre.
**Référence** : AR R-30, URS-F-083.

### 11. "Comment gérez-vous la propriété intellectuelle des documents de différents clients dans un outil partagé ?"
**Réponse courte** : Isolation stricte par client à tous les niveaux — gabarits d'export, documents de référence, choix du fournisseur IA — avec confirmation explicite obligatoire avant toute réutilisation d'un document d'un client dans un autre contexte.
**Référence** : URS-F-024, URS-F-062, AR R-18.

### 12. "Pourquoi pas une architecture cloud SaaS classique dès le départ ?"
**Réponse courte** : Choix délibéré pour la Phase 1 — locale-first, pour garantir la confidentialité par construction (rien ne part sans action explicite) et éviter une dépendance/coût d'infrastructure avant que le besoin multi-utilisateur soit confirmé. La bascule serveur est planifiée (Phase 3), pas exclue.
**Référence** : Cadrage §4, principe n°5 (dégradation gracieuse).

---

## Partie 3 — Ce qu'il vaut mieux reconnaître directement si on te pousse dans les retranchements

Un point que l'audit de cohérence a mis en évidence et qu'il est plus fort d'assumer ouvertement que d'éviter :

- **La FS, le Plan de validation et les protocoles IQ/OQ/PQ de l'outil sont volontairement datés (v01)** — rédigés tôt dans le projet, avant que l'URS n'atteigne sa version actuelle (v06). Ils sont explicitement marqués comme dépassés dans leur propre en-tête plutôt que laissés à jour silencieusement faux. C'est une preuve de rigueur, pas une faiblesse à cacher : *"on documente honnêtement l'état d'avancement, on ne prétend pas être plus loin qu'on ne l'est."*

---
*Document vivant — à compléter après chaque répétition ou retour de présentation réelle.*

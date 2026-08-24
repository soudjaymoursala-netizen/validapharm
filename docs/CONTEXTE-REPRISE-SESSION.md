# Contexte de reprise — à lire en premier dans une nouvelle session

Ce fichier n'est pas un livrable projet (pas d'ID de traçabilité) : c'est un **aide-mémoire de continuité**, écrit le 24/08/2026 parce que l'utilisateur a choisi de repartir sur une session Claude Code neuve (non liée au dépôt `app-comores-transport`, sans rapport avec ValidaPharm), et voulait que le ton, les règles actées et les points encore ouverts ne se perdent pas dans la transition.

**Instruction pour la prochaine session Claude** : lis ce fichier en entier avant d'agir. Il complète (ne remplace pas) les documents vivants de `docs/`, qui restent la source de vérité pour le contenu métier.

## 1. Qui est l'utilisateur, quel ton attendre

- S'exprime en français, tutoiement naturel entre lui et Claude.
- Attend une **posture proactive, pas seulement exécutante** : Claude est considéré comme l'expert technique/méthodologique sur ce projet, l'utilisateur ne l'est pas forcément. Règle durable (stockée dans `~/.claude/CLAUDE.md`, s'applique automatiquement, pas besoin de la rappeler) : signaler explicitement les gaps, incohérences, ordres d'étapes risqués ou meilleures alternatives **avant d'exécuter**, même sans qu'on le demande.
- N'aime pas qu'on lui redemande une confirmation déjà donnée, mais apprécie qu'on **explique honnêtement les limites** d'une solution plutôt que de survendre (ex. l'obfuscation de code ne protège pas vraiment la PI — dit clairement, pas édulcoré).
- Métier : ValidaPharm, outil d'aide à la rédaction de livrables qualité GAMP5 pour pharma/dispositifs médicaux.

## 2. Méthodologie standard du projet (à réappliquer sans qu'on la redemande)

Chaque évolution substantielle des documents passe par :
1. **Panel de débat contradictoire multi-angles** (surnommé E1-E7 dans l'historique : fonctionnel, UI/UX, sécurité, performance, i18n, accessibilité, conformité...).
2. **Jusqu'à 4 personas d'audit simulés**, utilisés de façon **proportionnée au sujet** (pas systématiquement les 4) : Swissmedic, FDA, cabinet de conseil GxP, QA spécialisées.
3. **Checklist de complétude par domaine** (cadrage `docs/00-cadrage-projet.md` §6ter) : fonctionnel, UI/UX, sécurité, performance, i18n, accessibilité, conformité, opérations, données — à repasser en revue à chaque jalon, proactivement.

## 3. Règles durables déjà actées (ne pas re-décider, juste appliquer)

- **GitHub fait référence exclusive** pour toute action de Claude sur ce projet. **Google Drive est un miroir de confort pour l'utilisateur uniquement**, synchronisé **seulement sur demande explicite** — jamais en tâche de fond. Deux tentatives d'automatisation (Routines Claude Code Remote, puis interface Routines claude.ai) ont été testées et confirmées **techniquement impossibles** sur ce compte (les sessions déclenchées par Routine n'ont pas accès aux connecteurs MCP ; GitHub n'apparaît pas comme "connecteur" générique dans l'UI Routines). Ne pas retenter.
- **Ne jamais toucher au dépôt `app-comores-transport`** — c'était l'ancien emplacement de travail par défaut de la session précédente, tout le contenu ValidaPharm en a été retiré (voir historique de ce dépôt, dernier commit ValidaPharm : "Retire tout le contenu ValidaPharm de ce dépôt"). Le seul dépôt de travail est `soudjaymoursala-netizen/validapharm`, cloné en local dans `/home/user/validapharm`.
- **Contrainte réelle du poste de travail professionnel de l'utilisateur** : l'IT bloque l'installation de logiciels/services non autorisés. Confirmé accessibles depuis ce poste (test réel du 24/08/2026) : `github.com`, `api.github.com`, un domaine `*.github.io`. Claude web est autorisé, Claude desktop ne l'est pas. → décision d'architecture : **PWA 100% navigateur, zéro installation**, toute persistance via API GitHub (+ Drive en miroir manuel), cache local IndexedDB (Dexie.js).

## 4. État d'avancement des documents (au 24/08/2026, à vérifier/actualiser en ouvrant les fichiers)

| Document | Version |
|---|---|
| Cadrage | `docs/00-cadrage-projet.md`, notes de cohérence 23 et 24/08/2026 |
| URS | v25 |
| Analyse de risque (AR) | v27 — 67 entrées, dont 2 closes (R-62, R-64) |
| FS | v11 |
| FDS | v14 |
| SDS | v14 |
| Conventions de codage | `docs/08-conventions-codage.md` v02 |
| Architecture détaillée (technique) | `docs/09-architecture-detaillee.md` v03 |
| Architecture expliquée (non-technique) | `docs/10-architecture-expliquee.md` v03 |

VMP + protocoles IQ/OQ/PQ (`docs/04` à `07`) : **explicitement reportés après la conception (code)**, marqués "À REVOIR" — ne pas les traiter avant que le code existe.

Code : conception démarrée le 23/08/2026. Toolchain scaffoldé et validé (lint/typecheck/format/test/build OK, zéro vulnérabilité npm) : TypeScript strict + Vue 3 + Pinia + Vue Router + Dexie.js + vite-plugin-pwa + Vitest + ESLint/Prettier. Structure en couches stricte (`presentation/` / `logique-metier/` / `connecteurs/` / `persistance/`), imposée par une règle ESLint (pas seulement une convention déclarée).

## 5. Points ouverts — état au 24/08/2026 (session de reprise)

Les 4 points listés à l'origine dans ce fichier ont été retraités dans la session de reprise elle-même (`REV-URS-VALIDAPHARM-2026-010`, panel E1/E3/E4/E5). Points 2 à 4 étaient déjà clos (rien à faire). Point 1 est **tranché en conception**, un seul sous-point reste réellement ouvert :

1. **Fournisseur IA de production + relais — entièrement clos le 24/08/2026.** Conçu et intégré en URS v25 (URS-F-038bis, URS-NF-044ter), AR v27 (R-64 précisé puis vérifié/clos, R-65 précisé, R-67 nouveau), `09-architecture-detaillee.md` v03 §10, `22-SDS-outil.md` v14 §10quater. Résumé des décisions :
   - Fournisseur : Claude (déjà par défaut, URS-F-032), avec un modèle distinct par mode d'usage (léger pour le chat normatif, plus capable pour le mode audit simulé — qualité du débat = valeur du produit, coût déjà jugé négligeable), chacun qualifié séparément (URS-F-038bis).
   - Relais : Cloudflare Workers, sous-domaine `soudjaymoursala.workers.dev` du compte Cloudflare de l'utilisateur (déjà utilisé, pas de domaine custom nécessaire), sans état (URS-NF-044ter, mitige le nouveau risque AR-R-67 — un relais mal configuré pourrait journaliser le contenu échangé), clé en secret du Worker, CORS restreint à l'origine de la PWA.
   - **Gap trouvé et corrigé** : `09-architecture-detaillee.md` §8 (v01) listait par erreur les domaines des fournisseurs IA dans la CSP du navigateur — incohérent avec l'architecture à relais (le navigateur ne parle jamais au fournisseur directement). Corrigé en v02.
   - Plafond de dépense (AR-R-65) : deux niveaux — quota applicatif (URS-NF-048, déjà existant) + plafond configuré côté tableau de bord du fournisseur, ce dernier restant à activer au moment du déploiement réel (seule action encore en attente, non bloquante pour la conception).
   - **Test de joignabilité réseau du relais (AR-R-64) : vérifié et clos le 24/08/2026** — l'utilisateur avait déjà des Workers actifs sur ce compte, chargement de leur URL `*.workers.dev` confirmé réussi depuis le poste professionnel concerné. Plus aucun point réseau bloquant sur ce sujet.
2. **Portée du mode audit simulé** : close, rien à retraiter (URS-F-038/039/040).
3. **Protection de la propriété intellectuelle du code** : close, rien à retraiter (URS-NF-056/057/058, AR-R-66) — contractuel, hors périmètre logiciel.
4. **3ᵉ suggestion externe inexistante** : confirmé, ne pas la chercher.

## 6. Repères pratiques

- Dépôt local : `/home/user/validapharm`, remote `origin` = `https://github.com/soudjaymoursala-netizen/validapharm`, branche `main`.
- Dernier commit au moment de la rédaction de ce fichier : voir `git log -1` dans le dépôt.
- Toute action risquée (push, suppression, écrasement) reste soumise à confirmation explicite au cas par cas, comme partout ailleurs.

---
*Fichier de continuité, pas un livrable projet — peut être supprimé ou archivé une fois que son contenu est jugé obsolète ou totalement absorbé par les documents vivants.*

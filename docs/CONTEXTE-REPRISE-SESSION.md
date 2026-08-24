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
| URS | v24 |
| Analyse de risque (AR) | v25 — 66 entrées |
| FS | v11 |
| FDS | v14 |
| SDS | v12 |
| Conventions de codage | `docs/08-conventions-codage.md` v02 |
| Architecture détaillée (technique) | `docs/09-architecture-detaillee.md` v01 |
| Architecture expliquée (non-technique) | `docs/10-architecture-expliquee.md` v01 |

VMP + protocoles IQ/OQ/PQ (`docs/04` à `07`) : **explicitement reportés après la conception (code)**, marqués "À REVOIR" — ne pas les traiter avant que le code existe.

Code : conception démarrée le 23/08/2026. Toolchain scaffoldé et validé (lint/typecheck/format/test/build OK, zéro vulnérabilité npm) : TypeScript strict + Vue 3 + Pinia + Vue Router + Dexie.js + vite-plugin-pwa + Vitest + ESLint/Prettier. Structure en couches stricte (`presentation/` / `logique-metier/` / `connecteurs/` / `persistance/`), imposée par une règle ESLint (pas seulement une convention déclarée).

## 5. Points ouverts, non encore tranchés — à traiter avec la même rigueur proactive

1. **Choix du fournisseur IA de production pour le chat expert + le nouveau "mode audit simulé"** (URS-F-038 à 040, ajoutés le 24/08/2026 suite à une suggestion d'un ingénieur logiciel externe consulté par l'utilisateur). Points déjà clarifiés à ne pas re-discuter :
   - **GitHub Copilot est exclu** : pas d'API publique intégrable dans une app tierce, ce n'est pas un problème de coût.
   - Éviter un modèle "gratuit" en stratégie de production (quotas trop bas) — préférer un modèle payant léger et peu coûteux (ex. Claude Haiku), le coût réel étant négligeable pour un usage interne.
   - Nécessite un **relais serverless minimal** pour masquer la clé API (nouveau composant, ex. Cloudflare Workers pressenti) — pas encore choisi ni conçu.
   - **Avant de figer un fournisseur : tester la joignabilité réseau de son domaine depuis le poste professionnel de l'utilisateur**, exactement comme pour `api.github.com`/`*.github.io` (AR-R-62, clos). Ne pas supposer, tester réellement.
   - Plafond de dépense à configurer côté fournisseur avant mise en production (AR-R-65).
2. **Portée du mode audit simulé** déjà cadrée par l'utilisateur : priorité aux documents produits dans l'outil et aux questions sur des informations destinées à un document de sortie — pas une conversation libre sans lien avec un livrable. L'agent reste **strictement consultatif** (donne un avis, ne décide jamais, ne modifie jamais un document).
3. **Protection de la propriété intellectuelle du code en cas de livraison à un client** (2ᵉ suggestion de l'ingénieur externe) : traité avec honnêteté le 24/08/2026 — la modularité du code (déjà actée) améliore la maintenabilité, **pas** la confidentialité (une PWA reste techniquement extractible par construction). La vraie protection recommandée est **contractuelle** (licence, NDA), hors périmètre de conception logicielle — l'utilisateur a été informé qu'il devra voir ça avec un conseil juridique s'il livre le projet à un tiers. Formalisé en URS-NF-056 à 058, AR-R-66.
4. **La 3ᵉ suggestion annoncée par l'ingénieur externe consulté par l'utilisateur n'a en réalité jamais existé** — il n'y en avait que 2, confirmé par l'utilisateur le 24/08/2026 ("il y'avait pas de 3ème suggestion my bad"). Ne pas la chercher ou la redemander.

## 6. Repères pratiques

- Dépôt local : `/home/user/validapharm`, remote `origin` = `https://github.com/soudjaymoursala-netizen/validapharm`, branche `main`.
- Dernier commit au moment de la rédaction de ce fichier : voir `git log -1` dans le dépôt.
- Toute action risquée (push, suppression, écrasement) reste soumise à confirmation explicite au cas par cas, comme partout ailleurs.

---
*Fichier de continuité, pas un livrable projet — peut être supprimé ou archivé une fois que son contenu est jugé obsolète ou totalement absorbé par les documents vivants.*

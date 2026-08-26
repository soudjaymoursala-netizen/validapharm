# Architecture de ValidaPharm expliquée simplement

| | |
|---|---|
| **Référence** | ARCH-EXPL-VALIDAPHARM-2026-001 |
| **Version** | 03 (relais IA de production, test réseau vérifié — `REV-URS-VALIDAPHARM-2026-010`, 24/08/2026) |
| **Statut** | En vigueur |
| **Public visé** | Toute personne du projet **sans compétence logicielle** — pour comprendre où vivent les données, comment l'outil fonctionne, et où se situent les points de vigilance, sans avoir besoin de lire le code ou les documents techniques |
| **Documents de référence** | `09-architecture-detaillee.md` v03 (version technique, pour les développeurs), `22-SDS-outil.md` v14, `02-analyse-de-risque-outil.md` v27 |
| **Objet** | Répondre à la demande explicite de l'utilisateur (24/08/2026) : disposer d'une explication complète et commentée de l'architecture, compréhensible par un non-informaticien, décrivant le rôle de chaque niveau, les interactions entre niveaux, et les points de vigilance et de maîtrise |

---

## 1. L'idée en une phrase

ValidaPharm est un site web (pas un logiciel à installer) qui **écrit et lit ses documents directement dans GitHub**, avec une **copie de travail locale dans le navigateur** pour continuer à travailler même sans connexion — un peu comme un traitement de texte qui enregistrerait automatiquement dans un coffre-fort en ligne, tout en gardant un brouillon sur le poste de travail au cas où la connexion coupe.

Il n'y a **aucun serveur à ValidaPharm lui-même** (pas de machine qu'on gère, pas de base de données qu'on héberge) : le "serveur", c'est GitHub — un service déjà utilisé pour stocker du code dans le monde entier, et déjà autorisé sur le poste de travail professionnel de l'utilisateur.

## 2. Les quatre "étages" du bâtiment logiciel

On peut voir le code de ValidaPharm comme un bâtiment à quatre étages, où **chaque étage a un métier précis et ne fait jamais le travail de l'étage voisin**. C'est une règle de conception stricte, pas un détail : elle est vérifiée automatiquement (un outil bloque toute tentative de mélange, voir §7).

```
┌─────────────────────────────────────────────┐
│  ÉTAGE 1 — PRÉSENTATION                       │   Ce que l'utilisateur voit et clique
│  (écrans, boutons, formulaires)               │
└───────────────────┬───────────────────────────┘
                     │ demande un calcul / une décision
                     ▼
┌─────────────────────────────────────────────┐
│  ÉTAGE 2 — LOGIQUE MÉTIER                     │   Les règles du domaine pharma/DM
│  (calculs IPR, statuts, grilles de décision)  │   (ne parle jamais au réseau, ne sait
└───────────────────┬───────────────────────────┘    même pas que l'écran existe)
                     │ demande d'aller chercher/écrire une donnée
                     ▼
┌─────────────────────────────────────────────┐
│  ÉTAGE 3 — CONNECTEURS                        │   Le "standard téléphonique" vers
│  (parle à GitHub, à Drive, à l'IA)            │   l'extérieur — seul étage qui a
└───────────────────┬───────────────────────────┘    le droit de sortir sur Internet
                     │
                     ▼
┌─────────────────────────────────────────────┐
│  ÉTAGE 0 — PERSISTANCE LOCALE                 │   Le "brouillon" gardé dans le
│  (mémoire du navigateur, hors ligne)          │   navigateur, pour travailler sans
└─────────────────────────────────────────────┘    réseau et retrouver son travail
```

**Pourquoi séparer ainsi, concrètement ?**

- Si demain on change de fournisseur cloud (ex. remplacer un service par un autre), **seul l'étage Connecteurs change** — les calculs métier et les écrans ne bougent pas. Moins de risque de tout casser en modifiant une seule brique.
- Un auditeur (Swissmedic, FDA, cabinet GxP) qui veut vérifier "le calcul IPR est-il correct" sait qu'il doit regarder **uniquement l'étage Logique métier** — ce code ne dépend de rien d'autre, il est donc simple à isoler et à tester unitairement, sans avoir besoin de faire tourner tout le site pour le vérifier.
- Ça empêche une erreur classique et dangereuse : un calcul réglementaire codé "en dur" dans un écran, invisible et donc impossible à auditer sérieusement.

**Point de vigilance §2** : cette séparation est une discipline humaine *et* une règle technique imposée automatiquement (l'étage Logique métier et l'étage Connecteurs n'ont pas le droit d'importer du code de l'étage Présentation — une vérification automatique refuse le code qui violerait cette règle avant même qu'il soit intégré).

## 3. Où vivent réellement les données

Trois endroits différents, chacun avec un rôle précis — c'est le point le plus important à comprendre pour ne jamais être surpris :

| Emplacement | Rôle | Ce qui s'y trouve | Qui en a la maîtrise |
|---|---|---|---|
| **GitHub** (dépôt privé dédié) | **Source de vérité officielle** — la seule version qui compte en cas de doute | Tous les documents du projet, avec tout l'historique des versions (qui a changé quoi, quand) | GitHub, avec un accès restreint à ce seul dépôt |
| **Navigateur de l'utilisateur** (IndexedDB, via la bibliothèque Dexie) | **Brouillon de travail local**, invisible pour les autres, sert à continuer à travailler hors connexion | Une copie de ce qui est en cours de rédaction, synchronisée avec GitHub dès que le réseau est là | L'utilisateur uniquement, sur son poste ; perdu si le navigateur "oublie" ses données (nettoyage complet du cache) |
| **Google Drive** (miroir) | **Copie de secours pour l'utilisateur**, jamais consultée par l'outil lui-même | Une copie des documents, mise à jour uniquement quand l'utilisateur le demande explicitement | L'utilisateur ; ce n'est **jamais** la référence en cas de divergence avec GitHub |

**Règle actée avec l'utilisateur (24/08/2026)** : en cas de doute ou de divergence entre GitHub et Drive, **GitHub fait toujours foi**. Drive est un filet de sécurité, pas une seconde vérité.

**Point de vigilance §3** : le brouillon local (navigateur) n'est jamais synchronisé automatiquement en arrière-plan vers Drive — uniquement vers GitHub, et seulement quand la connexion le permet. Si le poste est perdu/réinitialisé avant une synchronisation vers GitHub, le travail non encore envoyé peut être perdu — c'est pourquoi l'outil sauvegarde en local à chaque modification (pas seulement en fin de session) et avertit visuellement si une synchronisation est en attente.

## 4. Comment l'information circule — trois scénarios concrets

**Scénario A — L'utilisateur rédige, connecté à Internet**
1. L'utilisateur tape dans un écran (Étage 1).
2. L'écran demande à la Logique métier (Étage 2) de valider/calculer (ex. recalculer un score IPR).
3. Le résultat est écrit dans le brouillon local (Étage 0) **immédiatement**, sans attendre le réseau — l'écran ne se bloque jamais en attendant GitHub.
4. En tâche de fond, le Connecteur (Étage 3) envoie la mise à jour vers GitHub.

**Scénario B — L'utilisateur rédige, sans connexion (ex. réseau d'entreprise capricieux)**
1. Identique aux étapes 1 à 3 ci-dessus.
2. L'étape 4 échoue silencieusement pour l'utilisateur mais reste en file d'attente — un indicateur visible signale "en attente de synchronisation".
3. Dès que le réseau revient, la synchronisation reprend automatiquement.

**Scénario C — Deux modifications entrent en conflit** (ex. l'utilisateur a modifié un document sur deux postes différents sans synchroniser entre les deux)
1. GitHub refuse l'écriture si la version qu'on essaie d'écraser n'est plus la dernière connue (mécanisme technique : comparaison d'empreinte "SHA", pas une lecture du contenu).
2. L'outil affiche les deux versions en conflit, champ par champ, et demande à l'utilisateur de choisir — **jamais de fusion automatique silencieuse** sur un contenu réglementaire.

## 5. Le futur assistant IA (chat expert + "mode audit simulé")

Ce bloc est **en cours de conception**, pas encore construit — décrit ici pour que la vigilance porte dessus dès maintenant, conformément à la demande de traiter ce point de manière proactive.

- **Rôle** : un chat séparé de l'espace de rédaction (jamais un accès automatique au contenu d'un document, il faut un geste explicite), qui répond aux questions normatives, et qui peut désormais aussi simuler, à la demande, le même débat multi-experts et les mêmes profils d'auditeur (Swissmedic, FDA, cabinet GxP, QA) que ceux utilisés pour la conception de ValidaPharm elle-même.
- **Ce qu'il n'est pas** : il ne modifie jamais un document, ne prend jamais de décision à la place de l'utilisateur, et ne remplace en aucun cas un vrai audit réglementaire — un rappel s'affiche à chaque activation pour éviter toute confusion.
- **Nouveau composant technique, désormais conçu (24/08/2026)** : pour parler à un service d'intelligence artificielle sans exposer publiquement la clé d'accès payante, un petit relais intermédiaire (Cloudflare Workers, hébergé séparément, très simple, sans données stockées) s'intercale entre le navigateur de l'utilisateur et le fournisseur IA — c'est un nouveau maillon qui n'existait pas dans l'architecture initiale. Conséquence importante : **le navigateur de l'utilisateur ne parle plus jamais directement au fournisseur IA**, seul ce relais l'appelle. Donc c'est la joignabilité du relais qui compte pour le poste professionnel — pas celle du fournisseur, jamais sollicité depuis ce poste.
- **Fournisseur retenu** : Claude (déjà le choix par défaut) — avec un modèle plus léger pour les questions courantes et un modèle plus capable réservé au mode audit simulé, où la qualité du débat contradictoire est ce qui fait la valeur de la fonctionnalité (le coût réel de l'un ou l'autre reste négligeable pour un usage interne).
- **Test réseau effectué et concluant (24/08/2026)** : le relais (une adresse `*.workers.dev`) est bien joignable depuis le poste professionnel — même démarche que pour GitHub, vérifiée avec succès. Plus aucun point bloquant côté réseau.

## 6. Sécurité — ce qui protège, et ce qui ne protège pas

**Ce qui protège réellement :**
- L'accès à GitHub se fait avec une **clé d'accès à portée volontairement restreinte** — elle ne donne accès qu'au seul dépôt ValidaPharm, jamais à l'ensemble du compte GitHub de l'utilisateur, et elle est révocable à tout moment.
- Une **liste blanche de destinations réseau autorisées** (Content-Security-Policy) est imposée par le navigateur lui-même : même en cas de faille dans le code, une tentative d'envoyer des données vers un site non autorisé est bloquée techniquement, pas seulement par bonne pratique de code.

**Ce qui ne protège pas, malgré une intuition contraire — point soulevé le 24/08/2026 :**
- **Découper le code en modules propres et bien organisés améliore la maintenabilité, pas la confidentialité.** Un site web envoie forcément son code au navigateur de la personne qui le visite — n'importe qui peut l'inspecter (touche F12) ou le télécharger, module par module ou en bloc. Le rendre difficile à lire (code "compressé"/obfusqué en production, déjà prévu) rend la lecture pénible, pas impossible.
- **La vraie protection en cas de livraison à un client est un contrat** (licence d'usage, cession ou non de droits, clause de confidentialité) — pas une astuce technique. C'est un point à traiter avec un conseil juridique, hors du champ de la conception logicielle.

## 7. Vérifications automatiques qui font respecter tout ce qui précède

- Un outil (ESLint) refuse d'intégrer du code qui violerait la séparation en étages du §2.
- Un outil (portail qualité, exécuté à chaque changement) refuse d'intégrer du code qui ne compile pas, dont les tests échouent, ou qui n'est pas correctement formaté.
- Un outil de scan de secrets empêche qu'une clé d'accès soit accidentellement écrite en clair dans le code avant même que ce code parte vers GitHub.

## 8. Tableau récapitulatif — points de vigilance et de maîtrise

| Point de vigilance | Où c'est traité | Maîtrise en place |
|---|---|---|
| Perte du brouillon local avant synchronisation | §3 | Sauvegarde locale à chaque modification, indicateur visuel de synchronisation en attente |
| Deux modifications en conflit | §4 scénario C | Blocage GitHub par comparaison d'empreinte + résolution manuelle assistée, jamais de fusion automatique silencieuse |
| Clé d'accès GitHub volée (ex. faille du navigateur) | §6 | Portée de la clé restreinte au seul dépôt dédié ; risque documenté et accepté comme compromis (AR-R-61), pas éliminé |
| Version de l'application incompatible avec des données plus récentes (retour arrière) | — (voir `02-analyse-de-risque-outil.md`, R-60) | L'application refuse explicitement de démarrer plutôt que de risquer une écriture incorrecte silencieuse |
| Limite du nombre d'appels à GitHub par heure | `09-architecture-detaillee.md` §5 | Un seul appel pour toute l'arborescence du dépôt, pas un appel par document (AR-R-63) |
| Nouveau relais réseau pour l'IA non testé depuis le poste professionnel | §5 | Test de joignabilité du relais effectué avec succès par l'utilisateur le 24/08/2026 (AR-R-64, clos) ; repli automatique sur un fonctionnement sans IA conservé en filet de sécurité |
| Coût de l'IA qui dérive avec l'usage | §5 | Plafond de dépense à deux niveaux (applicatif + tableau de bord fournisseur) à configurer avant mise en production (AR-R-65) |
| Relais journalisant par erreur le contenu des échanges | §5 | Relais conçu sans état, à vérifier en configuration avant mise en production (AR-R-67) |
| Faux sentiment de protection du code par la seule organisation en modules | §6 | Communication explicite de la limite technique ; protection réelle recommandée par voie contractuelle (AR-R-66) |
| Simulation d'audit prise pour un vrai audit réglementaire | §5 | Rappel explicite affiché à chaque activation du mode audit simulé (URS-F-039bis) |

## 9. Ce qui reste ouvert (à trancher avant de coder les blocs concernés)

- **Plus aucun point bloquant** : le fournisseur, l'hébergement du relais, le plafond de dépense et la joignabilité réseau (§5) sont désormais tous conçus et vérifiés. Reste à les configurer concrètement au moment d'écrire ce bloc de code (pas une décision en attente).

---
*Document vivant, version 03 (24/08/2026) — créé le 24/08/2026 en réponse à la demande explicite de l'utilisateur d'une explication d'architecture complète, commentée et accessible à un non-informaticien. v02 (24/08/2026, `REV-URS-VALIDAPHARM-2026-010`) : conception du relais IA actée (§5, §8). **v03 (24/08/2026)** : test réseau du relais vérifié et clos. Ne remplace pas `09-architecture-detaillee.md` (référence technique) : les deux doivent rester cohérents, toute divergence future doit être répercutée dans les deux documents.*

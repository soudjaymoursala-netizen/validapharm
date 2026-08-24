# Revue multi-experts — Relais IA de production (masquage de clé) et choix du modèle pour chat expert / mode audit simulé

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-010 |
| **Version** | 01 (close) |
| **Objet** | Trancher le point ouvert laissé par `CONTEXTE-REPRISE-SESSION.md` §5.1 : fournisseur IA de production pour le chat expert (URS-F-030) et le mode audit simulé (URS-F-038), conception du relais serverless nécessaire pour masquer la clé API (nouveau composant), et clôture méthodologique d'AR-R-64/R-65 |
| **Statut** | Close — intégré en URS v25, AR v26, `09-architecture-detaillee.md` v02, `22-SDS-outil.md` v13 |

---

## Déjà couvert ? Faisabilité ?

**Couvert en partie** : URS-F-032 fixe déjà "Claude par défaut" comme fournisseur, URS-F-032quater/quinquies/sexies fixent déjà un mécanisme de qualification de fiabilité par fournisseur/version, URS-NF-048 fixe déjà un garde-fou de quota/coût générique, URS-F-032ter/034 couvrent déjà la divulgation du traitement des données. Ce qui manque : le choix du **modèle précis** (pas seulement le fournisseur), la conception du **relais** lui-même (composant physique, pas seulement mentionné en langage explicatif dans `10-architecture-expliquee.md`), et une **incohérence trouvée** dans `09-architecture-detaillee.md` §8 (voir E5 ci-dessous).

**Faisabilité** : oui, extension directe de l'existant — pas de nouvelle capacité fonctionnelle, uniquement de la conception technique et une précision d'exigence.

## Gap trouvé avant le débat — incohérence CSP / relais

`09-architecture-detaillee.md` §8 liste, dans la Content-Security-Policy du navigateur, *« les domaines des fournisseurs IA configurés »*. Or le relais serverless (§7 de ce même document, et AR-R-64) a précisément pour rôle d'intercaler un intermédiaire entre le navigateur et le fournisseur IA, pour ne jamais exposer la clé API côté client. Si c'est bien le cas, **le navigateur ne parle jamais directement au fournisseur IA** — seul le relais l'appelle, côté serveur, depuis le réseau du relais (pas depuis le poste de l'utilisateur). Deux conséquences :

1. La CSP `connect-src` du navigateur ne doit autoriser que le **domaine du relais**, jamais celui du fournisseur IA — l'y inclure serait à la fois inutile et une fausse piste (un fournisseur autorisé en CSP mais jamais appelé directement).
2. Le test de joignabilité réseau requis par AR-R-64 (poste professionnel de l'utilisateur) ne porte que sur le **domaine du relais** — pas sur celui du fournisseur, qui n'est jamais sollicité depuis ce poste. AR-R-64, dans sa rédaction actuelle, laissait les deux hypothèses ouvertes ("ex. `*.workers.dev` ou domaine du fournisseur IA choisi") : à trancher.

Non détecté avant ce jour — incohérence latente entre §7 (relais) et §8 (CSP) du même document, écrits à des moments différents (§7 le 23/08, mode audit/relais réel identifié le 24/08).

## Débat du panel

### E5 (Architecte logiciel)

Confirme le point ci-dessus : architecture retenue = `navigateur → relais (Cloudflare Workers) → fournisseur IA`, appel fournisseur exclusivement côté serveur du relais. Le relais DOIT être :
- **sans état** (*stateless*) : aucune persistance du contenu de la requête/réponse au-delà du traitement de l'appel en cours — sinon il devient une copie de la donnée métier hors du dépôt Git, source de vérité unique déjà actée (URS-NF-021).
- **clé API en secret du relais** (ex. `wrangler secret`), jamais dans le code front ni dans le dépôt applicatif.
- **CORS restreint** à l'origine exacte de la PWA déployée (le domaine GitHub Pages retenu), pas un `*` permissif.
- domaine de test/prod initial : sous-domaine gratuit `*.workers.dev` (aucun domaine custom nécessaire pour lever le doute réseau — un domaine custom resterait une option future, pas un préalable).

**Décision** : retenu. CSP §8 à corriger (domaine du relais, pas celui du fournisseur). AR-R-64 à préciser dans le même sens.

### E1 (Fournisseur IA / GAMP 5 / Part 11)

Sur le choix du modèle : le fournisseur (Claude) est déjà acté par défaut (URS-F-032) — reste à trancher le **modèle précis**, distinctement pour le chat expert normatif (URS-F-030, usage courant, volumétrie probablement plus élevée) et le mode audit simulé (URS-F-038, usage plus rare mais où la qualité du débat contradictoire multi-angles *est* la valeur du produit — un modèle faible y rendrait le mode décoratif plutôt qu'utile). Le coût réel étant déjà qualifié de négligeable pour un usage interne (échange du 24/08/2026), rien ne justifie de sacrifier la qualité de la fonctionnalité la plus différenciante pour une économie non significative.

**Point de vigilance additionnel** : URS-F-032quater exige déjà une qualification de fiabilité par fournisseur avant usage réel, mais ne précise pas explicitement qu'elle doit être **rejouée séparément par mode d'usage** (chat normatif vs audit simulé) si des modèles différents sont retenus pour chacun — deux usages, deux profils de risque, une qualification unique ne suffit pas à couvrir les deux.

**Décision** : retenu — recommander deux niveaux de modèle (léger pour le chat normatif, plus capable pour le mode audit simulé), chacun qualifié séparément selon URS-F-032quater. Formalisé en URS-F-038bis. Le choix du modèle exact (ex. gamme "Haiku" vs "Sonnet") reste un paramètre de configuration, pas une exigence figée dans l'URS — cohérent avec URS-F-032 (fournisseur/modèle configurables).

### E3 (QA Réglementaire)

Le contenu envoyé en mode audit simulé (document joint, URS-F-031) est un envoi vers un sous-traitant tiers au même titre que le chat de base — à vérifier que URS-F-034 (avertissement avant envoi) et URS-F-032ter (conditions de traitement des données) s'appliquent explicitement aussi à l'activation du mode audit simulé, pas seulement au chat de base, faute de quoi un auditeur pourrait considérer le mode audit comme un canal de divulgation non couvert par les garde-fous existants.

**Décision** : retenu — clarification de rédaction dans URS-F-038bis (renvoi explicite à URS-F-032ter/034), pas une nouvelle exigence de fond (le mécanisme existe déjà, il manquait le lien explicite).

### E4 (CSV)

Le relais est un nouveau composant technique hors du dépôt Git. Question posée : nécessite-t-il une qualification dédiée (IQ/OQ) au même titre qu'un composant applicatif ?

**Débat** : E5 répond que le relais est un composant d'infrastructure pur (aucune logique métier, aucune donnée persistée, aucune décision) — même statut que l'hébergement GitHub Pages déjà retenu sans qualification dédiée (infrastructure Catégorie 1 GAMP 5, pas le logiciel sur mesure Catégorie 5 lui-même). E4 est d'accord à condition que le caractère *sans état* du relais (E5) soit une exigence testable, pas seulement une intention de conception — sinon la frontière entre "infrastructure" et "composant applicatif" devient floue et contestable en audit.

**Décision** : retenu — le caractère stateless devient une exigence explicite (URS-NF-044ter), ce qui justifie de traiter le relais comme infrastructure Catégorie 1, pas comme un nouveau composant Catégorie 5 à qualifier.

## Point examiné et non retenu

**Domaine custom dédié au relais avant mise en production.** Envisagé (E5) pour une image plus professionnelle, mais rejeté à ce stade : ajoute une dépendance DNS supplémentaire à tester réseau (même risque que R-64, dupliqué) sans bénéfice fonctionnel — le sous-domaine `*.workers.dev` gratuit suffit pour trancher la faisabilité réseau et pour la mise en production initiale. Réexaminable plus tard si besoin (ex. image de marque), hors périmètre de ce point.

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | Gap pré-débat + E5 | Correction (CSP : domaine du relais, pas du fournisseur) | `09-architecture-detaillee.md` §8 |
| 2 | E5 | Nouvelle section (conception du relais) | `09-architecture-detaillee.md` §10 (nouveau) |
| 3 | E5 | Précision (domaine testé = relais uniquement) | AR-R-64 (rédaction) |
| 4 | E4 | Nouvelle exigence (relais sans état, testable) | URS-NF-044ter |
| 5 | E1 + E3 | Nouvelle exigence (qualification séparée par mode d'usage + renvoi explicite divulgation) | URS-F-038bis |
| 6 | E1 | Recommandation de configuration (deux niveaux de modèle) | `22-SDS-outil.md` (spec, pas URS) |
| 7 | Panel | Mitigation concrète (plafond de dépense) | AR-R-65 (rédaction, renvoi URS-NF-048) |
| — | Panel | Nouveau risque (relais journalisant par erreur le contenu échangé) | AR-R-67 |

## Statut

Clôturé le 24/08/2026. URS passe en v25, AR en v26 (67 risques). Test de joignabilité réseau du domaine du relais (`*.workers.dev`) **restant à effectuer par l'utilisateur depuis son poste professionnel** avant de figer définitivement l'hébergement du relais — AR-R-64 reste ouvert jusqu'à ce test, seule action non réalisable depuis cette session (nécessite un accès réseau réel au poste concerné).

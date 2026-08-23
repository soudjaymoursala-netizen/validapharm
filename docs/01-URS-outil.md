# URS — User Requirement Specification de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | URS-VALIDAPHARM-2026-001 |
| **Version** | 23 (architecture web pure sans installation — API GitHub, contrainte du poste de travail professionnel) |
| **Statut** | En rédaction |
| **Système concerné** | ValidaPharm (assistant de rédaction qualité CQV/CSV/QA — pharma & dispositifs médicaux) |
| **Catégorie GAMP 5 envisagée** | Catégorie 5 — Logiciel sur mesure (bespoke), avec composants de catégorie 3/4 (bibliothèques, éventuel LLM local) — confirmée par revue multi-experts |
| **Document de référence** | `00-cadrage-projet.md`, `REV-URS-VALIDAPHARM-2026-001` à `010` v01 (closes), `AUDIT-SWISSMEDIC-VALIDAPHARM-2026-001/002/003` v01, `AUDIT-FDA-VALIDAPHARM-2026-001/002/003` v01, `AUDIT-CABINET-GXP-VALIDAPHARM-2026-001` v01, `AUDIT-QA-SPECIALISES-VALIDAPHARM-2026-001` v01 (closes), `AR-VALIDAPHARM-2026-001` v23, `03-specifications-fonctionnelles.md` v11, `16-FDS-outil.md` v14, `22-SDS-outil.md` v11 |
| **Rédigé par** | — |
| **Vérifié par** | — |
| **Approuvé par** | — |

---

## 1. Objet

Ce document définit les exigences utilisateur de l'outil **ValidaPharm** lui-même, en tant que système à concevoir, développer et — à terme — valider selon une approche basée sur le risque (GAMP 5). Il constitue le point d'entrée de la traçabilité : chaque exigence ci-dessous devra être tracée vers une spécification fonctionnelle (FS), une implémentation, et un test de qualification (IQ/OQ/PQ de l'outil).

Ce document ne couvre pas le contenu réglementaire détaillé de chaque type de livrable (couvert par les gabarits eux-mêmes, §10) mais l'ensemble des capacités que l'outil doit offrir.

## 2. Contexte et justification métier

L'utilisateur (professionnel qualité/validation en pharma et dispositifs médicaux, exerçant pour son propre compte et/ou pour des clients) rédige régulièrement des livrables CQV/CSV/QA dans le cadre de projets (ex. achat d'un nouvel équipement, changement sur un équipement qualifié). L'outil vise à :
- réduire le temps de rédaction et fiabiliser le raisonnement technique/réglementaire,
- structurer systématiquement les livrables selon un canevas conforme aux normes applicables,
- organiser les livrables d'un même projet entre eux (traçabilité, cohérence),
- suggérer des idées de tests et des stratégies de qualification, toujours comme propositions soumises à décision humaine,
- fournir un point d'accès rapide à un chat expert du domaine,
- garantir qu'aucune donnée n'est perdue, quel que soit le poste de travail utilisé,
- poser, dès la conception, les bases d'un usage en équipe et d'une validation formelle de l'outil.

**Priorité de conception Phase 1** *(URS-NF-043)* : la fiabilité et le caractère défendable GMP du **contenu et du raisonnement** produits par l'outil priment sur l'automatisation du workflow d'approbation. Par défaut, tous les livrables restent au statut "brouillon d'aide" ; le cycle "validé en interne" reste disponible mais n'est pas requis pour l'usage courant.

## 3. Définitions et abréviations

| Terme | Définition |
|---|---|
| Projet | Conteneur regroupant les sections (livrables) relatives à un même sujet (ex. achat d'un équipement, gestion d'un changement) |
| Section | Instance d'un gabarit rattachée à un projet (ex. la section "URS" du projet "Nouvel isolateur") |
| Livrable / Document | Terme générique pour une section produite dans l'outil |
| Outil / Mini-outil | Regroupement des gabarits par famille (outil) et sous-type (mini-outil) — voir catalogue §10 |
| Gabarit / Module | Modèle structurel d'un type de document |
| Brouillon d'aide | Statut d'un livrable non approuvé formellement dans l'outil |
| Approuvé dans l'outil | Nom technique interne du statut (utilisé dans les exigences, le modèle de données et l'audit_log) d'un livrable dont le cycle de revue a été mené dans l'outil. **Libellé affiché à l'utilisateur** (seul texte visible à l'écran, cf. URS-F-011bis) : *"validé en interne — pas une signature électronique opposable"*. Ne constitue pas une signature électronique opposable. |
| Chat expert | Module conversationnel distinct, dédié aux questions normatives générales et à l'assistance contextuelle |
| Source de vérité | Le dépôt Git dédié, qui fait foi en cas de divergence avec la copie miroir |

## 4. Exigences fonctionnelles

### 4.0 Gestion de projets *(nouveau — Must, Phase 1)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-000 | Le système DOIT permettre de créer un Projet comme conteneur regroupant plusieurs sections liées entre elles, avec un nom, un contexte, une portée/hors-portée et un délai. | Must |
| URS-F-000bis | Le système DOIT permettre d'ajouter/retirer des sections à un Projet à tout moment, chaque section étant une instance d'un gabarit du catalogue (§10). | Must |
| URS-F-000ter | Le système DOIT permettre de lier explicitement une section à une ou plusieurs autres sections du même projet, et de visualiser ces liens sous forme de vue de traçabilité (cette vue remplace/généralise le module "Cycle en V/VMP" — voir §10.I). | Should (le lien manuel simple est Must Phase 1 ; la vue automatique peut être affinée en Phase 2) |
| URS-F-000quater | Le système DOIT permettre, au sein d'un projet, une section "Documents" pour charger des fichiers de référence (documentation technique fournisseur, manuels utilisateur, SOP, procédures internes du client). Ces documents DOIVENT être clairement identifiés comme références de travail, non comme documents maîtres du QMS du client, avec horodatage de chargement visible. | Must |
| URS-F-000quinquies | Toute génération assistée par IA (§4.1bis, §4.6) DOIT pouvoir s'appuyer, via l'action explicite déjà prévue (URS-F-031), sur les sections et documents déjà présents dans le même projet. | Should |
| URS-F-000sexies | Toute création/modification d'un lien entre sections DOIT être journalisée (qui, quand, quel lien) dans l'audit_log du projet. | Must |
| URS-F-000septies | *(nouveau v06)* Le système DOIT permettre de créer, au sein d'un projet, une section "Contexte procédé" structurée (description du procédé, paramètres critiques procédé — CPP, attributs qualité critiques produit — CQA, conditions opératoires visées, références aux validations de procédé existantes), liable aux autres sections (URS, ACFC, DQ, Protocoles, Validation de procédé). Sans cette section, les autres analyses risquent d'être mal informées (voir AR R-26). | Must |
| URS-F-000octies | *(nouveau v08 — revue FS, E6 Métrologie)* Le système DOIT bloquer la finalisation d'une section IQ tant qu'aucun lien vers une section "Plan de métrologie/étalonnage" (catalogue §10.L) du même projet n'existe. Cohérent avec le traitement déjà appliqué au Contexte procédé (URS-F-000septies) — même mécanisme de garde-fou. | Must |
| URS-F-000nonies | *(nouveau v08 — revue FS, E7 Maintenance)* Le système DOIT bloquer la clôture d'une section OQ tant qu'aucun lien vers une section "Plan de maintenance préventive" (catalogue §10.M, Annexe 15 §3.12) du même projet n'existe. Même mécanisme de garde-fou que URS-F-000septies/000octies. | Must |

### 4.1 Rédaction guidée de livrables

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-001 | Le système DOIT permettre de créer une section à partir d'un gabarit, parmi les types définis dans le catalogue des gabarits (§10 — outils et mini-outils). | Must |
| URS-F-002 | Le système DOIT structurer chaque livrable en sections conformes à la pratique du domaine (en-tête document, corps, historique des révisions, bloc d'approbation). | Must |
| URS-F-003 | Le système DOIT permettre la saisie de champs texte, texte long, listes déroulantes, dates, nombres, et tableaux à lignes dynamiques (ajout/suppression). | Must |
| URS-F-004 | Le système DOIT calculer automatiquement les valeurs dérivées définies par une norme (ex. IPR = S×O×D en AMDEC) sans intervention manuelle ni IA générative. | Must |
| URS-F-004bis | Le système DOIT enregistrer, dans les métadonnées de chaque livrable, l'identifiant de version du moteur de calcul utilisé. | Must |
| URS-F-005 | Le système DOIT permettre d'associer à chaque livrable une ou plusieurs références normatives affichées à l'utilisateur pendant la rédaction. | Must |
| URS-F-006 | Le système DEVRAIT adapter le contenu proposé au contexte du livrable sans jamais insérer automatiquement du texte non validé dans le corps final. | Should |
| URS-F-007 | Le système DEVRAIT proposer des idées de tests à titre de suggestions consultables séparément, jamais pré-remplies sans action explicite. | Should |
| URS-F-008 | Le système DOIT permettre de dupliquer une section existante. | Should |
| URS-F-009 | Le système DOIT empêcher la perte de données lors de la saisie (sauvegarde automatique locale). | Must |

### 4.1bis Génération de brouillon par adaptation d'un document de référence *(nouveau — Should, garde-fous Must)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-060 | Le système DEVRAIT permettre de générer un brouillon complet d'une section en s'appuyant sur un document de référence fourni par l'utilisateur (joint via URS-F-031, éventuellement issu du même projet via URS-F-000quinquies) et sur le contexte du nouveau cas, en adaptant la structure, le langage et le raisonnement du document de référence. | Should |
| URS-F-061 | Tout contenu généré par cette fonction DOIT rester au statut "proposé par IA — non validé" **section par section**, et NE DOIT PAS être considéré comme faisant partie du contenu officiel tant que l'utilisateur n'a pas explicitement validé/édité chaque section — jamais de validation globale en un clic. | Must |
| URS-F-062 | Avant d'utiliser un document de référence pour cette fonction, le système DOIT demander une confirmation explicite que l'utilisateur dispose du droit d'utiliser ce document comme base (propriété intellectuelle / confidentialité, notamment vis-à-vis d'un autre client). | Must |
| URS-F-063 | Toute donnée technique/numérique (valeur, tolérance, critère d'acceptation) reprise ou adaptée depuis le document de référence DOIT être visuellement signalée dans le brouillon généré. | Must |
| URS-F-064 | Le livrable généré DOIT conserver, dans ses métadonnées/historique, la référence du document source utilisé pour la génération. | Must |

### 4.2 Statuts et cycle de vie d'un livrable

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-010 | Le système DOIT permettre de marquer un livrable "brouillon d'aide" ou d'engager un cycle "approuvé dans l'outil", au choix de l'utilisateur. | Must |
| URS-F-011 | Le système DOIT exiger le renseignement des rôles rédacteur/vérificateur/approbateur avant le passage au statut "approuvé". | Must |
| URS-F-011bis | Le système DOIT afficher explicitement que le statut "approuvé dans l'outil" (libellé retenu : "validé en interne — pas une signature électronique opposable") ne constitue pas une signature électronique réglementaire (21 CFR Part 11 / Annexe 11) tant que l'authentification et la non-répudiation ne sont pas implémentées (Phase 3). | Must |
| URS-F-012 | Le système NE DOIT PAS permettre la modification du corps d'un livrable approuvé sans nouvelle révision tracée. | Must |
| URS-F-013 | Le système DOIT conserver l'intégralité de l'historique des versions (aucune suppression silencieuse). | Must |

### 4.2bis Workflows de rédaction, revue et approbation *(nouveau v06 — architecture anticipée dès la Phase 1, activation Phase 3)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-014 | Le système DOIT concevoir le cycle de vie d'un livrable comme trois workflows distincts — rédaction/co-rédaction, revue, approbation — même si l'activation de signatures formelles reste hors périmètre Phase 1 (§8). | Must |
| URS-F-014bis | Le workflow de rédaction/co-rédaction DOIT permettre d'ajouter/retirer des auteurs à tout moment sur une section donnée, avec attribution des contributions dans l'audit_log. | Must |
| URS-F-014ter | Le workflow de revue DOIT permettre plusieurs relecteurs, chacun pouvant émettre un avis/commentaire distinct, avant transmission au workflow d'approbation. | Should |
| URS-F-014quater | Le workflow d'approbation DOIT prévoir un rôle "Approbateur final" typé (ex. QA), distinct des autres rôles, cohérent avec une gouvernance qualité réelle. | Should |
| URS-F-014quinquies | Ces workflows DOIVENT être conçus comme une extension du modèle de statuts existant (URS-F-010/011), sans activation de signature électronique en Phase 1 (URS-F-011bis reste valable). | Must |

### 4.3 Export et interopérabilité

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-020 | Export Word (éditable) et PDF (impression). | Must |
| URS-F-021 | Export/import JSON de l'ensemble des données. | Must |
| URS-F-022 | Export CSV/XLSX pour AMDEC/registre de risques. | Should |
| URS-F-028 | *(nouveau v06)* Les exports DOIVENT être disponibles dans la langue de rédaction du livrable (cohérent avec URS-NF-040), avec un contenu équivalent quelle que soit la langue. | Should |
| URS-F-028bis | *(nouveau v09 — audit Swissmedic simulé, MIN-01)* Un test de non-régression de contenu (même principe que URS-F-025 pour les gabarits d'export client) DOIT vérifier l'équivalence de contenu entre les versions linguistiques d'un même gabarit — traitement symétrique à celui déjà exigé pour les gabarits personnalisés. | Should |
| URS-F-028ter | *(nouveau v10 — audit FDA simulé, MAJ-FDA-01/02)* Lors de l'export d'un livrable au statut "validé en interne", le système DOIT afficher un rappel explicite que la responsabilité de conformité et de conservation réglementaire (durée légale applicable selon la predicate rule concernée — ex. 21 CFR 820.180 pour les dispositifs médicaux) est transférée au système qualité du client dès la reprise formelle du livrable — ValidaPharm n'étant pas le système d'enregistrement officiel tant que cette reprise n'a pas eu lieu (voir §6, analyse predicate rules). | Must |

### 4.3bis Gabarits d'export personnalisés (templates client) *(nouveau — confirmé important par l'utilisateur)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-023 | Le système DEVRAIT permettre d'associer à un client/organisation un gabarit d'export personnalisé (Word/PDF/Excel) fourni par l'utilisateur, en plus du gabarit par défaut de l'outil. | Should |
| URS-F-024 | Le système DOIT permettre de gérer plusieurs gabarits d'export personnalisés, isolés par client/organisation — jamais de mélange entre deux clients (propriété intellectuelle du client). | Must |
| URS-F-025 | Lorsqu'un gabarit personnalisé est utilisé, le système DOIT produire un document dont le contenu est identique à celui produit avec le gabarit par défaut — seule la mise en forme diffère. Un test de non-régression DOIT vérifier cette équivalence de contenu. | Must |
| URS-F-026 | Lors de la configuration d'un gabarit personnalisé, le système DOIT permettre de vérifier que les éléments obligatoires (bloc de signatures, historique des révisions) sont bien mappés dans le template client. | Must |
| URS-F-027 | *(nouveau — REV-URS-002 §3.1)* Le système DOIT avertir explicitement, et bloquer par défaut, l'export d'un livrable contenant encore des sections au statut "proposé par IA — non validé" (URS-F-061), quel que soit le gabarit d'export utilisé (par défaut ou personnalisé). L'utilisateur DOIT pouvoir forcer l'export malgré l'avertissement, action alors journalisée. | Must |
| URS-F-027bis | *(nouveau v11 — revue FDS, E2)* Toute action de forçage d'un garde-fou non négociable (export forcé URS-F-027, blocages de liens forcés URS-F-000septies/octies/nonies) DOIT capturer un motif texte obligatoire de l'utilisateur avant validation, en plus de l'horodatage et de l'acteur déjà journalisés (URS-NF-030). Un journal d'audit "qui/quand" sans "pourquoi" a une valeur probante limitée en inspection. | Must |

### 4.4 Chat expert

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-030 | Le système DOIT fournir un module de chat séparé de l'espace de rédaction, dédié aux questions normatives et méthodologiques du domaine pharma/DM. | Must |
| URS-F-031 | Le chat expert NE DOIT PAS avoir accès par défaut au contenu des livrables ; l'accès à un document précis DOIT être une action explicite et visible. | Must |
| URS-F-032 | *(amendé v05)* Le système DOIT utiliser un ou plusieurs services cloud IA **configurables** (Claude par défaut) comme moteur principal quand le réseau le permet, avec possibilité de sélectionner/ajouter un autre fournisseur (ex. OpenAI/ChatGPT, GitHub Copilot, DeepSeek, autres) selon les contraintes du client. | Must |
| URS-F-032bis | *(nouveau v05)* Le choix du fournisseur cloud DOIT être configurable au niveau client/organisation (cohérent avec l'isolation par client URS-F-024), pas seulement comme réglage global de l'outil — pour respecter les contraintes contractuelles propres à chaque client (ex. accord de traitement des données déjà en place avec un fournisseur donné). | Must |
| URS-F-032ter | *(nouveau v05)* Avant d'activer un nouveau fournisseur cloud pour un client, le système DOIT afficher un rappel explicite que les conditions de traitement des données (rétention, entraînement sur les données, localisation) diffèrent selon le fournisseur, et nécessitent une vérification préalable par l'utilisateur. | Must |
| URS-F-032quater | *(nouveau v07 — auto-challenge)* Avant d'activer un nouveau fournisseur cloud pour un usage réel (pas seulement ses conditions de traitement des données, URS-F-032ter), une **qualification de la fiabilité de ses réponses** sur un échantillon de questions-types du domaine pharma/DM DOIT être réalisée et consignée — la fiabilité d'un fournisseur ne se présume pas identique à celle d'un autre. | Must |
| URS-F-032quinquies | *(nouveau v08 — revue FS, E1)* Le système DOIT détecter un changement de version du modèle/moteur sous-jacent d'un fournisseur actif depuis la dernière qualification de fiabilité consignée (en comparant la version journalisée par session, URS-F-037, à la version qualifiée), et alerter l'utilisateur qu'une re-qualification est recommandée avant de poursuivre un usage réel. Une qualification initiale ne se présume pas valide indéfiniment (dérive silencieuse côté fournisseur). | Must |
| URS-F-032sexies | *(nouveau v09 — audit Swissmedic simulé, MAJ-02)* L'échantillon de questions-types utilisé pour la qualification de fiabilité (URS-F-032quater) DOIT être versionné comme artefact contrôlé indépendant, distinct et stable dans le temps, pour garantir la comparabilité entre la qualification initiale et toute re-qualification ultérieure (URS-F-032quinquies). Sans cette maîtrise, une re-qualification n'est pas défendable en audit. | Must |
| URS-F-033 | Le système DOIT basculer automatiquement sur un modèle local si aucun fournisseur cloud configuré n'est accessible, en informant l'utilisateur du changement de moteur. | Must |
| URS-F-034 | Le système DOIT afficher explicitement, avant tout envoi, que le contenu peut être transmis à un service tiers en mode cloud — en nommant le fournisseur actif. | Must |
| URS-F-035 | Le chat expert DOIT citer, quand c'est pertinent, les normes/référentiels sur lesquels s'appuie sa réponse. | Should |
| URS-F-036 | Le chat expert DOIT afficher un avertissement rappelant qu'il s'agit d'une aide et non d'un avis réglementaire opposable. | Must |
| URS-F-037 | *(amendé v05)* Le système DOIT journaliser chaque session de chat expert (horodatage début/fin, **fournisseur et moteur exact utilisé** — cloud nommé ou local, document joint ou non), sans jamais journaliser le contenu échangé. | Must |

### 4.5 Bibliothèque de normes

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-040 | Bibliothèque consultable des normes/référentiels utilisés par les gabarits. | Must |
| URS-F-041 | Association de documents normatifs propres à l'utilisateur à la bibliothèque. | Could |

### 4.6 Assistant de stratégie de qualification *(nouveau)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-050 | Le système DOIT évaluer l'impact d'un changement sur l'état qualifié d'un équipement/système via une **grille de critères déterministe** (basée sur ASTM E2500 / EudraLex Annexe 15 §43 / ICH Q9), à partir d'un contexte saisi manuellement ou d'un Change Control existant chargé/joint (via URS-F-031), et proposer une conclusion parmi une liste fermée : Aucun impact / Revue documentaire / FAT / SAT / IQ / IQ+OQ / IQ+OQ+PQ (requalification complète) / Autre — à définir par l'expert. | Should |
| URS-F-050bis | L'IA PEUT aider à proposer les réponses aux critères de la grille à partir d'un Change Control joint, mais chaque réponse DOIT être validée/corrigée par l'utilisateur avant que la grille ne calcule la conclusion — jamais d'automatisme silencieux. La catégorie finale résulte uniquement de la grille déterministe, jamais d'une génération libre. | Must |
| URS-F-050ter | Lorsque la proposition s'appuie sur un Change Control joint, le système DOIT indiquer la référence et la version du Change Control utilisé comme contexte. | Must |
| URS-F-053 | Le système DOIT afficher, pour ce mode, un avertissement renforcé rappelant que la proposition est une aide à la décision et non une décision de qualification, à valider par un expert qualité qualifié. | Must |
| URS-F-054 | Cet assistant DOIT être accessible depuis le contexte d'un Change Control en cours de rédaction (pas seulement comme module indépendant). | Should |
| URS-F-055 | *(nouveau — délimitation ACFC / Computer System Assessment vs CSV)* Lorsqu'une évaluation ACFC ou Computer System Assessment conclut à la nécessité d'un dossier de qualification/validation complet, ses réponses DOIVENT pré-remplir les champs correspondants du gabarit cible (ex. section "Généralités" du CSV), sans nécessiter de double saisie. | Should |

### 4.7 Vue portefeuille et opérations transverses *(nouveau — issu de la revue littéraire eQMS/Kneat/ValGenesis)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-070 | Le système DEVRAIT fournir un tableau de bord agrégeant le statut de qualification de tous les projets/équipements. | Should |
| URS-F-071 | Le système DEVRAIT fournir un registre/inventaire des équipements et systèmes (nom, catégorie GAMP, statut de qualification, date de dernière/prochaine revue périodique), alimentant le tableau de bord et le mini-outil Revue périodique (catalogue §10.I). | Should |
| URS-F-072 | Le système DEVRAIT émettre des alertes/rappels automatiques (revue périodique arrivant à échéance, délai de projet approchant — champ délai déjà prévu en URS-F-000). | Should |
| URS-F-073 | Le système DEVRAIT permettre une recherche transversale (mot-clé, équipement, norme citée) à travers tous les projets et livrables. | Should |

### 4.8 Analyse de documents et challenge de dossier *(nouveau v06)*

**Principe directeur** : cette famille de fonctions ne rentre pas en conflit avec le principe fondateur n°1 (l'IA n'est jamais seule source de vérité sur une conformité) — elle produit exclusivement des **constats/extractions à vérifier**, jamais un verdict "conforme/non conforme" attribué à l'outil. La décision reste entièrement humaine.

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-080 | Le système DEVRAIT permettre de charger un document technique d'ingénierie (PID, schéma électrique, plan) et d'en extraire une proposition structurée d'éléments pertinents (ex. liste d'instruments/tags), à des fins d'aide à la rédaction (ex. pré-remplissage de l'IQ) — proposition toujours soumise à validation humaine. | Could |
| URS-F-081 | Le système DEVRAIT permettre de charger un certificat (ex. certificat matière 3.1, certificat FDA, certificat d'étalonnage) et d'en extraire une identification structurée : type de certificat, mesures/valeurs rapportées, mentions réglementaires présentes — y compris lorsque le certificat est rédigé dans une langue différente de la langue de travail de l'utilisateur. | Should |
| URS-F-081bis | *(nouveau)* Pour un certificat rédigé dans une langue non maîtrisée par l'utilisateur, le système DOIT indiquer les termes techniques identifiés avec leur équivalent dans la langue de travail (ex. faire le lien entre une mention allemande et "certificat matière 3.1" ou "rugosité de surface"), pour aider l'utilisateur à retrouver l'information même sans maîtriser cette langue. | Should |
| URS-F-082 | Le système DEVRAIT permettre d'analyser un projet (ses sections liées, notamment la matrice de traçabilité) et de signaler les écarts structurels détectables : exigence URS sans section/preuve liée, document attendu absent de la section "Documents". La détection d'écarts structurels (liens manquants) PEUT être déterministe (basée sur les liens du modèle de données) ; toute évaluation sémantique plus fine ("ce certificat couvre-t-il réellement cette exigence") DOIT rester une proposition IA soumise à validation humaine. | Should |
| URS-F-083 | *(garde-fou, Must)* Aucune fonction d'analyse de document ou de challenge de dossier NE DOIT produire de verdict de conformité final attribué à l'outil — le résultat est systématiquement présenté comme "constat/proposition à vérifier", jamais comme "conforme"/"non conforme" tranché par l'outil. Cohérent avec le principe fondateur n°1. | Must |

### 4.9 Connecteurs QMS tiers *(nouveau v16 — REV-URS-005, décision utilisateur du 22/08/2026 de lever l'exclusion Phase 1)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-090 | Le système DOIT permettre de configurer, par client (`client_config`, cohérent avec l'isolation URS-F-024), une connexion à un ou plusieurs systèmes qualité tiers, via un pattern d'adaptateur enfichable (même principe que le routeur IA, URS-F-032) — architecture Must Phase 1. | Must |
| URS-F-090bis | Un connecteur de référence complet (Veeva Vault) DOIT être disponible dès la Phase 1. | Should |
| URS-F-090ter | Des connecteurs additionnels (SAP, TrackWise, autres) PEUVENT être ajoutés sans refonte de l'architecture, via le même pattern d'adaptateur. | Could |
| URS-F-090quater | Aucune synchronisation continue/automatique (webhook temps réel) n'est prévue en Phase 1 — le pull et le push restent des actions explicites et ponctuelles déclenchées par l'utilisateur ; un système tiers ne devient jamais une seconde source de vérité silencieuse (cohérent avec URS-NF-010). | Must |
| URS-F-091 | Le système DOIT permettre d'importer (pull) une donnée de référence depuis un connecteur QMS tiers configuré, pour alimenter une section — le contenu importé DOIT être soumis aux mêmes garde-fous que la génération par adaptation (URS-F-060bis à 064) : validation section par section obligatoire, confirmation du droit d'usage, signalement visuel des données techniques reprises, traçabilité de la filiation (`qms_connector_id` en plus de `source_document_id`). | Should |
| URS-F-092 | Le système DOIT permettre d'exporter (push) un livrable "validé en interne" vers un connecteur QMS tiers configuré, pour poursuite de son cycle d'approbation dans ce système. | Should |
| URS-F-092bis | *(garde-fou, Must)* Le push NE DOIT JAMAIS être automatique ou silencieux — confirmation explicite obligatoire du client, du système cible **et du tenant/organisation exact** avant tout envoi (double vérification renforcée par rapport à URS-F-034/062, compte tenu du risque de contamination croisée entre clients via un mauvais tenant). | Must |
| URS-F-092ter | *(garde-fou, Must)* Une fois un livrable poussé avec succès, le système DOIT afficher une méta-donnée visible ("en cours d'approbation externe — {système}, {date}, {référence externe}") — le statut interne ValidaPharm ne doit jamais rester silencieusement inchangé une fois la responsabilité d'approbation transférée au système cible. | Must |
| URS-F-092quater | *(garde-fou, Must)* Le push DOIT attendre une confirmation de réception explicite du système cible avant d'être marqué réussi côté ValidaPharm ; en cas d'échec réseau, un identifiant de transaction unique garantit qu'un retry ne crée jamais de doublon dans le système cible (idempotence). | Must |

### 4.10 Structure Système — référentiel d'actifs hiérarchique et flexible *(nouveau v17 — REV-URS-006, besoin exprimé par l'utilisateur)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-F-100 | Le système DOIT permettre de créer, par client, un référentiel d'actifs (systèmes, équipements, utilités, locaux, ou tout autre niveau défini par le client) **partagé entre tous les projets de ce client** — pas un référentiel par projet. Isolation stricte par client, même principe que URS-F-024. | Must |
| URS-F-100bis | La structure de hiérarchie (nombre de niveaux, libellés, règles de numérotation/codification) DOIT être configurable par client — aucune hiérarchie imposée par défaut par l'outil. | Must |
| URS-F-100ter | Chaque nœud DOIT pouvoir porter un **lien hiérarchique principal** (parent unique, formant un arbre — aucun cycle toléré sur ce lien) ET des **liens d'association multiples non hiérarchiques** (formant un graphe libre, cycles possibles et acceptables — ex. une utilité desservant plusieurs systèmes). Les deux types de lien sont distincts et ne doivent jamais être confondus dans la vue graphique. | Must |
| URS-F-100quater | Une vue graphique globale DOIT permettre de visualiser les connexions (hiérarchiques et d'association) entre systèmes, équipements, utilités et locaux d'un même client — même principe que la vue de traçabilité des sections de projet (URS-F-000ter). | Should |
| URS-F-100quinquies | À la création ou modification d'un Projet, le système DOIT permettre de sélectionner un ou plusieurs nœuds existants du référentiel d'actifs du client comme objet(s) du projet. | Must |
| URS-F-100sexies | Si le système/équipement concerné n'existe pas encore dans le référentiel, le système DOIT permettre de le créer manuellement à la volée depuis le contexte de création du projet, sans interrompre le flux. | Must |
| URS-F-100septies | Le référentiel d'actifs DOIT pouvoir être alimenté soit par pull depuis un connecteur QMS tiers configuré (ex. SAP — nomenclature équipement/emplacement fonctionnel), réutilisant le mécanisme et les garde-fous déjà définis en URS-F-091, soit par saisie manuelle — au choix, nœud par nœud. | Should |
| URS-F-100octies | *(garde-fou, Must)* Toute suppression ou modification d'un nœud DOIT être journalisée. La suppression d'un nœud référencé par au moins un projet NE DOIT JAMAIS être silencieuse ni casser le lien du projet — le lien devient explicitement "orphelin" et visible, jamais supprimé sans trace. | Must |
| URS-F-100nonies | *(garde-fou, Must — E2)* Le code/numérotation d'un nœud DOIT être unique au sein du référentiel d'un même client — vérifié à la création et à toute modification d'un nœud, rejet explicite en cas de doublon. | Must |
| URS-F-100decies | *(garde-fou, Must — E3)* Le lien entre un projet et un nœud du référentiel DOIT capturer un instantané (nom/code au moment de la liaison) pour la fidélité des exports/livrables déjà validés — un renommage ultérieur du nœud ne doit jamais modifier silencieusement le contenu affiché d'un livrable existant. Le lien vif vers l'identifiant du nœud reste par ailleurs conservé pour la navigation et la vue graphique. | Must |
| URS-F-101 | *(nouveau v18 — REV-URS-007, besoin exprimé par l'utilisateur)* Depuis un nœud du référentiel d'actifs, le système DOIT permettre d'accéder à un "dossier vivant" listant tous les livrables (sections) qui le concernent, à travers tous les projets du client — répond au besoin de retrouver le rapport de qualification d'un équipement en parcourant la structure hiérarchique jusqu'à lui. | Should |
| URS-F-101bis | *(nouveau v18 — E5)* Chaque section DOIT pouvoir être liée individuellement à un ou plusieurs nœuds du référentiel, en plus du lien global hérité de son projet (URS-F-100quinquies) — affinement optionnel, pour le cas où un projet concerne plusieurs nœuds mais qu'une section précise n'en concerne qu'un sous-ensemble. Par défaut, une section hérite des nœuds de son projet sans action supplémentaire de l'utilisateur. | Should |
| URS-F-101ter | *(nouveau v18 — E4)* Le dossier vivant DOIT, par défaut, afficher uniquement les livrables au statut "validé en interne", avec un filtre explicite pour inclure les brouillons/versions en cours — jamais présenter un brouillon non validé comme le document officiel par défaut. | Must |
| URS-F-101quater | *(nouveau v18 — E3)* Le dossier vivant DOIT regrouper les livrables par famille de gabarit (catalogue §10) avec la version courante mise en avant, l'historique de révisions (`revisions[]`) restant consultable pour chaque livrable listé. | Should |
| URS-F-101quinquies | *(garde-fou, Must)* Toute création/modification/retrait d'un lien section↔nœud DOIT être journalisé — même principe que URS-F-000sexies pour les liens entre sections. | Must |
| URS-F-101sexies | *(nouveau v19 — REV-URS-008, besoin exprimé par l'utilisateur)* Le système DOIT permettre d'exporter le dossier vivant d'un nœud (ou un sous-ensemble filtré) au format PDF, sous forme de synthèse — réutilise le moteur d'export déjà existant (URS-F-020). | Should |
| URS-F-101septies | *(nouveau v19 — E4/E3)* Cette synthèse DOIT lister chronologiquement **toutes** les occurrences validées dans le temps (pas seulement la version courante), avec pour chacune : date de validation, type de protocole, référence et version. Elle DOIT porter les mêmes rappels que tout export standard (URS-F-011bis, et URS-F-092ter si applicable) ainsi qu'un bandeau explicite précisant la période/le périmètre couvert par les données saisies dans l'outil — pour ne jamais laisser croire à une complétude historique totale si une qualification antérieure à l'adoption de ValidaPharm existe hors de l'outil. | Must |
| URS-F-102 | *(nouveau v20 — REV-URS-009, besoin exprimé par l'utilisateur)* Chaque nœud du référentiel d'actifs DOIT pouvoir être marqué "soumis à qualification périodique" (oui/non) et, si oui, porter une date limite de requalification. | Must |
| URS-F-102bis | *(nouveau v20 — recherche + panel)* Chaque nœud DOIT porter un statut de qualification choisi dans une liste fermée standardisée : Non qualifié / En cours de qualification initiale / Qualifié / Qualifié avec écart(s) ouvert(s) / Requalification requise / Requalification en retard / Suspendu — sous contrôle de changement / Déclassé — retiré. *(Note : convention de fait issue des pratiques eQMS/plans de validation courants — aucun texte normatif unique n'impose cette liste précise ; à confirmer/adapter si le client a déjà sa propre nomenclature interne.)* | Must |
| URS-F-102ter | *(nouveau v20 — E5)* Le passage à "Requalification requise"/"Requalification en retard" DOIT être dérivé automatiquement de la date limite (URS-F-102) lorsqu'elle approche ou est dépassée — pas seulement positionné manuellement. Réutilise le mécanisme d'alerte déjà existant (URS-F-072). | Must |
| URS-F-102quater | *(garde-fou, Must — E3)* Lors de la sélection d'un nœud à la création/liaison d'un projet (URS-F-100quinquies), si son statut est "Requalification en retard" ou "Suspendu", un avertissement explicite DOIT être affiché — sans jamais bloquer la sélection, la décision de poursuite restant sous responsabilité humaine (cohérent avec le principe fondateur n°1). | Must |
| URS-F-102quinquies | *(garde-fou, Must — E4)* Tout changement de statut d'un nœud, automatique ou manuel, DOIT être journalisé (qui/quand/ancien statut/nouveau statut). | Must |

## 5. Exigences non fonctionnelles

### 5.1 Fiabilité et qualité

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-001 | Tout calcul réglementaire DOIT être déterministe, testé unitairement, jamais délégué à l'IA générative. | Must |
| URS-NF-002 | Comportement identique et reproductible pour une même saisie. | Must |
| URS-NF-003 | Toute suggestion IA DOIT être visuellement distincte du contenu validé. | Must |
| URS-NF-045 | *(nouveau v05 — revue technique E5)* Le système DOIT détecter et gérer le cas d'une modification concurrente du même livrable dans deux onglets/sessions du même poste (ex. verrouillage optimiste, avertissement avant écrasement). | Must |
| URS-NF-046 | *(nouveau v05 — revue technique E5)* Le modèle de données pivot DOIT être versionné indépendamment des gabarits (au-delà d'URS-REG-003), avec un mécanisme de migration testé permettant l'évolution du schéma sans perte des données existantes. | Must |
| URS-NF-046bis | *(nouveau v09 — audit Swissmedic simulé, MAJ-03)* Lorsqu'un défaut est corrigé dans le moteur de calcul déterministe, le système DOIT permettre d'identifier, via `template_engine_version` (URS-F-004bis), les sections déjà "validé en interne" produites avec la version défectueuse, pour engager une revue d'impact rétrospective (CAPA). Le simple enregistrement de la version (déjà couvert par F-004bis) ne suffit pas sans mécanisme d'exploitation à cette fin. | Must |
| URS-NF-046ter | *(nouveau v11 — revue FDS, E3)* L'alerte de revue d'impact rétrospective (URS-NF-046bis) DOIT nécessiter un accusé de réception explicite de l'utilisateur avant de pouvoir être masquée — un bandeau simplement visible mais ignorable est insuffisant compte tenu de la sévérité du risque associé (AR-R-39, S=5). | Must |
| URS-NF-046quater | *(nouveau v13 — revue SDS, E2)* Toute migration du schéma de données pivot (URS-NF-046) DOIT être précédée d'une sauvegarde vérifiable de l'état antérieur, et DOIT prévoir un mécanisme de retour arrière testé en cas d'échec en cours d'exécution — une migration "testée" au sens de URS-NF-046 inclut nécessairement ce cas d'échec, pas seulement le cas nominal. | Must |
| URS-NF-052 | *(nouveau v07 — auto-challenge, précisé v22)* L'interface DOIT rester réactive (temps de réponse perçu acceptable) jusqu'à un volume de référence — un test de charge correspondant DOIT être spécifié en OQ/PQ de l'outil. Volume de référence Phase 1 : jusqu'à 500 projets et 5000 sections par client. | Should |
| URS-NF-052bis | *(nouveau v22 — checklist de complétude §6ter)* Chargement de l'écran principal (tableau de bord) et ouverture d'une section DOIVENT rester sous 2 secondes perçues sur un poste de travail standard, dans les limites du volume de référence (URS-NF-052). Au-delà de ce volume, l'outil DOIT dégrader gracieusement (ex. pagination, chargement progressif) plutôt que devenir inutilisable ou se bloquer silencieusement. | Should |
| URS-NF-053 | *(nouveau v12 — audit QA spécialisés, MAJ-01)* Un journal d'anomalies léger DOIT permettre de consigner toute anomalie constatée dans l'outil (au-delà du cas spécifique du moteur de calcul déjà couvert par URS-NF-046bis/046ter) — description, statut de suivi (ouvert/en cours/clos), horodatage — consultable par l'utilisateur. Proportionné à la Phase 1 mono-utilisateur : pas un processus CAPA complet, un suivi minimal auditable. | Must |
| URS-NF-045bis | *(nouveau v08 — revue FS, E5)* Le système DOIT détecter un conflit de fusion Git sur les fichiers de données structurées résultant d'une modification hors-ligne du même livrable sur deux postes différents, et présenter une interface de résolution assistée — jamais une fusion automatique silencieuse au niveau des champs, et jamais l'exposition de marqueurs de conflit Git bruts à l'utilisateur. Distinct de URS-NF-045 (conflit multi-onglets du même poste). | Must |

### 5.2 Portabilité et continuité

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-010 | Récupération intégrale des données depuis n'importe quel poste, via le dépôt Git dédié. | Must |
| URS-NF-030 | Chaque modification DOIT être attribuable et horodatée, via l'historique Git et protégé contre la réécriture (branche principale protégée, dès la Phase 1). **(amendé v23 — architecture web pure sans installation, décision explicite du 23/08/2026)** L'attribution se fait par l'API GitHub (jeton authentifié), pas par signature cryptographique GPG/SSH locale (impossible sans binaire `git` installé) — limite Phase 1 assumée, distincte de l'audit trail Part 11 complet (Phase 3), documentée explicitement plutôt que présentée comme une signature qu'elle n'est pas. | Must |
| URS-NF-011 | Copie miroir Drive maintenue comme filet de secours. | Must |
| URS-NF-012 | Fonctionnement sans réseau pour toutes les fonctions de rédaction/gabarits. | Must |
| URS-NF-047 | *(nouveau v05 — revue technique E5)* Le système DOIT surveiller l'usage de sa capacité de stockage local et avertir l'utilisateur avant d'atteindre les limites du navigateur. | Should |
| URS-NF-049 | *(nouveau v05 — revue technique E5)* Le système DOIT offrir un point de restauration explicite en libre-service (au-delà de la synchronisation automatique et de l'historique Git), permettant de revenir à un état antérieur connu. | Should |
| URS-NF-055 | *(nouveau v22 — checklist de complétude §6ter, amendé v23 — architecture web pure)* La désinstallation de l'outil DOIT être réalisable sans reliquat : suppression du site depuis l'écran d'accueil s'il est installé en PWA, et effacement du stockage du navigateur (IndexedDB, cache) pour ce site — aucun exécutable, aucune modification de configuration système, cohérent avec l'architecture web pure sans installation. | Should |
| URS-NF-055bis | *(nouveau v22 — checklist de complétude §6ter)* Un rollback vers une version antérieure de l'application (retour à un tag Git antérieur) DOIT être possible sans corrompre les données existantes. Si la version antérieure de l'application ne sait pas lire le `schema_version` courant des données (URS-NF-046), elle DOIT refuser explicitement de démarrer plutôt que de risquer une lecture/écriture incorrecte silencieuse — le mécanisme de migration (URS-NF-046quater) protège la montée de version, celui-ci protège symétriquement la rétrogradation. | Must |

### 5.3 Sécurité et confidentialité

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-020 | Aucune donnée de livrable transmise à un tiers sans action explicite. | Must |
| URS-NF-021 | Dépôt Git dédié privé, accès restreint. | Must |
| URS-NF-022 | Modèle de données prêt pour la gestion d'accès multi-utilisateur dès la Phase 1 (UI mono-utilisateur). | Must |
| URS-NF-023 | (Phase multi-utilisateur) Identifiants d'authentification hachés, jamais en clair. | Must (phase ultérieure) |
| URS-NF-024 | (Phase multi-utilisateur) Journalisation inaltérable des accès et actions significatives. | Must (phase ultérieure) |
| URS-NF-025 | *(nouveau v05 — point F de la revue littéraire)* Le système DEVRAIT permettre de partager un projet en lecture seule et temporaire avec un tiers externe (ex. auditeur), sans lui octroyer un compte utilisateur complet. | Should (Phase 3, nécessite l'infrastructure multi-utilisateur) |
| URS-NF-044 | *(nouveau v05 — revue technique E5, amendé v23)* Aucun secret (clé API, jeton d'authentification) NE DOIT être stocké en clair dans le dépôt Git ni dans le code source. **(amendé v23)** En architecture web pure sans installation (pas de mécanisme de configuration locale hors navigateur), le jeton GitHub/Drive/IA est stocké dans le stockage du navigateur — jamais en clair dans le code, jamais transmis à un tiers autre que son API cible. | Must |
| URS-NF-044bis | *(nouveau v23 — décision explicite du 23/08/2026, architecture web pure)* Le jeton d'accès GitHub utilisé par l'application DOIT être à portée restreinte (scope limité au dépôt dédié uniquement, jamais un jeton à portée large sur l'ensemble du compte GitHub de l'utilisateur) — limite le dommage en cas de compromission du poste ou du navigateur. | Must |
| URS-NF-048 | *(nouveau v05 — revue technique E5, lié à URS-F-032)* Le système DOIT intégrer un garde-fou technique (quota/seuil configurable par fournisseur) contre une consommation excessive imprévue d'un service cloud IA (maîtrise des coûts). | Must |
| URS-NF-051 | *(nouveau v07 — auto-challenge)* Aucune télémétrie, statistique d'usage ou rapport d'erreur automatique NE DOIT être transmis à un service tiers sans consentement explicite et distinct du consentement chat/IA (URS-F-034). | Must |

### 5.4 Traçabilité et audit

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-031 | Historique complet des révisions d'un livrable consultable. | Must |
| URS-NF-032 | (Phase Part 11) Signature électronique conforme 21 CFR Part 11/Annexe 11. | Must (phase ultérieure) |

### 5.5 Utilisabilité

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-040 | *(amendé v06)* Interface disponible en plusieurs langues (français, anglais, allemand dès la Phase 1 ; chinois, arabe en phases ultérieures), avec un vocabulaire adapté au domaine qualité/validation pharma dans chaque langue — pas une traduction littérale. | Must |
| URS-NF-040bis | *(nouveau v06)* Le choix de la langue DOIT être configurable par utilisateur et/ou par projet. | Should |
| URS-NF-040ter | *(nouveau v06)* Chaque langue ajoutée DOIT être validée par un expert du domaine natif de cette langue avant mise en service — pas de traduction automatique non validée. | Must |
| URS-NF-040quater | *(nouveau v06, technique)* L'architecture logicielle DOIT supporter nativement les mises en page bidirectionnelles (RTL pour l'arabe) et les jeux de caractères CJK (chinois) dès la conception de l'interface, même si ces langues sont livrées en phase ultérieure. | Should |
| URS-NF-041 | Utilisable sans formation préalable pour un professionnel du domaine. | Should |
| URS-NF-042 | Temps de rédaction significativement réduit vs Word manuel. | Should |
| URS-NF-043 | *(nouveau)* La priorité de conception Phase 1 est la fiabilité et le caractère défendable GMP du contenu et du raisonnement produits, avant l'automatisation du workflow d'approbation (voir §2). | Must |
| URS-NF-050 | *(nouveau v05 — revue technique E5)* Le système DOIT offrir une accessibilité clavier de base pour les fonctions critiques (navigation, saisie, export). | Should |
| URS-NF-050bis | *(nouveau v22 — checklist de complétude §6ter)* Les composants interactifs et le contenu porteur de sens fonctionnel (statuts, alertes, messages système) DOIVENT exposer un nom/rôle accessible compatible avec un lecteur d'écran standard (ex. NVDA/VoiceOver), sur les mêmes parcours critiques que URS-NF-050 (navigation, saisie, export). | Should |

### 5.6 Charte graphique et identité visuelle *(nouveau v21 — REV-URS-VALIDAPHARM-2026-010)*

| ID | Exigence | Priorité |
|---|---|---|
| URS-NF-054 | L'écran de travail DOIT véhiculer une identité visuelle moderne, fluide et premium (micro-interactions soignées, retours visuels immédiats, transitions douces) — critère explicite de l'utilisateur, distinct du ton strictement documentaire des livrables exportés (voir URS-NF-054bis). | Must |
| URS-NF-054bis | Les livrables exportés (Word/PDF, destinés à un usage réglementaire opposable) DOIVENT conserver une présentation sobre et strictement documentaire, indépendamment du style de l'écran de travail — l'identité visuelle "premium/ludique" de l'outil ne DOIT jamais se propager dans le contenu exporté. | Must |
| URS-NF-054ter | Toute information fonctionnelle portée par une couleur (notamment `qualification_status`, criticité IPR/AMDEC) NE DOIT JAMAIS être encodée par la couleur seule — un second indicateur (icône, libellé texte, motif) DOIT toujours l'accompagner, pour rester lisible en cas de daltonisme. | Must |
| URS-NF-054quater | Le contraste texte/fond de toute information porteuse de sens fonctionnel DOIT atteindre un niveau reconnu (référence : WCAG 2.1 niveau AA), y compris pour les couleurs de statut. | Should |
| URS-NF-054quinquies | L'écran de travail et les documents exportés DOIVENT utiliser des familles de polices distinctes et intentionnelles : une police système moderne pour l'écran, une police classique à empattements pour les documents exportés, cohérente avec l'usage réglementaire de ces derniers. | Should |

## 6. Exigences réglementaires et de conformité

| ID | Exigence | Priorité |
|---|---|---|
| URS-REG-001 | Conception basée sur le risque, cohérente avec GAMP 5. | Must |
| URS-REG-002 | Livrables de qualification de l'outil produits en parallèle du code. | Must |
| URS-REG-003 | Gabarits versionnés indépendamment du code applicatif. | Should |
| URS-REG-004 | *(nouveau v13 — revue SDS, E4)* La maîtrise des changements de la logique métier (moteur de calcul, machine à états, grilles de décision) DOIT être techniquement appliquée — un mécanisme automatisé DOIT bloquer l'intégration d'une modification de code dont les tests unitaires associés échouent, pas seulement une pratique déclarée reposant sur la discipline du développeur. Point identifié lors de l'audit du cabinet de conseil GxP sur la FDS, explicitement renvoyé à la SDS pour concrétisation. | Must |

Clarification de périmètre normatif : EN/IEC 62304 ne s'applique pas à ValidaPharm (outil interne, non intégré à un dispositif médical) — le cadre applicable est GAMP 5.

**Analyse des "predicate rules" applicables (ajoutée v10 — audit FDA simulé, MAJ-FDA-01)** : question distincte de la clarification EN/IEC 62304 ci-dessus — quelle règle de fond (21 CFR 211 pour les BPF médicament, 21 CFR 820 pour les dispositifs médicaux) s'applique aux **enregistrements produits par l'outil** une fois utilisés par le client, indépendamment du statut de l'outil lui-même ? Conclusion retenue : **tant qu'un livrable reste dans ValidaPharm** (quel que soit son statut interne, y compris "validé en interne"), **aucune predicate rule ne s'applique à l'outil** — ValidaPharm n'est pas le système d'enregistrement officiel du client, il produit des brouillons/propositions (cohérent avec URS §8, "brouillon d'aide" ≠ enregistrement GxP officiel). La predicate rule (211 ou 820 selon le cas) ne s'active qu'au moment où le client reprend formellement le livrable dans son propre système qualité (eQMS, DHF, DMR) — à ce moment, la responsabilité de conformité et de conservation légale (ex. 21 CFR 820.180 : durée de vie du dispositif, minimum 2 ans) devient celle du système qualité du client, pas de ValidaPharm.

**Référence complémentaire (ajoutée v07 — auto-challenge)** : l'**ISPE GAMP AI Guide (juillet 2025)** — guide dédié à l'usage de l'intelligence artificielle dans des systèmes GxP, publié en complément de GAMP 5 (2ᵉ édition, 2022) — DOIT être utilisé comme référence de fond pour la conception du routeur IA, du chat expert et des assistants (§4.1bis, §4.4, §4.6, §4.8), en complément des principes ICH Q9 déjà cités. Identifié tardivement (audit d'auto-challenge du 21/08/2026) alors qu'il avait été repéré dès la recherche initiale sur GAMP 5 — non exploité jusqu'ici, corrigé.

## 7. Contraintes

- C-01 : Fonctionnement sur postes Windows/Mac habituels, sans droits d'administration complexes.
- C-02 : Pas de dépendance à un service payant obligatoire pour les fonctions cœur.
- C-03 : Dépôt Git dédié hébergé sur GitHub, en dépôt privé.
- C-04 : La confidentialité du dépôt dépend de la sécurité du compte GitHub de l'utilisateur (2FA recommandée) — hors périmètre de conception de l'outil.

## 8. Hors périmètre (Phase 1)

- Authentification multi-utilisateur opérationnelle.
- Signature électronique Part 11.
- Application mobile.
- *(retiré v16)* ~~Intégration ERP/QMS tiers~~ — exclusion levée le 22/08/2026, voir §4.9. Restent hors périmètre : synchronisation continue/automatique (webhook temps réel) et connecteurs autres que Veeva Vault/SAP/TrackWise.
- Génération de texte libre par IA sans encadrement par gabarit.
- Un livrable "brouillon d'aide" n'est pas, et ne doit jamais être présenté comme, un enregistrement GxP officiel tant qu'il n'a pas été formellement repris dans le système qualité réel de l'organisation.

## 9. Critères d'acceptation globaux de la Phase 1

1. Un Projet peut être créé, avec au moins deux sections liées entre elles et une section Documents opérationnelle.
2. Les gabarits du catalogue (§10) sont rejouables sans erreur et exportables Word/PDF/JSON.
3. Aucune donnée perdue après fermeture/réouverture sur le même poste.
4. *(amendé v23 — architecture web pure)* Données retrouvées à l'identique en se connectant depuis un second poste (navigateur + jeton, aucune installation) ; commits attribués par jeton API vérifiables dans l'historique GitHub (pas une signature cryptographique GPG/SSH, voir URS-NF-030).
5. Sauvegarde miroir Drive à jour après une session.
6. Chat expert cloud/local avec bascule visible, sessions journalisées.
7. Aucun calcul réglementaire, ni aucune conclusion de la grille de stratégie de qualification, généré par l'IA générative sans validation humaine explicite.
8. *(ajouté v06)* Une section "Contexte procédé" peut être créée et liée à une section OQ/PQ/Validation de procédé du même projet.
9. *(ajouté v06)* L'architecture des workflows (rédaction/co-rédaction, revue, approbation) est en place, même si l'activation de signature reste hors périmètre Phase 1.
10. *(ajouté v06)* L'interface et les gabarits sont utilisables en français, anglais et allemand, chaque langue ayant été validée par un expert natif du domaine.
11. *(ajouté v06)* Aucune fonction d'analyse de document, de certificat ou de challenge de dossier ne produit de verdict "conforme"/"non conforme" attribué à l'outil — uniquement des constats à vérifier.
12. *(ajouté v07)* Aucune télémétrie ou donnée d'usage n'est transmise sans consentement explicite et révocable de l'utilisateur, avec état du consentement visible à tout moment.
13. *(ajouté v07)* Chaque fournisseur IA connectable (Claude par défaut, extension possible OpenAI/Copilot/DeepSeek…) est qualifié à la fois sur le traitement des données (déjà couvert v05) et sur sa fiabilité/qualité de réponse, avant activation pour un usage réel.
14. *(ajouté v08 — revue FS)* Une section IQ ne peut être finalisée sans lien vers un Plan de métrologie ; une section OQ ne peut être clôturée sans lien vers un Plan de maintenance — même mécanisme que le Contexte procédé (critère 8).
15. *(ajouté v08 — revue FS)* Un changement de version d'un fournisseur IA actif depuis sa dernière qualification de fiabilité déclenche une alerte de re-qualification, visible avant tout usage réel.
16. *(ajouté v08 — revue FS)* Un conflit de fusion Git entre deux postes ayant modifié le même livrable hors-ligne est détecté et présenté via une interface de résolution assistée, jamais par une fusion silencieuse ni par l'exposition de marqueurs Git bruts.
17. *(ajouté v09 — audit Swissmedic simulé)* L'échantillon de questions-types de qualification de fiabilité IA est versionné et stable entre qualification initiale et re-qualification.
18. *(ajouté v09 — audit Swissmedic simulé)* Une correction de défaut du moteur de calcul permet d'identifier les sections déjà validées produites avec la version défectueuse, en vue d'une revue d'impact.
19. *(ajouté v09 — audit Swissmedic simulé)* L'équivalence de contenu entre versions linguistiques d'un même gabarit est vérifiée par un test de non-régression dédié.
20. *(ajouté v10 — audit FDA simulé)* L'export d'un livrable "validé en interne" rappelle explicitement le transfert de responsabilité de conservation réglementaire vers le système qualité du client.
21. *(ajouté v11 — revue FDS)* L'alerte de revue d'impact CAPA (défaut moteur corrigé) exige un accusé de réception explicite avant de pouvoir être masquée.
22. *(ajouté v11 — revue FDS)* Toute action de forçage d'un garde-fou non négociable capture un motif texte obligatoire, journalisé aux côtés de l'horodatage et de l'acteur.
23. *(ajouté v12 — audit QA spécialisés)* Un journal d'anomalies léger permet de consigner et suivre toute anomalie constatée dans l'outil, au-delà du cas spécifique du moteur de calcul.
24. *(ajouté v13 — revue SDS)* Toute migration de schéma est précédée d'une sauvegarde vérifiable et dispose d'un mécanisme de retour arrière testé.
25. *(ajouté v13 — revue SDS)* Un mécanisme automatisé bloque l'intégration d'une modification de la logique métier dont les tests unitaires échouent.
26. *(ajouté v16)* Un connecteur QMS tiers (Veeva Vault) peut être configuré par client, avec pull de donnée de référence et push d'un livrable validé, jamais sans confirmation explicite (client + système + tenant).
27. *(ajouté v16)* Un push réussi affiche une méta-donnée visible de suivi externe ; un pull respecte les mêmes garde-fous que la génération par adaptation (URS-F-060bis à 064).
28. *(ajouté v17)* Un référentiel d'actifs hiérarchique, partagé par client, peut être créé avec une hiérarchie configurable, sélectionné à la création d'un projet, et alimenté par pull SAP ou saisie manuelle.
29. *(ajouté v17)* Un renommage d'un nœud du référentiel ne modifie jamais silencieusement un livrable déjà lié (instantané conservé) ; deux nœuds d'un même client ne peuvent jamais porter le même code.
30. *(ajouté v18)* Depuis un nœud du référentiel, un dossier vivant liste ses livrables (filtré par défaut sur "validé en interne"), avec possibilité de lien section↔nœud plus fin que le lien de projet.
31. *(ajouté v19)* Le dossier vivant d'un nœud est exportable en PDF, historique chronologique complet, avec bandeau de périmètre des données couvertes.
32. *(ajouté v20)* Un nœud peut être marqué "soumis à qualification périodique" avec date limite ; son statut de qualification (liste fermée standardisée) est dérivé automatiquement de cette date le cas échéant, journalisé, et déclenche un avertissement (non bloquant) à la sélection si "Requalification en retard" ou "Suspendu".

## 10. Catalogue des gabarits (outils et mini-outils) *(nouveau — issu de la lecture ASTM E2500 / EudraLex Annexe 15 / ICH Q9)*

Restructuration des gabarits en familles ("outils") et sous-types ("mini-outils"), suite à l'identification d'écarts par rapport aux normes de référence (voir REV-CATALOGUE-VALIDAPHARM-2026-001).

| Outil | Mini-outils | Statut |
|---|---|---|
| A. Cadrage | Contexte (section de projet), **URS** *(nouveau)* | URS nouveau à développer |
| B. Conception | **DQ / Revue de conception** *(nouveau)* | Nouveau |
| C. Protocoles | FAT, SAT, IQ, OQ, PQ | Existant, regroupé |
| D. Validation de procédé | **Classique (3 lots)**, **vérification continue**, **hybride** *(nouveau)* | Nouveau — écart majeur identifié (Annexe 15 §5) |
| E. Validation de nettoyage | — | Existant, inchangé |
| F. Analyse de risque | ICH Q9 générique, AMDEC/FMEA/FMECA, **ACFC — Analyse de Criticité des Fonctions et Composants** *(nouveau — questionnaire de 6 à 9 questions par composant/fonction, déterminant la criticité vis-à-vis du produit et de la sécurité patient ; équivalent du "System Impact Assessment/Component Criticality Assessment" d'ASTM E2500)*, **Computer System Assessment** *(nouveau — périmètre à préciser vs le gabarit CSV existant)* | Existant + extensions |
| G. Systèmes informatisés | CSV, Data Integrity | Existant, inchangé |
| H. Changements & non-conformités | Change Control, CAPA | Existant, inchangé |
| I. Pilotage projet | VMP + traçabilité (fusion du Cycle en V), **Rapport de synthèse/clôture** *(nouveau)*, **Revue périodique** *(nouveau, léger)* | Restructuré |
| J. Assistants IA transverses | Assistant de stratégie de qualification (§4.6), Génération par adaptation (§4.1bis), Gabarits d'export client (§4.3bis) | Nouveau |
| K. Sélection et qualification fournisseur *(nouveau v05)* | Évaluation/audit fournisseur — étape amont, souvent antérieure à l'URS et la DQ dans un projet d'achat d'équipement | Nouveau — issu de l'expertise métier |
| L. Métrologie *(nouveau v06)* | Plan de métrologie/étalonnage (liste d'instruments, fréquences, tolérances, certificats), lié à l'IQ | Nouveau |
| M. Maintenance *(nouveau v06)* | Plan de maintenance préventive, lié à la clôture de l'OQ (Annexe 15 §3.12) | Nouveau |
| N. Connecteurs QMS tiers *(nouveau v16)* | Configuration de connexion (§4.9) : Veeva Vault (référence, Should Phase 1), SAP/TrackWise (Could, extensibles via le même pattern) | Nouveau — décision utilisateur de lever l'exclusion Phase 1 |
| O. Structure Système / référentiel d'actifs *(nouveau v17)* | Référentiel hiérarchique et flexible par client (§4.10) : systèmes, équipements, utilités, locaux, hiérarchie configurable, alimentable par pull SAP ou saisie manuelle | Nouveau — besoin exprimé par l'utilisateur |

**ACFC clarifié (21/08/2026)** : Analyse de Criticité des Fonctions et Composants — questionnaire de 6 à 9 questions appliqué à chaque composant/fonction du système, déterminant s'il est critique vis-à-vis du produit et de la sécurité patient. Confirmé équivalent au concept ASTM E2500 (System Impact Assessment / Component Criticality Assessment) déjà identifié par lecture normative — fusionné en un seul mini-outil.

**Computer System Assessment clarifié (21/08/2026)** : évaluation initiale et légère ("triage"), distincte du gabarit CSV complet — répond à "est-ce un système GxP (Annexe 11/PIC/S PI 011-3) ? quelle catégorie GAMP probable ? impact direct/indirect/aucun ?", utilisable avant de décider d'ouvrir un dossier CSV complet (ex. passage en revue rapide de plusieurs systèmes d'une installation). Si l'évaluation conclut qu'un dossier complet est nécessaire, ses réponses pré-remplissent la section "Généralités" du gabarit CSV — pas de double saisie. Même principe que l'ACFC, transposé aux systèmes informatisés.

**Point restant, priorité basse** : pertinence de mini-outils dédiés Validation du transport / Validation de l'emballage / Validation des méthodes analytiques (identifiés dans l'Annexe 15 mais non demandés explicitement par l'utilisateur — proposés en Should).

## 11. Traçabilité (à compléter au fil du projet)

| Exigence URS | Réf. FS | Réf. implémentation | Réf. test (IQ/OQ/PQ outil) | Statut |
|---|---|---|---|---|
| URS-F-000 | — | — | — | À faire |
| ... | | | | |

*Ce tableau sera complété au fur et à mesure de la conception détaillée (FS) et du développement.*

---
*Document vivant, version 23 — v06-v13 : voir historique complet dans le corps du document et les REV/AUDIT associés. v16 connecteurs QMS tiers. v17 Structure Système (référentiel d'actifs, arbre + graphe). v18 dossier vivant d'un actif. v19 export PDF de l'historique de qualification. v20 statut de qualification standardisé par nœud. v21 (23/08/2026) : charte graphique et identité visuelle. v22 (23/08/2026) résorbe les trois gaps mineurs de la checklist §6ter (performance/capacité, lecteur d'écran, désinstallation/rollback). **v23 (23/08/2026, décision explicite de l'utilisateur) : architecture web pure sans installation** — contrainte réelle du poste de travail professionnel (IT bloque les logiciels non autorisés, seuls le navigateur et github.com le sont). URS-NF-030 amendé (attribution par API GitHub, pas de signature GPG/SSH locale — limite Phase 1 assumée) ; URS-NF-044 amendé + URS-NF-044bis nouveau (jeton à portée restreinte, stockage navigateur) ; URS-NF-055 amendé (désinstallation = effacement du stockage navigateur, plus de "dossier applicatif local"). Résout au passage une incohérence latente : le diagramme d'architecture SDS §2 disait déjà "API GitHub" mais SDS §5 décrivait des mécanismes (signature GPG/SSH, driver de fusion Git local) qui supposaient un accès Git natif — jamais détectée jusqu'ici. FS/FDS/SDS mis à jour en conséquence.*

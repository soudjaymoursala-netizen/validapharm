# Chantier « pages » (fonctionnel + UI) — recap de continuité

**Ce fichier est la mémoire de ce chantier précis.** Il ne remplace pas
`docs/CONTEXTE-REPRISE-SESSION.md` (état global du projet) — il sert
uniquement à ce que n'importe quelle session Claude (même sur un autre
compte, même après une perte de contexte) puisse reprendre exactement là
où la précédente s'est arrêtée, sans re-poser de questions déjà tranchées.

**Règle pour toute nouvelle session qui reprend ce chantier** : lire ce
fichier en entier avant d'agir, en particulier la section « Reste à faire »
qui fait foi sur l'ordre et l'état d'avancement — ne pas repartir de zéro,
ne pas re-choisir un ordre différent sans dire pourquoi.

---

## 1. Objectif et méthode (décidés par l'utilisateur le 12/09/2026)

- Reprendre l'app **écran par écran, en partant de la page de connexion
  (`Login.vue`)**, dans l'ordre listé en §3.
- Pour **chaque écran**, mener deux chantiers distincts et les livrer
  séparément (deux commits/PR, pas mélangés) :
  1. **Chantier fonctionnel** — bugs réels, comportements cassés ou
     incohérents, edge cases non gérés, trouvés en exerçant l'écran avec
     de vraies données (pas de simple lecture de code).
  2. **Chantier esthétique / UI** — refonte visuelle propre et moderne
     (espacement, hiérarchie visuelle, cohérence avec le reste de l'app,
     responsive, états vides/chargement/erreur soignés), sans changer le
     comportement fonctionnel.
- **Client de test dédié** : voir §2 — à ne jamais confondre avec
  FERRING PHARMACEUTICAL (client réel de l'utilisateur). Supprimable
  définitivement par l'utilisateur à la fin de l'ensemble du chantier.
- **Agents** : recourir à des sous-agents en parallèle quand un écran s'y
  prête (ex. un agent sur le chantier fonctionnel, un autre sur le
  chantier esthétique du même écran, en simultané) — décidé au cas par
  cas selon la taille de l'écran, pas systématique sur les petits écrans.
- **Git** : push CLI direct impossible depuis ce sandbox (pas
  d'identifiants configurés) — tout passe par l'édition/upload GitHub web
  UI, piloté via navigateur (méthode déjà utilisée pour les PR
  précédentes, ex. #34 à #38). Une PR par chantier fini, CI « Quality gate »
  attendue avant merge, comme pour le reste du dépôt.
- **Mise à jour de ce fichier** : à chaque fin de chantier (fonctionnel ou
  esthétique) sur un écran, mettre à jour §4 (dernières tâches réalisées)
  et §3 (cocher l'écran/le chantier terminé) **avant** de passer à l'écran
  suivant — jamais en fin de session seulement, pour rester fiable même en
  cas de coupure brutale.

---

## 2. Client de test

**Pas encore créé** à la date de rédaction de ce fichier (12/09/2026,
première version). Prochaine étape immédiate : créer un client dédié
(ex. nom « QA — Chantier Pages », secteur quelconque, données bidon
clairement identifiables comme telles) pour exercer les écrans qui
dépendent d'un client sélectionné (Architecture, Process, Projets, etc.)
sans toucher aux données réelles de FERRING PHARMACEUTICAL. Une fois créé,
noter ici son nom exact et son `clientId` (UUID visible dans l'URL).

---

## 3. Liste des écrans et état d'avancement

Ordre de traitement : `Login.vue` en premier (imposé explicitement par
l'utilisateur), puis le reste de l'app dans l'ordre du parcours normal
d'un utilisateur (connexion → accueil → gestion clients → structure/process
→ projets/missions → reste). Cet ordre pourra être ajusté en cours de route
si un écran s'avère bloquant pour en tester un autre (ex. il faut un projet
créé pour tester `FicheProjet.vue`).

Légende : ⬜ pas commencé · 🔧 fonctionnel en cours · 🎨 UI en cours · ✅ fait

| Écran | Fonctionnel | UI |
|---|---|---|
| `Login.vue` | ⬜ | ⬜ |
| `AccueilQueVoulezVousFaire.vue` | ⬜ | ⬜ |
| `GestionClients.vue` | ⬜ | ⬜ |
| `FicheClient.vue` | ⬜ | ⬜ |
| `ConfigurationClient.vue` | ⬜ | ⬜ |
| `StructureSysteme.vue` | ⬜ | ⬜ |
| `SuiviPeriodicite.vue` | ⬜ | ⬜ |
| `Process.vue` | ⬜ | ⬜ |
| `RevueStructureProcedure.vue` | ⬜ | ⬜ |
| `TemplatesFormulaires.vue` | ⬜ | ⬜ |
| `TableauDeBord.vue` | ⬜ | ⬜ |
| `FicheProjet.vue` | ⬜ | ⬜ |
| `ListeMissions.vue` | ⬜ | ⬜ |
| `MissionWorkspace.vue` | ⬜ | ⬜ |
| `AssistantStrategieQualification.vue` | ⬜ | ⬜ |
| `AssistantCreationLivrable.vue` | ⬜ | ⬜ |
| `EditeurSection.vue` | ⬜ | ⬜ |
| `DefinitionTests.vue` | ⬜ | ⬜ |
| `ExecutionTests.vue` | ⬜ | ⬜ |
| `RiskAssessmentAmdec.vue` | ⬜ | ⬜ |
| `ImpactAssessment.vue` | ⬜ | ⬜ |
| `ComputerSystemAssessment.vue` | ⬜ | ⬜ |
| `JournalAnomalies.vue` | ⬜ | ⬜ |
| `ResolutionConflit.vue` | ⬜ | ⬜ |
| `DossierVivantActif.vue` | ⬜ | ⬜ |
| `BlocageIncompatibilite.vue` | ⬜ | ⬜ |
| `SourceIntelligence.vue` | ⬜ | ⬜ |
| `ContentPlan.vue` | ⬜ | ⬜ |
| `PanneauChat.vue` | ⬜ | ⬜ |
| `RechercheGlobale.vue` | ⬜ | ⬜ |
| `ConfigurationConnecteursQMS.vue` | ⬜ | ⬜ |
| `ConfigurationDrive.vue` | ⬜ | ⬜ |
| `ConfigurationIA.vue` | ⬜ | ⬜ |
| `Parametres.vue` | ⬜ | ⬜ |
| `ParametresCritiques.vue` | ⬜ | ⬜ |
| `Profil.vue` | ⬜ | ⬜ |
| `AdminUtilisateurs.vue` | ⬜ | ⬜ |
| `BibliothequeNormes.vue` | ✅ *(hors chantier — déjà traité début septembre : bug preview PDF, imports 0-octet, OAuth Drive)* | ⬜ *(non couvert par les chantiers précédents, reste à faire si jugé utile)* |

---

## 4. Dernières tâches réalisées (log, plus récent en haut)

- **12/09/2026** — Création de ce fichier de suivi, à la demande explicite
  de l'utilisateur, avant tout travail sur les écrans. Chantier OAuth Drive
  (refresh token) clos et vérifié juste avant (voir
  `docs/CONTEXTE-REPRISE-SESSION.md` et PR #38 + commit de correction
  `APP_URL`). Rien d'autre fait sur ce chantier « pages » à ce stade.

---

## 5. Reste à faire (prochaine action immédiate)

1. Créer le client de test QA (§2).
2. `Login.vue` — chantier fonctionnel : se connecter/déconnecter réellement,
   tester les cas d'erreur (mauvais mot de passe, champ vide, Worker
   d'authentification non configuré), vérifier la gestion de session.
3. `Login.vue` — chantier UI : refonte visuelle propre et moderne.
4. Mettre à jour ce fichier, puis passer à `AccueilQueVoulezVousFaire.vue`.

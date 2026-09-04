# PHASE 11 — Migration Client → Organization/Workspace/Site : revue panel avant implémentation

| | |
|---|---|
| **Statut** | Spec de phase (même discipline que Phases 5/7b/7c/8a/9/10). Rédigée **avant** tout code, panel collégial E1-E7 (`00-cadrage-projet.md` §6bis). Engagée sur demande explicite de l'utilisateur ("engage-la avec méthodologie et rigueur"), après confirmation qu'il comprenait le risque (TD-006 : faible réversibilité, touche la quasi-totalité des stores). |
| **Sources** | `01_ARCHITECTURE_MASTER_FINAL.md` §3 (scope organisationnel : `Organization → Workspace → Global/Corporate ou Site N → Facility → Area`, résolution par `Scope + Applicability + Effectivity + Inheritance/Override`, "Global et site ne sont pas des modèles différents") ; `02_DECISION_LEDGER_FROM_CONVERSATION.md` DEC-003 (Client = organisation/scope flexible, Global + N sites, inheritance/override), DEC-061 (précédence = scope le plus spécifique applicable + effectivity + override explicite) ; `TECHNICAL_DECISIONS.md` TD-006 (migration progressive, jamais en un seul commit, `Client` devient un cas particulier à un seul niveau d'`Organization`) ; `CONVERGENCE_PLAN.md` Phase 11 (Acceptance Criteria : scénario "Global + N sites" fonctionnel, aucune régression sur l'isolation par client déjà testée). |

**Décision structurante retenue d'emblée (E5, cf. §4)** : le risque explicitement identifié par TD-006 — `client_id` est la clé d'isolation utilisée par la quasi-totalité des ~25 tables/stores déjà construits cette session — est neutralisé en préservant **l'identité** : `Organization.id` reprend exactement l'`id` du `Client` existant. Aucune des ~25 tables existantes n'a donc besoin d'être touchée dans cet incrément — leur `client_id` référence désormais conceptuellement `Organization.id` (même valeur), sans aucune réécriture. C'est la seule façon de respecter "jamais un Big Bang" tout en construisant la hiérarchie réelle. Réécrire chaque table pour exploiter `Workspace` explicitement (ex. filtrer par site) reste un chantier ultérieur, phase par phase — non engagé ici, documenté comme tel en §5.

---

## 1. Constat déclencheur

`GAP.md`/`CURRENT_ARCHITECTURE.md` : `Client` est un objet plat (`id`, `name`) ; toute la isolation multi-tenant du système repose sur `client_id`. Le modèle cible décrit une hiérarchie organisationnelle réelle (un groupe pharma a un siège + N usines, avec des règles globales et des dérogations par site) qu'aucune table actuelle ne peut représenter.

## 2. Revue panel (E1-E7)

- **E1 (Fournisseur/IA-GAMP5/Part11)** : sans objet direct — pas d'IA dans ce module.
- **E2 (Qualité/SMQ)** : la résolution de configuration effective (quelle règle s'applique à quel site) doit toujours pouvoir être **tracée et justifiée** — la fonction de résolution retourne toujours l'origine de la règle trouvée (`global` ou le `workspace_id` précis où elle a été définie), jamais une valeur "magique" sans provenance.
- **E3 (QA Réglementaire, intégrité des données)** : la migration `Client → Organization` DOIT être un acte explicite et tracé (jamais automatique/silencieux au démarrage) — cohérent avec le principe déjà appliqué au garde-fou de rollback de schéma. Idempotente : migrer deux fois le même client ne doit rien dupliquer.
- **E4 (CSV)** : sans champ spécifique — ce module est transverse à tous les domaines déjà construits, pas propre aux systèmes informatisés.
- **E5 (Architecte logiciel)** : décision structurante ci-dessus (préservation d'id). `Workspace` est un arbre auto-référencé (`parent_workspace_id`) plutôt que 4 types rigides (`Global`/`Site`/`Facility`/`Area`) — cohérent avec le principe déjà retenu pour `AssetHierarchySchema` ("Global et site ne sont pas des modèles différents", aucune profondeur figée). Un seul type discriminant (`type: 'global' | 'site'`) suffit pour distinguer la racine des nœuds enfants ; `Facility`/`Area` sont simplement des `Workspace` plus profonds dans l'arbre, pas des entités distinctes fabriquées sans source détaillant leurs champs propres.
- **E6 (Métrologie)/E7 (Maintenance)** : sans objet direct.

## 3. Garde-fous non négociables retenus (testés explicitement)

1. `Organization.id` DOIT être strictement égal au `Client.id` d'origine — vérifié explicitement, condition de la non-régression sur l'isolation déjà testée partout ailleurs.
2. La migration (`migrerClient`) est idempotente — migrer deux fois le même client ne crée jamais de doublon d'`Organization`/`Workspace` racine.
3. Chaque `Organization` migrée reçoit automatiquement un `Workspace` racine de type `global` (jamais orpheline).
4. La résolution de règle effective (`resoudreRegleEffective`) DOIT toujours retourner l'origine exacte (workspace où la règle a été trouvée) — jamais une valeur sans provenance traçable.
5. Un `Workspace` enfant (site) sans règle propre hérite silencieusement de la règle du parent (jamais une erreur) ; un `Workspace` avec sa propre règle la voit toujours prévaloir sur celle héritée (override explicite).
6. Aucune des ~25 tables existantes n'est modifiée dans cet incrément — vérifié en ne touchant aucun de leurs types/stores, seule la suite de tests existante (419 tests) doit rester verte sans modification.

## 4. Décision de conception retenue

```text
Organization {
  id            // = ancien Client.id, préservé à l'identique
  nom
  created_at
}

Workspace {
  id, organization_id
  type: global | site
  nom
  parent_workspace_id: string | null   // null seulement pour le Workspace racine (global)
  created_at
}
```

Migration : `migrerClient(clientId)` — crée `Organization{id: clientId, nom: client.name}` + `Workspace{type: 'global', parent_workspace_id: null}` si non déjà migré (idempotent, vérifié par recherche préalable). `migrerTousLesClients()` : applique `migrerClient` à chaque `Client` existant.

Résolution de configuration effective : fonction pure `resoudreRegleEffective<T>(workspaceId, reglesParWorkspace: Map<string, T>, arbre: Map<string, Workspace>)` — remonte l'arbre depuis `workspaceId` (le site) vers la racine (`global`) et retourne la première règle trouvée avec son `workspace_id` d'origine, ou `null` si aucune (y compris à la racine).

## 5. Périmètre exclu (reporté, documenté plutôt que fabriqué)

- Réécriture des ~25 tables existantes pour interroger explicitement par `Workspace`/site (ex. "toutes les données du site X uniquement") — chantier ultérieur, phase par phase, jamais en un seul commit (cohérent avec TD-006). Elles continuent de fonctionner à l'identique via `client_id` = `Organization.id`.
- `Facility`/`Area` comme concepts nommés distinctement — couverts par la profondeur de l'arbre `Workspace`, pas fabriqués comme types séparés sans source détaillant leurs champs propres.
- Écran de gestion des Organizations/Workspaces — pas de consommateur réel construit dans cet incrément (même discipline "pas d'UI sans consommateur réel" appliquée à toutes les phases précédentes).
- Effectivity (date d'entrée en vigueur d'une règle) : le champ n'est pas ajouté à `Workspace` lui-même (qui n'est pas une règle) ; il appartient aux objets de règles concrets (`MethodProfileACFC` porte déjà une notion de version/date) — la résolution par date reste à câbler quand un premier objet de règle réel sera rattaché à un `Workspace`, non fabriqué ici sans cas d'usage concret.

## 6. Tests obligatoires

Chaque garde-fou du §3 ; scénario obligatoire explicite de `CONVERGENCE_PLAN.md` : une `Organization` avec un `Workspace` global et 2 `Workspace` site, une règle définie au global héritée par les deux sites, un site qui la surcharge explicitement — vérifié que l'origine résolue diffère bien entre les deux sites ; aucune régression sur la suite existante (419 tests inchangés, toujours verts sans modification).

---

*Ce document sert de spec de phase — l'implémentation qui suit s'y conforme sans redécider en cours de route ; toute déviation par rapport à ce document doit être justifiée dans le commit.*

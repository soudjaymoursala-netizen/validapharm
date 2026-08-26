# PHASE 9 — Deliverable Engine : ContentPlan (revue panel avant implémentation)

| | |
|---|---|
| **Statut** | Spec de phase (même discipline que Phases 5/7b/7c/8a). Rédigée **avant** tout code, panel collégial E1-E7 (`00-cadrage-projet.md` §6bis). |
| **Sources** | `GAP.md` ligne "Deliverable Engine" : *"Pipeline complet Request→Resolve Method/Template/Example→Context Snapshot→Content Plan→Generate→Validate→Review→Render→Approve→Freeze"*, avec la recommandation explicite **KEEP** pour `DefinitionGabarit`/`RenduGabarit.vue` (moteur de rendu déjà solide, ne pas réécrire) et **ADAPT/EXTEND** pour construire `ContentPlan`/`DeliverableVersion` par-dessus. `03-specifications-fonctionnelles.md` §4 (moteur de gabarits existant). |

**Limite déclarée d'emblée (comme en 7b/7c/8a)** : aucune source locale ne détaille les champs de `ContentPlan` au-delà de la liste des étapes du pipeline. Cette spec se limite volontairement à la **première moitié** du pipeline (`Request → Resolve → Context Snapshot → Content Plan`, jusqu'à sa validation/gel) — **`Generate → Validate → Review → Render → Approve → Freeze`** engagerait le moteur de rendu existant (`DefinitionGabarit`/`RenduGabarit.vue`, marqué KEEP par `GAP.md`) et le cycle de vie de `Section` déjà construit et testé (garde-fous de finalisation, FDS §3.3) — un chantier d'intégration distinct et plus risqué, reporté (même logique que la 8b différée). De même, la notion "Example" (résolution Method/**Template/Example**) n'est nommée nulle part avec un champ ou un mécanisme identifiable dans les sources locales — **exclue de cet incrément plutôt que fabriquée**.

---

## 1. Constat déclencheur

`GAP.md` : le moteur actuel (`DefinitionGabarit`/`RenduGabarit.vue`) ne fait que le **rendu** d'un gabarit déjà rempli — rien ne planifie, en amont, quelles données réelles (quel `MethodProfile`, quel contexte d'actif/procédé) doivent alimenter un livrable donné, ni ne conserve une trace auditable de ce choix au moment où il a été fait.

## 2. Revue panel (E1-E7)

- **E1 (Fournisseur/IA-GAMP5/Part11)** : aucune génération de contenu ni approbation automatique dans ce module — le `ContentPlan` ne fait que documenter *quelles entrées* alimenteraient un livrable, jamais produire le contenu réglementaire lui-même (qui reste porté par `Section`/le moteur de rendu existant, hors périmètre ici).
- **E2 (Qualité/SMQ)** : le `context_snapshot` DOIT être figé au moment de la création du plan et rester immutable ensuite — si le `MethodProfile` référencé évolue plus tard (nouvelle version), le plan garde la trace de ce qui a réellement été utilisé au moment de la planification, pas une référence "vivante" qui changerait rétroactivement le contenu d'un plan déjà créé.
- **E3 (QA Réglementaire, intégrité des données)** : cycle de vie à 3 états (`brouillon → valide → gele`), avec immutabilité totale après `gele` — même garde-fou ALCOA+ déjà appliqué aux `Execution` (Phase 7b). Le passage à `gele` exige d'être passé par `valide` au préalable (pas de saut direct).
- **E4 (CSV)** : `asset_node_id`/`process_id` optionnels, comme pour `QualityEvent` (Phase 5) et `ManufacturingContext` (Phase 4) — un livrable n'est pas toujours rattachable à un système précis.
- **E5 (Architecte logiciel)** : une seule entité `ContentPlan`, `method_profile_id`/`method_profile_type` en référence légère (pas de clé étrangère stricte unifiée, car il n'existe pas de type `Method` générique unique — `MethodProfileACFC` et `MethodProfileImpactAssessment` restent des tables distinctes, cohérent avec la décision déjà actée en Phase 3 de ne pas les fusionner sans justification). `template_id` référence le `TemplateType` déjà existant du moteur de gabarits (KEEP, `definitionGabarit.ts`).
- **E6 (Métrologie)/E7 (Maintenance)** : sans champ spécifique requis par les sources disponibles.

## 3. Garde-fous non négociables retenus (testés explicitement)

1. `context_snapshot` est capturé une seule fois à la création et reste immutable — vérifié explicitement (modifier le `MethodProfile` référencé après coup ne modifie jamais le snapshot déjà pris).
2. Le passage à `gele` exige d'être déjà `valide` — un `ContentPlan` `brouillon` ne peut pas être gelé directement.
3. Une fois `gele`, aucune modification n'est plus possible (immutabilité totale, même règle qu'en 7b).
4. Aucune génération de contenu ni validation/gel automatique par IA.

## 4. Décision de conception retenue

```text
ContentPlan {
  id, client_id
  template_id                                    // référence TemplateType existant (KEEP)
  asset_node_id, process_id: string | null
  method_profile_id: string | null
  method_profile_type: acfc | impact_assessment | null
  context_snapshot                               // JSON figé, immutable
  statut: brouillon | valide | gele
  audit_log, created_at, updated_at
}
```

## 5. Périmètre exclu (reporté, non fabriqué)

- Résolution "Example" (Method/Template/**Example**) — aucune source locale ne la détaille.
- `Generate → Validate → Review → Render → Approve → Freeze` — intégration avec le moteur de rendu existant (`DefinitionGabarit`/`RenduGabarit.vue`) et le cycle de vie de `Section` (garde-fous de finalisation déjà testés) — chantier distinct, plus risqué (`GAP.md` : "Tests existants du moteur de rendu à préserver"), non engagé ici.
- `DeliverableVersion` (versionnement du livrable final rendu) — dépend du point précédent, non engagé.

## 6. Tests obligatoires

Chaque garde-fou du §3, testé individuellement ; scénario nominal de création avec snapshot figé ; isolation stricte par client.

---

*Ce document sert de spec de phase — l'implémentation qui suit s'y conforme sans redécider en cours de route ; toute déviation par rapport à ce document doit être justifiée dans le commit.*

# Rapports d'audit consolidés — FDS v06 (connecteurs QMS + Structure Système)

| | |
|---|---|
| **Référence** | AUDIT-SWISSMEDIC-005 / AUDIT-FDA-005 / AUDIT-CABINET-GXP-002 / AUDIT-QA-SPECIALISES-002 |
| **Version** | 01 (close) |
| **Statut** | Close — 4 constats intégrés en FDS v07 à v10 |

---

## Audit Swissmedic — MAJ-01 : modification du schéma de hiérarchie sans traitement des nœuds existants

**Constat** : §3.9 (config. hiérarchie, ajoutée v06) ne précise pas ce qui arrive aux nœuds déjà créés si un niveau est supprimé/renommé après coup — risque d'incohérence (nœuds orphelins de niveau).

**Suite** : FDS v07 — la suppression d'un niveau utilisé par au moins un nœud existant est bloquée (message explicite, renvoi vers reclassement préalable) ; le renommage d'un niveau ne casse aucune référence (les nœuds référencent la `key` technique, pas le libellé affiché).

## Audit FDA — MAJ-01 : acquittement de l'avertissement de statut dégradé (U-10) non journalisé

**Constat** : U-10 exige un clic actif ("J'ai compris"), mais rien n'indique que cet acquittement est journalisé — un avertissement de risque qualité acquitté sans trace n'a pas la même valeur probante qu'un acquittement tracé (cohérent avec le traitement déjà appliqué à U-07, CAPA moteur).

**Suite** : FDS v08 — l'acquittement de U-10 crée une entrée `project.audit_log` (qui, quand, quel nœud, quel statut au moment de l'acquittement).

## Audit cabinet de conseil GxP — MAJ-01 : configuration de hiérarchie non couverte par le principe de séparation logique/présentation

**Constat** : le nouvel écran de configuration (§3.9) doit respecter le principe directeur déjà posé (§8bis) — validation de la structure du schéma (ex. pas de niveau dupliqué) comme logique testable indépendante de l'écran, pas seulement une validation de formulaire.

**Suite** : FDS v09 — rappel explicite que la validation du schéma de hiérarchie (unicité des `key` de niveau, cohérence) est un module de logique métier isolé, au même titre que les autres (§8bis s'applique explicitement à ce nouveau module).

## Audit QA spécialisés — MAJ-01 : absence de modèle de hiérarchie par défaut pour un nouveau client

**Constat** : la configuration de hiérarchie part d'un écran vide — un nouveau client sans référence doit inventer sa structure de zéro, alors qu'une convention courante existe (Site > Zone > Système > Équipement).

**Suite** : FDS v10 — un modèle de hiérarchie par défaut est proposé (pré-rempli, entièrement modifiable/supprimable) à la première configuration, réduisant la friction de démarrage sans imposer de structure.

## Statut

Clôturé le 22/08/2026. FDS complète et auditée (v10), même niveau de rigueur que pour la première cascade.

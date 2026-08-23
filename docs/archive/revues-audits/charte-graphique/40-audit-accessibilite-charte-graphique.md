# Audit ciblé — Accessibilité et facteurs humains de la charte graphique

| | |
|---|---|
| **Référence** | AUDIT-ACCESSIBILITE-VALIDAPHARM-2026-001 |
| **Portée** | Palette sémantique de `qualification_status` (FDS §2bis) — vérification effective des ratios de contraste WCAG 2.1 AA, pas une simple déclaration de conformité |
| **Référentiel** | WCAG 2.1 niveau AA (ratio ≥ 4.5:1 texte normal, ≥ 3:1 texte large/icônes) |
| **Statut** | Clos — constats intégrés |

## Méthode

Calcul du ratio de contraste (luminance relative sRGB) de chaque couleur de statut proposée par la revue multi-experts contre un fond blanc `#FFFFFF`, seul fond utilisé pour le texte de statut en mode clair (FDS §2bis).

## Constats — 3 couleurs sur 8 ne respectaient pas le seuil AA (4.5:1) pour texte normal

| Statut | Couleur initiale | Ratio calculé | Conforme AA (≥4.5) ? | Couleur corrigée | Ratio corrigé |
|---|---|---|---|---|---|
| Qualifié | `#16A34A` | 3.30:1 | **Non** | `#15803D` | 5.02:1 |
| Qualifié avec écart(s) ouvert(s) | `#D97706` | 3.18:1 | **Non** | `#B45309` | 5.03:1 |
| Requalification requise | `#EA580C` | 3.56:1 | **Non** | `#C2410C` | 5.18:1 |
| Non qualifié | `#6B7280` | 4.83:1 | Oui (marge faible) | Inchangé | — |
| En cours de qualification initiale | `#2563EB` | 5.17:1 | Oui | Inchangé | — |
| Requalification en retard | `#DC2626` | 4.83:1 | Oui (marge faible) | Inchangé | — |
| Suspendu — sous contrôle de changement | `#7C3AED` | 5.70:1 | Oui | Inchangé | — |
| Déclassé — retiré | `#374151` | 10.29:1 | Oui | Inchangé | — |

**Constat principal** : trois couleurs de statut sur huit — dont "Qualifié", le statut le plus consulté en usage courant — auraient été non conformes AA si la palette proposée par la revue multi-experts avait été intégrée sans vérification calculée. La revue avait validé la palette sur une impression visuelle, pas sur un calcul de ratio — écart de méthode corrigé ici.

**Action** : les trois couleurs sont remplacées par des teintes plus soutenues dans le même registre (vert/ambre/orange), toutes ≥ 5:1, avant intégration en FDS §2bis. Aucun changement de logique de mapping (icône + libellé restent associés, répond toujours à URS-NF-054ter) — seule la teinte exacte change.

**Recommandation permanente (intégrée en SDS §7bis)** : le test de contraste automatisé fait désormais partie du portail de qualité — toute future modification de palette est vérifiée par calcul, jamais par appréciation visuelle seule. C'est le mécanisme qui aurait empêché cet écart d'atteindre la conception si la palette avait été modifiée après coup sans repasser par une revue.

## Point non retenu

Vérification demandée sur le mode sombre (couleurs `#0B0E14`/`#EDEFF7` etc.) : **non exécutée** dans cet audit, le mode sombre étant classé Should/non prioritaire Phase 1 (voir revue multi-experts §"E7"). À vérifier avant toute implémentation effective du mode sombre, pas avant.

# Rapport d'audit — Swissmedic (simulation) — FS v07 (connecteurs QMS + Structure Système)

| | |
|---|---|
| **Référence** | AUDIT-SWISSMEDIC-VALIDAPHARM-2026-004 |
| **Version** | 01 (close) |
| **Statut** | Close — constat intégré en FS v08 |

---

## Constat

### MAJ-01 — Machine à états du `qualification_status` non spécifiée

**Constat** : §4.10 définit `qualification_status` comme une liste fermée de 8 valeurs, mais ne définit **aucune règle de transition** entre elles — contrairement au statut de section (`section.status`), qui a une machine à états complète (§3.2 FDS). Rien n'empêche aujourd'hui de passer directement de "Non qualifié" à "Qualifié" sans étape intermédiaire, ni de faire revenir un nœud "Déclassé — retiré" à "Qualifié" sans nouveau projet de qualification.

**Analyse** : "Déclassé" devrait être un état **terminal** (un équipement retiré ne redevient pas qualifié sans un nouveau cycle complet, tracé par un nouveau projet) ; les autres transitions devraient au minimum passer par de la logique cohérente avec le cycle de vie (ex. on ne passe pas de "Non qualifié" à "Qualifié" sans "En cours de qualification initiale").

**Sévérité** : Majeur.

## Verdict

**Approuvable sous réserve** — un constat contenu, cohérent avec la rigueur déjà appliquée ailleurs dans le document (machine à états de section).

## Suite donnée

FS v08 : machine à états minimale pour `qualification_status` — "Déclassé" terminal (retour impossible sans nouveau projet créant un nouveau nœud ou réinitialisation explicite journalisée), autres transitions libres mais journalisées (déjà couvert par URS-F-102quinquies) — pas de sur-ingénierie, juste la garde du cas terminal identifié.

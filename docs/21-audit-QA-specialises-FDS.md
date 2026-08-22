# Rapport d'audit — QA spécialisés externes (simulation) — dossier ValidaPharm

| | |
|---|---|
| **Référence** | AUDIT-QA-SPECIALISES-VALIDAPHARM-2026-001 |
| **Version** | 01 (close) |
| **Type d'audit** | Simulation de revue par des profils Assurance Qualité pharma externes, en posture d'audit a posteriori (distincts des sièges E2/E3 du panel collégial, qui interviennent en amont) |
| **Documents audités** | URS v11, AR v12, FS v05, FDS v03, ensemble du dossier |
| **Statut** | Close — constat intégré en URS v12 / AR v13 / FDS v04 |

---

## Constat

### MAJ-01 — Aucun mécanisme de gestion d'anomalie/incident pour l'outil en exploitation, au-delà du cas spécifique du moteur de calcul

**Constat** : URS-NF-046bis/046ter (issues de l'audit Swissmedic puis de la revue FDS) couvrent un cas précis et important — un défaut corrigé du **moteur de calcul déterministe** déclenche une revue d'impact rétrospective avec accusé de réception obligatoire. Mais aucun mécanisme équivalent, même allégé, n'existe pour **tout autre type d'anomalie constatée en exploitation** de l'outil (ex. un bug d'affichage, une synchronisation Git ratée de façon répétée, un comportement erratique du chat expert non lié au moteur de calcul). Un QA pharma, en usage réel, doit savoir : où signaler un problème, comment son statut est suivi, et comment retrouver l'historique des anomalies constatées sur l'outil.

**Analyse** : c'est distinct de MAJ-03 (Swissmedic) qui portait spécifiquement sur la traçabilité *rétroactive* d'un défaut de calcul vers les sections affectées. Ici, le constat porte sur l'**absence de journal d'anomalies généraliste**, même minimal, pour un outil mono-utilisateur Phase 1 où l'utilisateur est aussi seul responsable de constater et suivre ses propres anomalies. Sans un minimum de structure, ce suivi reposera sur la mémoire de l'utilisateur — fragile, et rien à montrer en cas de question d'un tiers ("avez-vous déjà rencontré ce problème ?").

**Sévérité** : Majeur — écart réel, mais proportionné : la solution attendue en Phase 1 est légère (un journal simple, pas un processus CAPA complet différé en Phase 3), cohérent avec URS-NF-043 (priorité à la fiabilité du contenu, pas à la bureaucratie du workflow).

## Points examinés, non retenus

- **Programme de formation formalisé pour l'utilisateur de l'outil.** En Phase 1 mono-utilisateur, où le même professionnel conçoit, développe, teste et utilise l'outil (limite déjà reconnue et documentée au VMP §5), un programme de formation structuré serait disproportionné. Suffisant : que l'utilisateur ait lu la documentation (URS/FS/FDS) avant usage réel — déjà de facto le cas ici. **Non retenu**, à réexaminer explicitement lors du passage Phase 3 (multi-utilisateur).
- **Revue périodique formelle de l'outil.** Déjà couverte et explicitement différée en Phase 3 par le VMP §8 ("fréquence à définir en Phase 3"). Pas un point nouveau.

## Verdict

**Approuvable sous réserve** — un constat, de portée proportionnée à la Phase 1.

## Suite donnée

Intégré en URS v12 (nouvelle exigence URS-NF-053), AR v13 (R-44), FDS v04 (écran de journal d'anomalies, léger).

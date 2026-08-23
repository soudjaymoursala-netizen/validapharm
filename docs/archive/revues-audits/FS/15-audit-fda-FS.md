# Rapport d'audit — FDA (simulation) — FS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | AUDIT-FDA-VALIDAPHARM-2026-001 |
| **Version** | 01 (close) |
| **Type d'audit** | Simulation d'inspection FDA — référentiel : 21 CFR Part 11, 21 CFR Part 820 (Quality System Regulation, si applicable), FDA Data Integrity and Compliance With CGMP Guidance (2018), FDA Computer Software Assurance for Production and Quality System Software (CSA, guidance finale) |
| **Document audité** | `03-specifications-fonctionnelles.md` v04 |
| **Documents consultés** | URS v09, AR v09, `13-revue-multi-experts-FS.md`, `14-audit-swissmedic-FS.md` |
| **Auditeur** | Claude, en posture d'inspecteur FDA (simulation demandée par l'utilisateur) |
| **Statut** | Close — constats intégrés en URS v10 / AR v10 / FS v05 |

---

## Préambule méthodologique

Cet audit applique un référentiel et une philosophie distincts de l'audit Swissmedic précédent (`14-audit-swissmedic-FS.md`). Deux différences structurantes avec l'approche EU/PIC/S déjà appliquée :

1. **Analyse des "predicate rules"** : la pratique FDA exige de déterminer explicitement, pour chaque catégorie d'enregistrement produite par un système, quelle(s) règle(s) de fond ("predicate rules" — ex. 21 CFR 211 pour les BPF médicament, 21 CFR 820 pour les dispositifs médicaux) s'appliquent, avant de statuer sur l'applicabilité de 21 CFR Part 11. Ce raisonnement n'a jamais été fait explicitement dans les documents du projet.
2. **Computer Software Assurance (CSA)** : contrairement à l'approche CSV classique (documentaire, scriptée, uniforme), la doctrine FDA CSA récente demande d'ajuster la rigueur du test à l'impact réel sur le patient/produit — tests non scriptés/exploratoires acceptables pour les fonctions à faible risque, effort scripté réservé aux fonctions à impact direct. Cette philosophie n'est pas incompatible avec GAMP 5 (le VMP l'évoque déjà en principe, §3), mais elle n'est pas opérationnalisée dans la FS au niveau où elle devrait l'être : quelles fonctions précises sont candidates à un test non scripté.

## Constats

### MAJ-FDA-01 — Absence d'analyse des "predicate rules" applicables aux enregistrements produits par l'outil

**Constat** : ValidaPharm produit des livrables qui peuvent, selon l'usage final de l'utilisateur, alimenter directement un dossier réglementaire opposable — notamment pour les dispositifs médicaux, où un livrable produit par l'outil (ex. protocole IQ/OQ/PQ, analyse de risque) pourrait être versé au **Design History File (DHF)** ou au **Device Master Record (DMR)** d'un fabricant soumis à 21 CFR 820. L'URS §6 clarifie que l'EN/IEC 62304 ne s'applique pas à l'outil lui-même (l'outil n'est pas un dispositif médical) — mais ceci ne répond pas à la question distincte : **les enregistrements que l'outil produit peuvent-ils devenir des enregistrements réglementés au sens de 820.180/820.181 une fois repris dans le système qualité du client** ? Aucun document du projet ne tranche formellement ce point, ni ne documente l'analyse "quelle predicate rule s'applique à quelle catégorie de livrable" (211 pour médicament vs 820 pour dispositif vs aucune si l'outil reste un pur brouillon d'aide jamais versé au dossier officiel).

**Analyse** : sans cette analyse, l'affirmation répétée de l'URS/FS ("brouillon d'aide" ≠ enregistrement officiel tant qu'il n'a pas été "formellement repris dans le système qualité réel de l'organisation", URS §8) reste une déclaration d'intention, pas une analyse réglementaire documentée. Un auditeur FDA demandera systématiquement cette traçabilité de raisonnement — pas seulement la conclusion.

**Sévérité** : Majeur.

### MAJ-FDA-02 — Politique de rétention non déterminée alors qu'un minimum légal existe pour les dispositifs médicaux

**Constat** : l'audit Swissmedic (MIN implicite, §5.4 FS) avait déjà noté l'absence de politique de rétention formelle, mais l'avait acceptée comme différée en Phase 3. Un auditeur FDA objecterait : pour les enregistrements DMR/DHF (21 CFR 820.180), la durée de conservation minimale est **la durée de vie prévue du dispositif, et en aucun cas moins de 2 ans après la mise sur le marché** — une règle légale fixe, pas une politique interne à définir "plus tard". Si un livrable produit par ValidaPharm est effectivement repris dans un DMR/DHF client (cas non exclu, voir MAJ-FDA-01), la rétention "indéfinie alignée sur la durée de vie du dépôt Git" actuellement décrite en FS §5.4 est **suffisante par accident**, mais l'outil ne le garantit pas explicitement (aucune protection contre une suppression du dépôt Git par l'utilisateur, aucun rappel de cette contrainte légale à l'utilisateur).

**Analyse** : ce constat est directement lié à MAJ-FDA-01 — sans trancher la question des predicate rules, on ne peut pas dimensionner correctement la politique de rétention. Les deux doivent être résolus ensemble.

**Sévérité** : Majeur.

### MIN-FDA-01 — Approche de test non différenciée par risque au niveau FS (philosophie CSA)

**Constat** : le VMP (§3, encore v01 à ce stade) énonce le principe d'un effort de vérification proportionné au risque, mais la FS elle-même ne désigne, pour aucune fonction, un mode de test explicitement **non scripté/exploratoire** par opposition à **scripté**. Une doctrine CSA appliquée correctement conduirait à désigner explicitement, par exemple, la bibliothèque de normes (§4.5, risque résiduel faible) ou la mise en forme d'export PDF comme candidates à un test exploratoire non documenté au même niveau que le moteur de calcul IPR (§4.1, scripté et exhaustif).

**Analyse** : ce n'est pas un défaut de fond (le VMP à réécrire est le bon endroit pour trancher précisément ce mapping), mais la FS aurait dû au moins signaler, pour les fonctions à risque résiduel faible qu'elle décrit, qu'elles sont candidates à un allègement CSA — pour que le VMP réécrit n'ait pas à redécouvrir ce classement depuis zéro.

**Sévérité** : Mineur — corrigible par une simple annotation, sans nouvelle exigence URS (relève de la stratégie de vérification, déjà explicitement renvoyée au VMP lors de la revue précédente pour éviter la duplication — point non retenu E4).

## Points examinés, non retenus comme constats

- **21 CFR Part 11 §11.10(e) (audit trail sécurisé)** : déjà couvert de façon proportionnée — la FS reconnaît explicitement (§5.4) que la piste d'audit Phase 1 n'est "pas un audit trail Part 11 complet", ce qui est la réponse correcte tant que l'outil ne produit pas de signature électronique opposable (URS-F-011bis). Pas un constat nouveau.
- **Cybersécurité des dispositifs (FD&C Act §524B)** : hors périmètre — ValidaPharm n'est pas un dispositif médical (clarifié URS §6), cette obligation ne s'applique pas à l'outil lui-même.

## Verdict

**Non approuvable en l'état** (2 constats Majeurs, tous deux liés à une même question de fond non tranchée : le statut réglementaire des enregistrements produits par l'outil une fois repris par le client). Contrairement aux constats Swissmedic (défauts de mécanisme technique), ces deux constats sont d'abord des **défauts d'analyse documentée** — l'URS doit trancher explicitement la question des predicate rules avant que la FS ne puisse en tirer une conception défendable.

## Suites données

Intégrées en URS v10 (nouvelle clarification §6 sur l'analyse predicate rules, nouvelle exigence sur le rappel de rétention légale), AR v10 (R-41, R-42) et FS v05.

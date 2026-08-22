# Revue multi-experts de l'URS de l'outil ValidaPharm

| | |
|---|---|
| **Référence** | REV-URS-VALIDAPHARM-2026-001 |
| **Version** | 01 |
| **Document revu** | URS-VALIDAPHARM-2026-001 v01 |
| **Panel d'experts** | 4 rôles (voir §1) |
| **Sources utilisées** | Dossier Drive « 00 - Normes et guideline GMP » (PIC/S, EudraLex, ASTM, ISPE, CSV/CQV) + référentiels publics (GAMP 5, ICH Q9, 21 CFR Part 11) pour les points non couverts par le dossier |

---

## 1. Panel d'experts (personas de revue)

| Rôle | Angle de revue |
|---|---|
| **E1 — Fournisseur / Architecte logiciel IA, GAMP 5 & 21 CFR Part 11 "friendly"** | Faisabilité technique, conception défendable devant un audit, garde-fous IA |
| **E2 — Expert Qualité / Système de Management de la Qualité pharma** | Cohérence documentaire, terminologie qualité, gouvernance |
| **E3 — QA Réglementaire (logiciels pharma)** | Conformité réglementaire réelle vs perçue, risque de sur-promesse ("compliance-washing") |
| **E4 — Expert CSV (validation de systèmes informatisés en environnement GMP)** | Testabilité, preuve de maîtrise, piste d'audit techniquement opposable |

Méthode : pour chaque point à enjeu, chaque expert prend position ; en cas de désaccord, argumentation contradictoire ; décision retenue = consensus documenté avec référence normative, ou **point ouvert soumis à l'utilisateur** quand la décision relève d'un arbitrage de gouvernance (pas d'un fait technique/normatif tranchable par les experts).

## 2. Catégorisation GAMP 5 (URS en-tête, VMP §2)

- **E1** : Catégorie 5 justifiée — le moteur de gabarits et le routeur IA sont du code métier sur mesure, pas du paramétrage d'un produit du marché.
- **E4** : D'accord, avec nuance : le connecteur vers l'API cloud tierce reste catégorie 3/4 (composant non modifié) — déjà bien posé dans le VMP §2. Confirme la catégorisation actuelle.
- **E2 / E3** : Pas d'objection.

**Décision : catégorisation confirmée sans modification.**

## 3. §4.1-4.3 URS — Rédaction guidée, statuts, export

- **E4** : URS-F-004 (calcul déterministe) doit être complété par une exigence de **maîtrise de version du moteur de calcul** (identifiant de version/hash associé à chaque livrable), sinon impossible de prouver *a posteriori* quelle version du moteur a produit un IPR donné en cas d'audit ou de correction de bug (répond à AR R-11).
- **E1** : Techniquement trivial à ajouter (horodatage + numéro de version du moteur dans les métadonnées du livrable, déjà prévu par le champ `updated_at` du modèle pivot FS §3 — à compléter par un champ `engine_version`).
- **E2 / E3** : D'accord, utile pour la traçabilité qualité.

**Décision : AMENDEMENT — ajouter URS-F-004bis : "Le système DOIT enregistrer, dans les métadonnées de chaque livrable, l'identifiant de version du moteur de calcul utilisé." Priorité Must.**

- **E3** — point important sur URS-F-011/012 (statuts "brouillon d'aide" / "approuvé dans l'outil") : le terme et le mécanisme actuels (renseigner des noms dans des champs texte rédacteur/vérificateur/approbateur) **ne constituent pas une signature électronique au sens du 21 CFR Part 11 / Annexe 11** (pas d'authentification de l'identité, pas de liaison cryptographique au contenu signé, pas de non-répudiation). Utiliser un vocabulaire qui pourrait laisser croire le contraire à un futur auditeur ou à l'utilisateur lui-même est un risque de "compliance-washing" — même non intentionnel.
- **E4** : Confirme, du point de vue CSV : c'est exactement la limite déjà notée dans le Plan de validation §5 pour les rôles rédacteur/vérificateur/approbateur (personne unique en Phase 1) — mais elle doit aussi être **nommée explicitement dans l'URS elle-même**, pas seulement dans le VMP, pour que l'exigence soit correctement bornée dès la conception.
- **E2** : Propose de renommer le statut "approuvé dans l'outil" en **"validé en interne (hors signature électronique réglementaire)"** dans l'interface et la documentation, tant que Part 11/Annexe 11 n'est pas implémenté (Phase 3).
- **E1** : Faisable sans changer le modèle de données (FS §3, champ `status`), seulement le libellé affiché et la documentation.

**Décision : AMENDEMENT — ajouter URS-F-011bis : "Le système DOIT afficher explicitement que le statut 'approuvé dans l'outil' ne constitue pas une signature électronique réglementaire (21 CFR Part 11 / Annexe 11) tant que l'authentification et la non-répudiation ne sont pas implémentées (Phase 3)." Priorité Must. Reformulation retenue pour l'interface : "validé en interne — pas une signature électronique opposable".**

## 4. §4.4 URS — Chat expert (risques R-06, R-07 de l'AR)

- **E3** : URS-F-036 (avertissement "aide, pas avis opposable") est nécessaire mais insuffisant seul — recommande d'ajouter une **journalisation de chaque interaction avec le chat expert** (horodatage, mode utilisé cloud/local, document joint ou non) pour permettre une revue a posteriori en cas de doute sur une décision prise suite à une réponse du chat.
- **E4** : Entièrement d'accord — c'est un point de preuve CSV classique : sans journal, impossible de vérifier en OQ/PQ que la règle "le chat n'a jamais accès au contenu par défaut" (URS-F-031) a réellement été respectée en usage.
- **E1** : Faisable — le routeur IA (FS §6) peut écrire une entrée dans `audit_log` à chaque appel, sans jamais y stocker le contenu échangé (pour ne pas dupliquer le risque de fuite qu'on cherche à maîtriser).
- **E2** : Confirme l'intérêt qualité (traçabilité de l'usage), pas d'objection.

**Décision : AMENDEMENT — ajouter URS-F-037 : "Le système DOIT journaliser chaque interaction avec le chat expert (horodatage, moteur utilisé, indication qu'un document a été joint ou non), sans jamais journaliser le contenu échangé." Priorité Must. Complète FS §6 et OQ-22/23.**

## 5. §5.2 URS — Portabilité et continuité (risque R-03, R-09, R-10 de l'AR)

- **E4** — point important : URS-NF-030/031 s'appuient sur **l'historique Git comme piste d'audit**. Or un commit Git standard n'est **pas** une preuve d'intégrité opposable : le champ auteur est déclaratif (`git commit --author` peut être falsifié) et l'historique est réécrivable par quiconque a les droits d'écriture, malgré la "règle d'usage" actuellement notée dans l'AR (R-10) comme seule mesure de maîtrise.
- **E3** : Confirme le risque de sur-promesse — présenter l'historique Git comme une "piste d'audit" sans plus de précision serait trompeur devant un inspecteur qui connaît Git.
- **E1** : Deux mesures techniques réellement opposables, faciles à mettre en place dès la Phase 1 : (1) commits signés (GPG/SSH signing) pour lier chaque commit à une identité vérifiable, (2) protection de la branche principale (interdiction de force-push/réécriture d'historique), ce qui est une **configuration**, pas juste une "règle d'usage" non technique.
- **E4** : D'accord, ces deux mesures suffisent à faire de l'historique Git une piste d'audit *raisonnablement* opposable pour un usage Phase 1 (mono-utilisateur, enjeu proportionné) — pas encore équivalente à un audit trail Part 11 complet (horodatage serveur de confiance, non-répudiation forte), ce qui reste explicitement une limite Phase 1 à documenter.
- **E2** : D'accord avec la reformulation, demande que la limite résiduelle soit clairement écrite plutôt qu'implicite.

**Décision : AMENDEMENT —**
- **URS-NF-030 reformulé** : "Chaque modification de donnée DOIT être attribuable (qui) et horodatée (quand), via les métadonnées internes et l'historique Git **signé et protégé contre la réécriture** (branche principale protégée, commits signés). Cette mesure constitue une piste d'audit raisonnable en Phase 1 mono-utilisateur, mais ne constitue pas un audit trail Part 11 complet (voir limite Phase 3)."
- **AR — R-10 mise à jour** : mesure de maîtrise renforcée de "règle d'usage" (déclaratif, faible) à "commits signés + branche protégée (configuration technique)" → Détectabilité rétrogradée de 3 à 2, IPR révisé de 24 à 16.
- Nouveau risque **R-14** ajouté à l'AR : "Sur-présentation du niveau de conformité de l'outil (ex. historique Git perçu comme équivalent Part 11) — Cause : vocabulaire ambigu — Effet : décision d'usage inadaptée par l'utilisateur ou un tiers — S=4, O=2, D=2, IPR=16 — Mesure : vocabulaire encadré (§3 et §5 de cette revue), limites Phase 1 documentées explicitement dans chaque document produit."

## 6. §5.3 URS — Sécurité et confidentialité

- **E3** : URS-NF-021 ("dépôt Git privé, accès restreint") dépend en réalité de la sécurité du compte GitHub de l'utilisateur (mot de passe, 2FA) — qui est **hors du périmètre de conception de l'outil**. Ce doit être écrit comme une **dépendance/hypothèse**, pas comme une exigence que l'outil "remplit" par lui-même.
- **E1 / E4** : D'accord, c'est cohérent avec C-01/C-02/C-03 déjà présents en §7 Contraintes de l'URS — juste à compléter.

**Décision : AMENDEMENT — ajouter en §7 Contraintes : "C-04 : La confidentialité du dépôt Git dédié dépend de la sécurité du compte GitHub de l'utilisateur (authentification forte/2FA recommandée) — hors périmètre de conception de l'outil, à la charge de l'utilisateur."**

## 7. §6 URS — Exigences réglementaires (portée normative)

- **E3** — point de cadrage important : EN/IEC 62304 (cycle de vie du logiciel de dispositif médical), présent dans le dossier de normes de l'utilisateur, **ne s'applique pas à ValidaPharm**. La norme 62304 encadre le logiciel qui fait partie d'un dispositif médical ou en est un accessoire réglementé — pas un outil interne d'aide à la rédaction de documents qualité. L'appliquer par erreur créerait une fausse exigence et une confusion de périmètre.
- **E4** : Confirme — le cadre pertinent pour ValidaPharm reste GAMP 5 (système GxP support, pas dispositif médical lui-même).
- **E1 / E2** : D'accord, mais utile de le documenter explicitement pour éviter toute confusion future (ex. si un futur contributeur propose "il faut être 62304" par réflexe).

**Décision : AMENDEMENT — ajouter URS §6 une clarification explicite : "Hors périmètre normatif : EN/IEC 62304 ne s'applique pas à ValidaPharm (outil interne, non intégré à un dispositif médical) — le cadre applicable est GAMP 5."**

## 8. §8 URS — Hors périmètre (statut des livrables "brouillon d'aide")

- **E2 / E3** : Un livrable "brouillon d'aide" produit par l'outil ne doit en aucun cas pouvoir être confondu avec un enregistrement GxP officiel tant qu'il n'a pas été formellement intégré au QMS réel du site (hors outil, en Phase 1). Ce point mérite d'être explicite dans le hors-périmètre, pas seulement déductible.

**Décision : AMENDEMENT — ajouter en §8 Hors périmètre : "Un livrable au statut 'brouillon d'aide' n'est pas, et ne doit jamais être présenté comme, un enregistrement GxP officiel du site tant qu'il n'a pas été formellement repris dans le système qualité réel de l'organisation (hors outil, en Phase 1)."**

## 9. Synthèse des amendements retenus par consensus

| # | URS/AR concerné | Nature |
|---|---|---|
| 1 | URS-F-004bis (nouveau) | Version du moteur de calcul dans les métadonnées |
| 2 | URS-F-011bis (nouveau) + reformulation UX | Clarification "validé en interne" ≠ signature Part 11 |
| 3 | URS-F-037 (nouveau) | Journalisation des interactions du chat expert (sans contenu) |
| 4 | URS-NF-030 (reformulé) | Git signé + branche protégée, limite Phase 1 explicite |
| 5 | AR R-10 (révisé) + AR R-14 (nouveau) | IPR R-10 réduit à 16 ; nouveau risque de sur-promesse |
| 6 | URS §7 Contraintes (C-04 ajouté) | Dépendance sécurité compte GitHub hors périmètre outil |
| 7 | URS §6 (clarification ajoutée) | EN/IEC 62304 hors périmètre, GAMP 5 confirmé |
| 8 | URS §8 (clarification ajoutée) | Brouillon d'aide ≠ enregistrement GxP officiel |

Tous ces amendements font consensus entre les 4 experts et ont été **intégrés directement dans URS v02** (voir document mis à jour) et dans l'AR (section révisée).

## 10. Points ouverts nécessitant un arbitrage de l'utilisateur (non tranchables par les experts seuls)

Ces points ne sont pas des désaccords normatifs, mais des choix de gouvernance/produit. **Tranchés par l'utilisateur le 21/08/2026 :**

1. **Commits signés + branche protégée** — décision : **dès la Phase 1**, sous condition que le coût total ne dépasse pas 20 € (E1 confirme : signature GPG/SSH est gratuite — clé générée localement, ou signature SSH native GitHub sans coût — condition remplie). AR R-10 confirmé à IPR=16.
2. **Libellé du statut renommé** — décision : **conservé tel que proposé** — "validé en interne — pas une signature électronique opposable".
3. **Fréquence de journalisation du chat expert** — décision : **par session** (et non par message). URS-F-037 mis à jour en conséquence dans URS v02.

## 11. Clôture de la revue

Les 8 amendements de synthèse (§9) et les 3 arbitrages (§10) sont intégrés dans URS-VALIDAPHARM-2026-001 v02 et AR-VALIDAPHARM-2026-001 v02. **La revue multi-experts est close.** L'URS est prête pour signatures formelles (rédigé/vérifié/approuvé) puis passage à la conception détaillée (FS) et au développement de la Phase 1.

---
*Revue version 01 — clôturée le 21/08/2026. Tous les points (8 amendements + 3 arbitrages) ont été traités.*

# Revue multi-experts de la FS — REV-FS-VALIDAPHARM-2026-001

| | |
|---|---|
| **Référence** | REV-FS-VALIDAPHARM-2026-001 |
| **Version** | 01 (close) |
| **Objet** | Revue contradictoire de `03-specifications-fonctionnelles.md` v02 par le panel d'experts élargi (E1-E7) |
| **Documents en entrée** | FS v02, URS v07, AR v07 |
| **Statut** | Close — amendements intégrés en FS v03 / URS v08 / AR v08 |

---

## Panel convoqué

E1 Fournisseur/IA-GAMP5-Part11, E2 Qualité/SMQ, E3 QA Réglementaire, E4 CSV, E5 Architecte logiciel/Lead développeur senior, E6 Métrologie, E7 Maintenance. Consigne donnée au panel : exigence maximale sur la forme (cohérence interne, rigueur de traçabilité, absence d'ambiguïté) et sur le fond (couverture réelle des risques, absence de trou fonctionnel).

## Points soulevés et débat

### 1. E5 — Confusion "multi-client" / "multi-utilisateur" (forme + fond)

**Constat** : §3 et §5.3 de la FS mêlent deux notions distinctes sans les nommer séparément. `client_config` (fournisseur IA, gabarit d'export par client) est une fonctionnalité **multi-client**, nécessaire dès la Phase 1 puisqu'un même professionnel travaille pour plusieurs clients. `owner_id`/`shared_with` relèvent du **multi-utilisateur** (plusieurs comptes humains), explicitement hors périmètre Phase 1 (URS §8). Cette FS emploie "multi-utilisateur" dans les deux sens à plusieurs endroits, ce qui créera une ambiguïté en conception détaillée (DS) — un développeur pourrait croire à tort que `client_config` dépend de l'infrastructure multi-utilisateur différée.

**Débat** : E2 confirme le risque de confusion dans un futur audit ("le client de mon client" vs "l'organisation cliente" ne sont pas la même chose). E3 note que l'URS elle-même (NF-022, F-024) n'établit pas explicitement cette distinction — c'est un défaut de rigueur de la FS à corriger sans nécessiter d'amendement URS (clarification, pas nouvelle exigence).

**Décision** : retenu. Clarification ajoutée en FS §3 et §5.3, aucun impact URS/AR.

### 2. E5 — Gap réel : conflit de fusion Git entre deux postes (fond)

**Constat** : URS-NF-045/AR-R-23 couvrent le conflit "deux onglets du même poste" (verrouillage optimiste en mémoire applicative). Aucune exigence ne couvre le cas où le même livrable est modifié **hors-ligne sur deux postes différents** avant synchronisation — cas réaliste vu le modèle "poste principal + poste secondaire" de l'URS (URS-NF-010, PQ-02). Le mécanisme de verrouillage optimiste ne fonctionne pas dans ce cas (les deux postes n'ont pas de connexion partagée). Git signalera un conflit de fusion brut sur le fichier JSON — sans interface dédiée, l'utilisateur devrait éditer des marqueurs de conflit Git à la main, risque d'erreur de résolution.

**Débat** : E1 objecte que ce cas est rare en usage mono-utilisateur réel (Phase 1). E5 maintient que le PQ-02 de l'outil (protocole PQ) teste explicitement le changement de poste — le cas doit donc être couvert au moins par une interface de résolution assistée, pas nécessairement par une prévention automatique. E4 soutient E5 : un conflit Git non résolu proprement est un risque d'intégrité de données CSV classique.

**Décision** : retenu, à un niveau de risque modéré (le conflit Git n'est pas silencieux — visible, donc détectable). Nouvel AR-R-34, nouvelle exigence URS-NF-045bis, opérationnalisée en FS §5.1/§8.

### 3. E6 / E7 — Incohérence de rigueur : liens Métrologie→IQ et Maintenance→OQ non contraints (fond)

**Constat** : la FS v02 impose un blocage technique explicite pour le lien Contexte procédé → OQ/PQ/Validation de procédé (§4.0, mitige AR-R-26). Le catalogue URS §10 décrit pourtant, dans les mêmes termes d'intention ("lié à l'IQ", "lié à la clôture de l'OQ — Annexe 15 §3.12"), des liens attendus pour Métrologie (L) et Maintenance (M) — mais aucune exigence URS formelle ni règle FS ne les rend contraignants. Un IQ peut aujourd'hui être clôturé sans plan de métrologie lié, un OQ sans plan de maintenance lié, sans que rien ne le signale.

**Débat** : E3 juge l'incohérence sérieuse — un auditeur GxP verrait mal qu'une seule des trois familles de liens (procédé, métrologie, maintenance) soit techniquement forcée alors que les trois sont présentées avec la même intention dans le catalogue. E2 rappelle que cette dissymétrie n'a pas été délibérée — c'est un oubli de la FS v02, pas un choix de conception réfléchi.

**Décision** : retenu. Deux nouvelles exigences URS (F-000octies, F-000nonies), deux nouveaux risques AR (R-35, R-36), opérationnalisées en FS §4.0 selon le même mécanisme que le Contexte procédé.

### 4. E1 — Dérive de fiabilité fournisseur IA non détectée après qualification initiale (fond)

**Constat** : URS-F-032quater exige une qualification de fiabilité **avant** activation d'un fournisseur, consignée une fois (`ai_provider_reliability_qualification`). Mais un fournisseur cloud peut déployer une nouvelle version de son modèle sous-jacent sans préavis à l'utilisateur — la qualification initiale devient alors obsolète silencieusement. La FS journalise déjà "le moteur exact utilisé" par session (URS-F-037) mais ne compare jamais cette information à la version qualifiée, et n'alerte jamais d'une dérive.

**Débat** : E4 (CSV) qualifie ce point de classique en environnement SaaS tiers ("vendor drift" non maîtrisé) — un vrai point faible identifié dans la littérature GAMP AI Guide (ISPE, déjà cité en URS §6). E3 confirme l'alignement avec ce référentiel. Aucune objection soulevée.

**Décision** : retenu, jugé le point le plus substantiel du tour (le seul avec un IPR proche du seuil d'action obligatoire). Nouvelle exigence URS-F-032quinquies, nouveau risque AR-R-37 (IPR=48), opérationnalisée en FS §4.4.

### 5. E3 — Absence de politique de rétention/archivage pour `revisions[]`/`audit_log` (fond, mineur)

**Constat** : la FS garantit l'absence de purge ("sans purge") mais ne formule aucune politique explicite de rétention — un auditeur QA demandera systématiquement "combien de temps ces données sont-elles conservées, et selon quelle règle ?".

**Débat** : E2 précise que la réponse correcte en Phase 1 est simple (rétention indéfinie, alignée sur la durée de vie du dépôt Git) mais qu'elle doit être **dite explicitement**, pas seulement déductible. Pas de désaccord.

**Décision** : retenu comme clarification FS, aucun impact URS/AR (l'URS ne fixe pas de durée légale de rétention, hors périmètre Phase 1 mono-utilisateur ; à formaliser en Phase 3 avec le SMQ du client final).

### 6. E2 — Absence de règle sur les avis contradictoires entre relecteurs multiples (fond, mineur)

**Constat** : URS-F-014ter/FS §4.2bis permettent plusieurs relecteurs avec avis distincts, sans préciser ce qui se passe en cas de désaccord entre eux avant transmission à l'approbation.

**Débat** : E2 précise que ceci n'est **pas** un défaut à combler par un mécanisme technique — la décision reste humaine, portée par l'approbateur final qui voit tous les avis. Le risque est uniquement que la FS reste ambiguë sur ce point sans le dire.

**Décision** : retenu comme clarification FS uniquement (aucun blocage technique introduit, pour ne pas complexifier inutilement le workflow Phase 1 — cohérent avec la priorité de conception URS-NF-043).

### 7. E3 — Forme : références AR manquantes dans le tableau §6 "Règles métier transversales" (forme)

**Constat** : sur les 9 lignes du tableau, 4 ne citent aucun risque AR associé alors que la plupart des autres sections de la FS prennent soin de citer systématiquement la référence AR-R-xx mitigée. Incohérence de rigueur documentaire, pure forme mais génératrice de confusion en revue.

**Décision** : retenu, correction de forme pure — chaque ligne du tableau doit citer sa référence AR quand elle existe.

## Point examiné et non retenu

**E4 — Stratégie de test proportionnée au risque (IPR) déclinée dans la FS elle-même.** E4 proposait que la FS précise quelles règles du §6 nécessitent des tests automatisés obligatoires vs exploratoires, en fonction de l'IPR AR associé. E5 et le rédacteur objectent que cette déclinaison relève de la **stratégie de vérification**, déjà portée par le VMP (§3 "Stratégie de vérification proportionnée au risque") — la dupliquer dans la FS créerait un risque de divergence entre les deux documents à chaque mise à jour de l'un ou l'autre. **Décision : non retenu dans la FS**, explicitement renvoyé à la réécriture du VMP (prochaine étape de la cascade documentaire, FS §12).

## Synthèse des amendements

| # | Origine | Type | Impact |
|---|---|---|---|
| 1 | E5 | Clarification | FS §3/§5.3 |
| 2 | E5 | Nouvelle exigence + risque | URS-NF-045bis, AR-R-34, FS §5.1/§8 |
| 3 | E6/E7 | Nouvelles exigences + risques | URS-F-000octies/nonies, AR-R-35/R-36, FS §4.0/§8 |
| 4 | E1 | Nouvelle exigence + risque | URS-F-032quinquies, AR-R-37 (IPR=48, le plus élevé de ce tour), FS §4.4 |
| 5 | E3 | Clarification | FS §5.4 |
| 6 | E2 | Clarification | FS §4.2bis |
| 7 | E3 | Correction de forme | FS §6 |

## Statut

Clôturé le 21/08/2026. Aucun point ouvert bloquant. URS passe en v08, AR en v08, FS en v03. La FS reste ouverte à d'éventuels nouveaux amendements si la réécriture du VMP (prochaine étape) révèle une incohérence supplémentaire — cohérent avec la consigne de vérification systématique à chaque mise à jour de document.

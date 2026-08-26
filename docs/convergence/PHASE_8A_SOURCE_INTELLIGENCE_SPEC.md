# PHASE 8a — Source/Document Intelligence (structuration assistée) : revue panel avant implémentation

| | |
|---|---|
| **Statut** | Spec de phase (même discipline que Phases 5/7b/7c). Rédigée **avant** tout code, panel collégial E1-E7 (`00-cadrage-projet.md` §6bis). Ne couvre que la sous-phase 8a de TD-004 — la compréhension de schémas techniques complexes (P&ID, électrique) reste en 8b, non engagée, "seulement après retour d'expérience réel" (TD-004). |
| **Sources** | `GAP.md` lignes "Source / Document Intelligence" (*Acquire→Parse/OCR→Structure→Extract→Evidence*) et "Knowledge / Conflict / Evidence" (*SOURCE → EXTRACTION → EVIDENCE → INTERPRETATION → KNOWLEDGE → CONFIRMATION, `Conflict` visible tant que non résolu*) ; `TECHNICAL_DECISIONS.md` TD-004 (séquencement 8a/8b) ; `CONVERGENCE_PLAN.md` Phase 8 Acceptance Criteria (*structuration assistée validée par un humain avant tout `KnowledgeItem`, seuil `NEEDS_REVIEW` strict par défaut*) ; Worker OCR déjà construit et testé (Phase 6, `workers/ocr-relay/`). |

**Limite déclarée d'emblée** : comme en 7b/7c, aucune source locale ne détaille les champs au-delà des noms de pipeline. Décision de conception assumée et documentée plutôt que devinée en silence : **le mot "Evidence" employé par `GAP.md` pour ce pipeline désigne le contenu brut extrait (`Extraction.contenu_brut`)** — pas un objet séparé — pour éviter toute collision avec l'`Evidence` déjà construite en Phase 7c (traçabilité Test/Execution), qui est un concept distinct. Aucun appel IA réel n'est construit dans cet incrément : `valeur_interpretee` est fournie par l'appelant (humain, ou une couche de suggestion IA câblée séparément plus tard) — ce module ne fait que porter la structuration candidate avec son garde-fou `NEEDS_REVIEW`, jamais générer lui-même.

---

## 1. Constat déclencheur

`GAP.md` : "Total" — aucune capacité de parsing/OCR/compréhension de document n'existe, seul un import JSON brut de transfert entre postes. Le Worker OCR (Phase 6) fournit déjà le relais technique (`OcrRelayAdapter`) mais rien ne structure encore son résultat en donnée exploitable et validée.

## 2. Revue panel (E1-E7)

- **E1 (Fournisseur/IA-GAMP5/Part11)** : **garde-fou central de cette phase** — un `KnowledgeItem` DOIT toujours naître au statut `a_valider` (NEEDS_REVIEW), jamais `valide` à la création, quel que soit le contenu extrait. Cohérent avec le principe fondateur n°1 et l'Acceptance Criteria explicite de `CONVERGENCE_PLAN.md`.
- **E2 (Qualité/SMQ)** : deux `KnowledgeItem` peuvent se contredire (ex. deux extractions donnant des valeurs différentes pour un même paramètre) — modélisé par `Conflict`, qui reste **visible et ouvert** tant qu'un humain ne l'a pas résolu explicitement (`resolution` obligatoire) — jamais une résolution automatique silencieuse.
- **E3 (QA Réglementaire, intégrité des données)** : `Extraction.contenu_brut` est conservé tel quel (immutable) — c'est la preuve de premier niveau de ce qui a été effectivement lu/extrait, distincte de son interprétation (`KnowledgeItem.valeur_interpretee`), pour qu'un audit puisse toujours remonter du fait interprété au texte brut d'origine.
- **E4 (CSV)** : sans objet direct — ce module est transverse, ne concerne pas spécifiquement un système informatisé.
- **E5 (Architecte logiciel)** : 4 entités, pipeline simplifié par rapport aux 2 formulations imbriquées de `GAP.md` (Acquire/Parse/Structure/Extract/Evidence **et** Source/Extraction/Evidence/Interpretation/Knowledge/Confirmation décrivent la même chaîne à des granularités différentes) :
  - `Source` = le document/image d'origine — pointeur déclaratif (même limite assumée qu'`EvidenceLocation`, 7c : aucun stockage de fichier binaire réel construit ici).
  - `Extraction` = le texte brut obtenu (OCR via le relais Phase 6, ou saisie manuelle directe) — immutable, la "preuve de premier niveau".
  - `KnowledgeItem` = l'interprétation structurée candidate d'une `Extraction`, toujours `a_valider` à la création, promue `valide` uniquement par une action humaine explicite.
  - `Conflict` = désaccord explicite entre deux `KnowledgeItem`, visible tant que non résolu.
- **E6 (Métrologie)/E7 (Maintenance)** : sans champ spécifique requis par les sources disponibles.

## 3. Garde-fous non négociables retenus (testés explicitement)

1. Un `KnowledgeItem` DOIT toujours être créé au statut `a_valider` — jamais `valide` à la création, quel que soit l'appelant.
2. Valider un `KnowledgeItem` (`validerKnowledgeItem`) exige un acteur humain explicite tracé — jamais une validation automatique.
3. Un `Conflict` reste `ouvert` tant qu'aucune résolution explicite n'est fournie — jamais auto-résolu.
4. Aucune génération de contenu IA dans ce module — `valeur_interpretee` est toujours fournie par l'appelant, ce store ne fait que la porter et appliquer le garde-fou NEEDS_REVIEW.

## 4. Décision de conception retenue

```text
Source {
  id, client_id
  type: document | image
  titre
  systeme: github | drive | externe   // pointeur déclaratif, jamais un fichier binaire
  reference
  created_at
}

Extraction {
  id, client_id, source_id
  methode: ocr_azure | saisie_manuelle
  contenu_brut        // immutable, preuve de premier niveau
  horodatage
}

KnowledgeItem {
  id, client_id, extraction_id
  libelle
  valeur_interpretee
  statut: a_valider | valide | rejete   // toujours a_valider à la création
  valide_par: string | null
  audit_log, created_at, updated_at
}

Conflict {
  id, client_id
  knowledge_item_source_id, knowledge_item_cible_id
  description
  statut: ouvert | resolu
  resolution: string | null
  created_at
}
```

## 5. Périmètre exclu (8b, non engagée)

Compréhension de schémas techniques complexes (P&ID, schémas électriques, diagrammes Oui/Non) — TD-004 : "seulement après retour d'expérience réel" sur la structuration assistée de 8a. Aucune tentative de compréhension d'image structurée n'est faite ici, seulement du texte brut.

## 6. Tests obligatoires

Chaque garde-fou du §3, testé individuellement ; scénario nominal Source→Extraction→KnowledgeItem (a_valider) puis validation explicite ; scénario de conflit entre deux `KnowledgeItem` issus de deux `Extraction` différentes, restant `ouvert` jusqu'à résolution explicite ; isolation stricte par client.

---

*Ce document sert de spec de phase — l'implémentation qui suit s'y conforme sans redécider en cours de route ; toute déviation par rapport à ce document doit être justifiée dans le commit.*

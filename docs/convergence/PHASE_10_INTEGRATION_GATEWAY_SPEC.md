# PHASE 10 — Integration Gateway générique: revue panel avant implémentation

| | |
|---|---|
| **Statut** | Spec de phase (même discipline que les specs de phase précédentes). Rédigée **avant** tout code, panel collégial E1-E7 (`00-cadrage-projet.md` §6bis). Engagée sur demande explicite de l'utilisateur, en anticipant les connexions les plus utilisées: Veeva Vault, autres systèmes documentaires (SharePoint/EDMS génériques), dossiers sur disque réseau, et Google Drive (déjà connecté, à réutiliser). |
| **Sources** | `03_DOMAIN_DATA_MODEL.md` (domaine "Integration": `Connector, SyncJob, ExternalReference`); `01_ARCHITECTURE_MASTER_FINAL.md` §32 (adapters SAP/TrackWise/Veeva/DMS-EDMS/SharePoint/MES/LIMS/CMMS/SCADA/Historian/OPC-UA, `Connector + SyncJob + ExternalReference`, retry et failure state explicites); `05_CONTRACTS_EVENTS.md` (états non-bloquants `PENDING/UNAVAILABLE/RETRYING/FAILED`); (`TECHNICAL_DECISIONS.md`, déjà actée: extraire une interface `Connector` générique à partir de `GitHubConnector`/`DriveConnector` existants, ADAPT, sans réécrire leur logique validée); catalogue de gabarits famille N (Veeva Vault référence Should, SAP/TrackWise Could); `AssetNode.qms_connector_id`/`source: 'qms_pull'` déjà présents dans le modèle (Structure Système) comme point d'ancrage anticipé. Recherche web ciblée (25/08/2026) sur l'authentification réelle de l'API REST Veeva Vault (session ID via endpoint d'authentification, header `Authorization` sur tous les appels suivants) — vérifiée avant d'écrire tout adaptateur, jamais devinée. |

**Limite déclarée d'emblée**: `GitHubConnector`/`DriveConnector` sont les connecteurs de **stockage propre à ValidaPharm** (source de vérité + miroir de secours), pas des connecteurs QMS tiers au sens strict — ils sont réutilisés ici (ADAPT) comme les deux premières implémentations concrètes de l'interface générique, sans être le cœur métier de cette phase. Aucun accès disque réseau natif n'est possible depuis un navigateur (architecture PWA, `00-cadrage-projet.md`) — un connecteur "dossier réseau" nécessiterait un relais serveur (même pattern que le relais OCR), non construit ici faute de point d'accès concret fourni par l'utilisateur. De même, aucun identifiant/URL Veeva Vault réel n'est disponible dans cette session — l'adaptateur Veeva est un squelette basé sur le flux d'authentification réel et vérifié de l'API, explicitement flagué comme non testé en conditions réelles (même limite que le relais OCR Azure).

---

## 1. Constat déclencheur

`GAP.md`: "Connector/SyncJob/ExternalReference (Integration Gateway) — Partiel". `GitHubConnector`/`DriveConnector` existent déjà mais chacun a son propre contrat d'erreurs typées, sans abstraction commune ni `SyncJob` avec états explicites. Ce chantier avait été noté "peu utile avant qu'un vrai connecteur QMS soit engagé" dans `CONVERGENCE_PLAN.md` — l'utilisateur a explicitement demandé d'anticiper maintenant Veeva, d'autres systèmes documentaires, les dossiers réseau et Google Drive, plutôt que d'attendre.

## 2. Revue panel (E1-E7)

- **E1 (Fournisseur/IA-GAMP5/Part11)**: sans objet direct — ce module ne fait aucune IA.
- **E2 (Qualité/SMQ)**: un `SyncJob` en échec (`FAILED`) ou indisponible (`UNAVAILABLE`) ne doit **jamais** bloquer une activité indépendante — même principe non-blocking déjà appliqué à `QualityEvent` et maintenant étendu explicitement aux connecteurs (`05_CONTRACTS_EVENTS.md`).
- **E3 (QA Réglementaire, intégrité des données)**: un document importé via un `Connector` tiers est référencé (`ExternalReference`), jamais dupliqué comme contenu officiel sans traçabilité de provenance — cohérent avec `Evidence`/`ProvenanceLink` et `Source`/`SourceLocation`.
- **E4 (CSV)**: `AssetNode.qms_connector_id` (déjà présent, Structure Système) référence désormais un `Connector` réel de cette phase — premier point d'intégration concret.
- **E5 (Architecte logiciel)**: interface `ConnecteurDocumentaire` générique (contrat minimal: `tester`, `listerDocuments`, `lireDocument`) à laquelle se conforment les adaptateurs concrets — même pattern que `FournisseurOcr` (swappable). `Connector` (config déclarée par type, jamais de credentials en clair non chiffrés au-delà de ce que fait déjà `ClientConfig`), `SyncJob` (une tentative de synchronisation, états `en_attente | indisponible | nouvelle_tentative | echec | reussi`), `ExternalReference` (pointeur vers un document/objet externe, jamais son contenu dupliqué).
- **E6 (Métrologie)/E7 (Maintenance)**: sans champ spécifique requis par les sources disponibles.

## 3. Garde-fous non négociables retenus (testés explicitement)

1. Un `SyncJob` en échec ou indisponible ne bloque jamais la création d'un `ExternalReference` ou d'une opération métier indépendante — vérifié explicitement.
2. `ExternalReference` ne duplique jamais le contenu du document externe — seulement une référence (système, identifiant externe, `connector_id`).
3. Chaque type de `Connector` porte une config typée distincte — jamais un blob générique non typé.
4. Aucune génération/synchronisation automatique par IA.

## 4. Décision de conception retenue

```text
Connector {
  id, client_id
  type: github | google_drive | veeva_vault | sharepoint | dossier_reseau | edms_generique
  nom
  config: <forme selon type>
  actif
  created_at
}

SyncJob {
  id, client_id, connector_id
  statut: en_attente | indisponible | nouvelle_tentative | echec | reussi
  tentative
  derniere_erreur: string | null
  created_at, updated_at
}

ExternalReference {
  id, client_id, connector_id
  identifiant_externe
  libelle
  created_at
}
```

Adaptateurs concrets (`ConnecteurDocumentaire`):
- `github`/`google_drive`: ADAPT — enveloppent `GitHubConnector`/`DriveConnector` existants, sans réécrire leur logique déjà testée.
- `veeva_vault`: squelette basé sur le flux d'authentification réel vérifié (session ID via endpoint d'authentification, header `Authorization` ensuite) — **non testé en conditions réelles**, à reverifier contre la documentation Vault live avant déploiement (même limite que le relais OCR Azure).
- `sharepoint`/`dossier_reseau`/`edms_generique`: type reconnu et modélisé (config + store), **adaptateur non implémenté** — un dossier réseau n'est pas accessible depuis un navigateur sans relais serveur (aucun point d'accès concret fourni), et aucune source vérifiée n'est disponible pour SharePoint/EDMS générique dans cette session. Construire l'adaptateur concret reste un chantier futur, quand un point d'accès réel sera fourni.

## 5. Tests obligatoires

Chaque garde-fou du §3; scénario nominal `Connector → SyncJob → ExternalReference`; adaptateurs GitHub/Drive/Veeva testés unitairement (fetch mocké, même méthode que les connecteurs existants); isolation stricte par client.

---

*Ce document sert de spec de phase — l'implémentation qui suit s'y conforme sans redécider en cours de route; toute déviation par rapport à ce document doit être justifiée dans le commit.*

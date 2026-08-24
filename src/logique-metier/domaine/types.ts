/**
 * Types du modèle de données pivot (FS §3, SDS §3).
 *
 * Les clés des objets ci-dessous sont volontairement en snake_case, alignées
 * lettre pour lettre sur le modèle pivot documenté en FS §3 et sur les
 * fichiers JSON réellement stockés dans le dépôt GitHub (SDS §3,
 * `/data/projects/{id}.json`, etc.) — un auditeur qui compare un fichier
 * JSON réel à la FS doit retrouver les mêmes noms de champs sans traduction
 * mentale, cohérent avec l'objectif d'auditabilité (08-conventions-codage.md
 * §4).
 */
import type { ModeUsageIA } from '../../connecteurs/ia/ProviderAdapter'

export type Langue = 'fr' | 'en' | 'de'

/** Catalogue des gabarits (URS §10, familles A à M utilisées à ce stade de la conception). */
export type TemplateType =
  | 'contexte_procede'
  | 'urs'
  | 'dq'
  | 'fat'
  | 'sat'
  | 'iq'
  | 'oq'
  | 'pq'
  | 'validation_procede'
  | 'plan_metrologie'
  | 'plan_maintenance'

export type StatutSection =
  | 'brouillon_aide'
  | 'propose_par_ia_non_valide'
  | 'en_verification'
  | 'en_approbation'
  | 'valide_en_interne'

export interface EntreeJournalAudit {
  timestamp: string
  actor: string
  action: string
}

export interface RevisionSection {
  version: string
  date: string
  auteur: string
  motif: string
}

export interface LienProjet {
  from_section_id: string
  to_section_id: string
  created_by: string
  created_at: string
}

export interface SignatureRole {
  user_id?: string
  date?: string
}

export interface Project {
  id: string
  name: string
  context: string
  scope_in: string
  scope_out: string
  deadline: string | null
  language_default: Langue
  client_id: string | null
  sections: string[]
  documents: string[]
  links: LienProjet[]
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  project_id: string
  template_type: TemplateType
  template_engine_version: string
  owner_id: string
  shared_with: Array<{ user_id: string; access_level: 'lecture' | 'édition' }>
  language: Langue
  status: StatutSection
  meta: { ref: string; titre: string; version: string; site?: string }
  workflow: {
    authors: string[]
    reviewers: Array<{ user_id: string; avis: string; date: string }>
    approver_final: string | null
  }
  signatures: {
    redacteur: SignatureRole
    verificateur: SignatureRole
    approbateur: SignatureRole
  }
  revisions: RevisionSection[]
  values: Record<string, string | number | null>
  tables: Record<string, Array<Record<string, string | number | null>>>
  generation_source: { source_document_id: string | null; generated_fields: string[] }
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

export interface ProjectDocument {
  id: string
  project_id: string
  filename: string
  status: 'reference_de_travail_non_maitre'
  uploaded_at: string
  uploaded_by: string
}

/**
 * Entité `client` — identité minimale (FS §3, v12, gap trouvé en
 * construisant le connecteur Drive) : `client_id` était référencé partout
 * (`Project.client_id`, `ClientConfig`, `asset_hierarchy_schema`,
 * `asset_node`) sans jamais être lui-même modélisé. Volontairement
 * minimal — l'identité seule ; c'est `ClientConfig` qui porte les réglages.
 */
export interface Client {
  id: string
  name: string
  created_at: string
}

export interface ClientConfig {
  client_id: string
  ai_provider: string
  /**
   * Accusé de réception des conditions de traitement des données du
   * fournisseur actuellement configuré (FS §3 v15) — un accusé par
   * fournisseur, jamais un simple booléen global : changer de fournisseur
   * exige un nouvel accusé, les conditions différant d'un fournisseur à
   * l'autre.
   */
  ai_provider_conditions_acquittees: { fournisseur: string; date: string } | null
  ai_provider_reliability_qualification: {
    date: string
    resultat: string
    qualification_test_set_id: string
    qualification_test_set_version: string
    /**
     * Identifiant de version de modèle exposé par le fournisseur au
     * moment de cette qualification (FS §3 v14) — distinct de
     * `qualification_test_set_version` (version du jeu de test, pas du
     * moteur évalué). `null` si le fournisseur n'exposait aucune version
     * au moment de la qualification.
     */
    moteur_version_qualifiee: string | null
  } | null
  export_template_id: string | null
  consent_telemetry: { granted: boolean; date: string | null; revocable_at_any_time: true }
}

/**
 * Schéma de hiérarchie des actifs (FS §3, URS-F-100bis) — par client,
 * aucune structure imposée par défaut. `levels[]` est ordonné du plus
 * générique au plus spécifique (ex. Site > Zone > Système > Équipement),
 * mais cet ordre n'est pas encore appliqué comme garde-fou dans cet
 * incrément (voir `logique-metier/structure-systeme/` : seule l'absence
 * de cycle et l'unicité du code sont vérifiées ; l'ordre des niveaux
 * reste informationnel jusqu'à un incrément futur).
 */
export interface AssetHierarchySchema {
  client_id: string
  levels: Array<{ key: string; label: Record<Langue, string>; numbering_pattern: string }>
}

/**
 * Nœud du référentiel d'actifs (FS §3, URS-F-100 à 102quinquies) — arbre
 * (`parent_id`, sans cycle, URS-F-100ter/nonies) et graphe libre
 * (`associated_nodes[]`, cycles acceptés). `qms_connector_id` et
 * `periodic_qualification`/`qualification_status` sont modélisés dès
 * cette version (alignés sur FS §3) mais leur exploitation (pull QMS,
 * alertes de périodicité) reste hors périmètre du premier incrément —
 * voir le backlog.
 */
export interface AssetNode {
  id: string
  client_id: string
  level_key: string
  name: string
  code: string
  parent_id: string | null
  associated_nodes: string[]
  source: 'manuel' | 'qms_pull'
  qms_connector_id: string | null
  periodic_qualification: { applicable: boolean; deadline: string | null }
  qualification_status:
    | 'non_qualifie'
    | 'en_cours_qualification_initiale'
    | 'qualifie'
    | 'qualifie_ecart_ouvert'
    | 'requalification_requise'
    | 'requalification_en_retard'
    | 'suspendu'
    | 'declasse'
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Journal de session de chat (FS §3 v16, URS-F-037) — jamais le contenu
 * échangé, seulement horodatage début/fin, fournisseur, moteur exact et
 * indication qu'un document a été joint. `section.audit_log` ne pouvait
 * pas porter cette information : une session peut se dérouler sans
 * qu'aucun document ne soit jamais joint.
 */
export interface AiChatSessionLog {
  id: string
  client_id: string
  started_at: string
  ended_at: string | null
  mode: ModeUsageIA
  ai_provider: string
  moteur_version: string | null
  document_joint: boolean
}

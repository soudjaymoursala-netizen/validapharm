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

export interface ClientConfig {
  client_id: string
  ai_provider: string
  ai_provider_reliability_qualification: {
    date: string
    resultat: string
    qualification_test_set_id: string
    qualification_test_set_version: string
  } | null
  export_template_id: string | null
  consent_telemetry: { granted: boolean; date: string | null; revocable_at_any_time: true }
}

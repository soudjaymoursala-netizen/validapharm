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
import type { ReponseQuestionOuiNon } from '../assessment/moteurQuestionsOuiNon'

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

/**
 * Question d'une méthode ACFC (FS §4.6bis, Phase 1 de convergence
 * architecturale — `docs/convergence/CONVERGENCE_PLAN.md`). Le texte est
 * conservé mot pour mot tel que fourni par le client, jamais reformulé ni
 * traduit automatiquement (seule la langue explicitement saisie est
 * garantie fidèle ; les autres langues du record restent vides tant que
 * personne ne les a renseignées).
 */
export interface QuestionACFC {
  id: string
  texte: Partial<Record<Langue, string>>
  famille?: string
}

export type OrigineMethodeACFC = 'procedure_client' | 'defini_utilisateur' | 'baseline_validapharm'

/**
 * Méthode ACFC configurable par client (FS §4.6bis, remplace la grille de
 * criticité codée en dur — voir `docs/convergence/TECHNICAL_DECISIONS.md`
 * TD-002). Un client peut avoir 4, 6, 7, 9 ou N questions ; **jamais de
 * valeur figée dans le code**. Immuable une fois créée (principe de
 * versionnement du package Target Architecture, "Versioned records are
 * immutable") : toute modification crée une nouvelle version, elle ne
 * mute jamais un profil existant déjà utilisé par une évaluation.
 *
 * `decision_rule` est modélisée comme donnée plutôt que codée en dur,
 * mais une seule règle a été confirmée sur source réelle à ce jour (au
 * moins un "oui" parmi les questions → élément critique, confirmée sur 4
 * sources indépendantes le 24-25/08/2026) — le type n'accueille donc
 * qu'une seule valeur pour l'instant, pas par choix de conception mais
 * par absence de contre-exemple réel documenté.
 *
 * @requirement URS-F-050 (F2, Analyse de risque)
 */
export interface MethodProfileACFC {
  id: string
  client_id: string
  version: string
  effective_date: string
  source: string
  origin: OrigineMethodeACFC
  questions: QuestionACFC[]
  decision_rule: 'au_moins_un_oui_critique'
  created_at: string
}

export type ReponseQuestionACFC = 'oui' | 'non' | 'inconnu' | 'sans_objet'

/**
 * Une évaluation ACFC (FS §4.6bis) : l'exécution d'un `MethodProfileACFC`
 * contre un élément réel (composant/fonction), optionnellement rattaché à
 * un nœud de Structure Système (§4.10). `method_profile_version` fige la
 * version utilisée au moment de l'évaluation (traçabilité/reproductibilité
 * historique, cohérent avec le principe `ContextSnapshot` immuable du
 * package Target Architecture) : si la méthode est révisée ensuite, cette
 * évaluation reste lisible telle qu'elle a été produite.
 */
export interface EvaluationACFC {
  id: string
  client_id: string
  method_profile_id: string
  method_profile_version: string
  asset_node_id: string | null
  nom_element: string
  reponses: Record<string, ReponseQuestionACFC>
  verdict: 'critique' | 'non_critique' | null
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Paramètre de procédé/produit (Phase 2 de convergence architecturale,
 * `docs/convergence/CONVERGENCE_PLAN.md`). Objet de base — ne porte lui-même
 * aucune notion de criticité : le niveau d'importance/criticité est un objet
 * séparé (`ClassificationCriticiteParametre`), jamais un champ mutable ici,
 * pour qu'une classification reste un événement daté et justifié plutôt
 * qu'un simple attribut qu'on écrase.
 *
 * @requirement Target Architecture §10 (`01_ARCHITECTURE_MASTER_FINAL.md`),
 * DEC-019/DEC-020
 */
export interface Parameter {
  id: string
  client_id: string
  asset_node_id: string | null
  nom: string
  description: string
  unite: string | null
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

export type NiveauCriticiteParametre = 'important' | 'critique'

/**
 * Déclaration qu'un `Parameter` est important ou critique **pour le
 * procédé** (`ImportantParameter`/`CriticalParameter` du package Target
 * Architecture §10 — modélisés ici comme un seul type discriminé par
 * `niveau` : les deux partagent exactement la même structure de
 * déclaration, seul le niveau diffère, et les fondre en deux interfaces
 * identiques n'ajouterait aucune garantie supplémentaire).
 *
 * **Ne crée jamais de `CPP` ni de `CQA`.** Le package l'interdit
 * explicitement (§10 : *"Un CPP ne doit jamais être promu automatiquement à
 * partir d'un simple score de criticité"*, DEC-019). Un `CPP`/`CQA` ne peut
 * être créé que par une déclaration humaine explicite et séparée.
 */
export interface ClassificationCriticiteParametre {
  id: string
  client_id: string
  parameter_id: string
  niveau: NiveauCriticiteParametre
  contexte: string | null
  justification: string
  audit_log: EntreeJournalAudit[]
  created_at: string
}

/**
 * CPP (Critical Process Parameter, ICH Q8/Q9/Q10) — déclaration humaine
 * explicite, jamais dérivée automatiquement d'une `ClassificationCriticiteParametre`
 * (DEC-019). Contextuel (DEC-021, "CQA/CPP context change" —
 * `11_USE_CASES_70_SCENARIOS.md`) : un même `Parameter` peut être un CPP
 * dans un contexte produit/procédé donné et ne pas l'être dans un autre.
 * `contexte` reste un champ texte libre tant que `ManufacturingContext`
 * n'existe pas comme entité relationnelle (Phase 4 du plan de convergence) —
 * pas une simplification définitive, une étape intermédiaire assumée.
 *
 * Immuable comme événement : un changement de contexte ne mute jamais un
 * CPP existant, il en désactive un (`actif: false`, motif tracé dans
 * `audit_log`) et, si applicable, en déclare un nouveau pour le nouveau
 * contexte — l'historique reste lisible tel qu'il a été produit.
 */
export interface CPP {
  id: string
  client_id: string
  parameter_id: string
  contexte: string
  justification: string
  actif: boolean
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * CQA (Critical Quality Attribute, ICH Q8) — même principe de déclaration
 * humaine explicite et contextuelle que `CPP`, mais porte sur un attribut
 * qualité (produit), pas sur un paramètre de procédé : pas de
 * `parameter_id`, car un CQA n'est pas nécessairement issu d'un `Parameter`
 * suivi dans l'outil (ex. un attribut mesuré uniquement en laboratoire
 * externe).
 */
export interface CQA {
  id: string
  client_id: string
  nom: string
  description: string
  contexte: string
  justification: string
  actif: boolean
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Impact Assessment / System Classification (F1 du catalogue §10, URS v27
 * — Phase 3 de convergence architecturale, `docs/convergence/
 * CONVERGENCE_PLAN.md`). Étape **en amont** de l'ACFC (F2), pas la même
 * chose : détermine si un système entre dans le périmètre GMP qualifiable
 * ("Direct Impact") avant toute analyse de risque. Même mécanisme que
 * `MethodProfileACFC` (questionnaire Oui/Non configurable par client,
 * questions conservées mot pour mot, immuable/versionné) — confirmé sur
 * les mêmes sources réelles (Ferring FSMP : 7 questions ; ISPE Baseline
 * Guide "System Classification" : 8 questions), d'où la réutilisation du
 * moteur `assessment/moteurQuestionsOuiNon.ts`. Type volontairement
 * distinct de `MethodProfileACFC`/`EvaluationACFC` en base : F1 et F2 sont
 * deux briques séquentielles distinctes (URS v26/v27), jamais fusionnées.
 *
 * @requirement URS-F-050 (F1, Impact Assessment / System Classification)
 */
export interface QuestionImpactAssessment {
  id: string
  texte: Partial<Record<Langue, string>>
}

export type OrigineMethodeImpactAssessment =
  'procedure_client' | 'defini_utilisateur' | 'baseline_validapharm'

export interface MethodProfileImpactAssessment {
  id: string
  client_id: string
  version: string
  effective_date: string
  source: string
  origin: OrigineMethodeImpactAssessment
  questions: QuestionImpactAssessment[]
  decision_rule: 'au_moins_un_oui_impact_direct'
  created_at: string
}

export interface EvaluationImpactAssessment {
  id: string
  client_id: string
  method_profile_id: string
  method_profile_version: string
  asset_node_id: string | null
  nom_element: string
  reponses: Record<string, ReponseQuestionOuiNon>
  verdict: 'impact_direct' | 'non_impact_direct' | null
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Catégorisation GAMP5 (PIC/S PI 011-3) — grille normative **fixe à 5
 * catégories**, confirmée sur source réelle le 24-25/08/2026 :
 * 1 Infrastructure, 2 Firmware, 3 Logiciel standard non configuré,
 * 4 Logiciel configurable, 5 Sur mesure. **Non modulable par client**,
 * à la différence de `MethodProfileACFC`/`MethodProfileImpactAssessment` —
 * c'est délibérément un type sans `MethodProfile` associé : il n'y a rien
 * à configurer, seulement une catégorie à sélectionner et justifier.
 */
export type CategorieGAMP5 = 1 | 2 | 3 | 4 | 5

/**
 * Computer System Assessment (F3 du catalogue §10, URS v27) — évaluation
 * dédiée aux systèmes informatisés (catégorie GAMP5, pertinence GxP,
 * pertinence ERES/Part 11), brique distincte de F1 et F2, jamais fusionnée
 * avec elles (erreur documentée et corrigée en Phase 0bis, `docs/
 * convergence/ARCHITECTURE_CONFLICTS.md` CONFLICT-002).
 *
 * @requirement URS-F-050 (F3, Computer System Assessment)
 */
export interface EvaluationCSVAssessment {
  id: string
  client_id: string
  asset_node_id: string | null
  nom_systeme: string
  categorie_gamp5: CategorieGAMP5
  justification_categorie: string
  pertinence_gxp: boolean
  pertinence_eres_part11: boolean
  justification_pertinence: string
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Process (Phase 4 de convergence architecturale, `docs/convergence/
 * CONVERGENCE_PLAN.md`) — générique, pas limité à la production
 * (Target Architecture §4, `01_ARCHITECTURE_MASTER_FINAL.md`). EXTEND pur :
 * n'existait auparavant que comme gabarit de texte libre (famille A,
 * "Contexte procédé"), qui reste une des sorties possibles, plus la seule
 * source de vérité.
 *
 * @requirement Target Architecture §4
 */
export type TypeProcess =
  | 'manufacturing'
  | 'packaging'
  | 'facility'
  | 'digital'
  | 'csv'
  | 'document_workflow'
  | 'business'
  | 'ehs'
  | 'logistics'
  | 'support'
  | 'other'

export interface Process {
  id: string
  client_id: string
  nom: string
  description: string
  type: TypeProcess
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Function (Phase 4) — indépendante du type de `Process` (Target
 * Architecture §5) : exprime ce qui doit être réalisé/protégé/fourni
 * (production, mesure, contrôle, alarme, interlock, manutention, EHS,
 * nettoyage, support, logistique, fonction digitale), l'implémentation
 * physique/digitale étant portée séparément par `AssetNode`. Relation N:M
 * avec `AssetNode` et avec `Process` via des tables d'association dédiées
 * (`AssociationFonctionAssetNode`/`AssociationFonctionProcess`), jamais un
 * champ unique — un même équipement peut porter plusieurs fonctions, une
 * même fonction peut apparaître dans plusieurs procédés.
 *
 * @requirement Target Architecture §5
 */
export interface FonctionActif {
  id: string
  client_id: string
  nom: string
  description: string
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/** Relation N:M `FonctionActif` ⟷ `AssetNode` (Equipment/System/Subsystem/Component). */
export interface AssociationFonctionAssetNode {
  id: string
  client_id: string
  function_id: string
  asset_node_id: string
  created_at: string
}

/** Relation N:M `FonctionActif` ⟷ `Process`. */
export interface AssociationFonctionProcess {
  id: string
  client_id: string
  function_id: string
  process_id: string
  created_at: string
}

/**
 * ManufacturingContext (Phase 4) — relie explicitement un `AssetNode`
 * (Equipment/DigitalSystem) à un `Process`, un produit et, le cas échéant,
 * une recette/un format (Target Architecture §7). Empêche de déduire
 * qu'une relation Equipment↔Process est universelle alors qu'elle n'est
 * vraie que dans une configuration donnée — exemple du package : un même
 * SCADA sert Coating/Produit A/Recette R02 dans un contexte et
 * Granulation/Produit B/Recette R05 dans un autre.
 *
 * `Product`/`Recipe`/`Format`/`Configuration` ne sont pas encore des
 * entités séparées (hors périmètre de cette phase, EXTEND pur) : modélisés
 * en texte libre ici, comme le champ `contexte` de `CPP`/`CQA` (Phase 2)
 * en attendant — pas une simplification définitive.
 *
 * @requirement Target Architecture §7
 */
export interface ManufacturingContext {
  id: string
  client_id: string
  asset_node_id: string
  process_id: string
  produit: string
  recette: string | null
  format: string | null
  configuration: string | null
  created_at: string
  updated_at: string
}

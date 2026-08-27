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
 *
 * `workspace_id` (câblage Workspace, étape 1, 26/08/2026,
 * `CABLAGE_ETAPE_1_STRUCTURE_SYSTEME_SPEC.md`) : `null` = nœud hérité non
 * encore assigné à un site (visible depuis tout `Workspace` de
 * l'organisation, aucune régression) ; sinon le site auquel l'actif
 * appartient physiquement — un nœud reste visible depuis ce site et
 * depuis tous ses ancêtres (`noeudsVisiblesDepuisWorkspace`), jamais
 * depuis un site "cousin".
 */
export interface AssetNode {
  id: string
  client_id: string
  workspace_id: string | null
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

/**
 * QualityEvent (Phase 5 de convergence architecturale, `docs/convergence/
 * CONVERGENCE_PLAN.md`, spec détaillée dans `PHASE_5_QUALITY_EVENTS_SPEC.md`)
 * — comble la famille H de l'URS (Change Control, CAPA), aujourd'hui vide
 * de code, et absorbe `Deviation`/`Investigation`/`AuditFinding`
 * (absents du catalogue jusqu'ici) ainsi que `PeriodicReview` (famille I).
 *
 * Un seul type avec discriminant `type`, pas 6 interfaces dupliquées :
 * aucune source lue ne documente de champs distincts par sous-type
 * au-delà du nom (à la différence de l'Assessment générique, Phase 3, où
 * `CSVAssessment` avait un mécanisme réellement différent).
 *
 * `origine`/`reference_externe` portent le principe non négociable de la
 * cible (DEC-002/DEC-055) : un événement externe est référencé, jamais
 * dupliqué comme contenu officiel, et ne bloque **jamais** par
 * construction une activité indépendante — aucun garde-fou de blocage
 * automatique n'existe dans ce module, intentionnellement.
 *
 * @requirement URS catalogue §10 famille H (Change Control, CAPA), famille
 * I (Revue périodique)
 */
export type TypeQualityEvent =
  'change_control' | 'deviation' | 'capa' | 'investigation' | 'audit_finding' | 'periodic_review'

export type OrigineQualityEvent = 'interne' | 'externe' | 'mixte'

export interface ReferenceExterneQualityEvent {
  systeme: string
  identifiant: string
}

export interface QualityEvent {
  id: string
  client_id: string
  type: TypeQualityEvent
  titre: string
  description: string
  origine: OrigineQualityEvent
  reference_externe: ReferenceExterneQualityEvent | null
  asset_node_id: string | null
  process_id: string | null
  manufacturing_context_id: string | null
  statut: 'ouvert' | 'en_cours' | 'cloture'
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Référence optionnelle entre deux `QualityEvent` (ex. Deviation →
 * Investigation → CAPA, ou AuditFinding → CAPA) — jamais un workflow figé
 * à étapes obligatoires : une déviation mineure peut se clôturer sans
 * investigation ni CAPA.
 */
export interface ReferenceQualityEvent {
  id: string
  client_id: string
  quality_event_source_id: string
  quality_event_cible_id: string
  created_at: string
}

/**
 * Phase 7a de convergence architecturale (`docs/convergence/
 * CONVERGENCE_PLAN.md`) — première sous-étape du Test/Execution/Evidence
 * engine (marqué "risque élevé... à séquencer en sous-étapes, jamais en un
 * seul commit" par le plan) : uniquement la chaîne de **définition**
 * `Requirement → TestObjective → TestCandidate → Test`, jamais
 * l'exécution (Execution/ExecutionStep/Measurement/ExecutionEvent,
 * sous-étape 7b) ni l'Evidence (7c). Aucune génération IA ici — DEC-038 à
 * DEC-041 (Test Design Engine assisté par IA, critique IA, NEEDS_REVIEW)
 * restent hors périmètre tant qu'aucun module de génération IA n'existe
 * encore pour ce domaine (même prudence que Parameter/CPP/CQA, Phase 2).
 *
 * `Requirement` n'existait pas encore comme entité (`GAP.md`/
 * `03_DOMAIN_DATA_MODEL.md` du package Target la liste sous "Quality" —
 * gap non comblé par les phases précédentes) : ajoutée ici en tant que
 * fondation minimale de la chaîne de traçabilité exigée par l'acceptance
 * criteria de la Phase 7.
 *
 * @requirement Target Architecture, domaine "Test" (`03_DOMAIN_DATA_MODEL.md`)
 */
export interface Requirement {
  id: string
  client_id: string
  reference: string
  titre: string
  description: string
  asset_node_id: string | null
  process_id: string | null
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Ce qu'il faut démontrer pour une `Requirement` donnée — en amont des
 * idées de test concrètes (`TestCandidate`). Un `Requirement` peut avoir
 * plusieurs `TestObjective` (ex. un aspect fonctionnel et un aspect
 * sécurité du même requirement).
 */
export interface TestObjective {
  id: string
  client_id: string
  requirement_id: string
  titre: string
  description: string
  created_at: string
  updated_at: string
}

/**
 * Réaligné (25/08/2026) sur le vrai statut cible (`10_TEST_ENGINE.md` :
 * PROPOSED/NEEDS_INFORMATION/NEEDS_REVIEW/ACCEPTED/REJECTED/DUPLICATE/
 * SUPERSEDED) après lecture directe du package source — remplace le
 * modèle à 3 états (propose/retenu/ecarte) fabriqué en 7a faute de
 * source disponible à l'époque.
 */
export type StatutTestCandidate =
  'propose' | 'besoin_information' | 'besoin_revue' | 'accepte' | 'rejete' | 'doublon' | 'remplace'

/**
 * Une idée de test répondant à un `TestObjective`, avant d'être acceptée
 * comme `Test` formel. `statut`/`motif_rejet` tracent la décision humaine
 * — jamais une suppression silencieuse (cohérent avec le principe de
 * traçabilité déjà appliqué partout ailleurs dans ce projet).
 * `duplique_de_id`/`remplace_par_id` ne sont renseignés que pour les
 * statuts `doublon`/`remplace` respectivement.
 */
export interface TestCandidate {
  id: string
  client_id: string
  test_objective_id: string
  titre: string
  description: string
  statut: StatutTestCandidate
  motif_rejet: string | null
  duplique_de_id: string | null
  remplace_par_id: string | null
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

export interface EtapeTest {
  id: string
  ordre: number
  action: string
  resultat_attendu: string
}

/**
 * Le test formel, issu d'un `TestCandidate` retenu — `etapes[]` porte les
 * `TestStep` du package Target, embarqués (même pattern que
 * `Section.revisions[]`) plutôt qu'en table séparée : aucune source ne
 * démontre de besoin de les interroger indépendamment de leur `Test`.
 */
export interface Test {
  id: string
  client_id: string
  test_candidate_id: string
  titre: string
  description: string
  etapes: EtapeTest[]
  statut: 'brouillon' | 'approuve'
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * `Coverage` (package Target) — déclaration explicite qu'un `Test` couvre
 * une `Requirement`, distincte du lien `TestObjective.requirement_id` :
 * un `Test` approuvé peut couvrir, de façon démontrée, une exigence
 * au-delà de celle qui a motivé sa création (ex. un test IQ couvre aussi
 * une exigence d'intégrité des données constatée a posteriori). N:M —
 * jamais déduite automatiquement, toujours une déclaration explicite.
 */
export interface Couverture {
  id: string
  client_id: string
  requirement_id: string
  test_id: string
  created_at: string
}

/**
 * Phase 7b (`docs/convergence/PHASE_7B_EXECUTION_SPEC.md`) — instance
 * d'exécution d'un `Test` approuvé. Un même `Test` peut être exécuté
 * plusieurs fois (retest après échec, exécution sur plusieurs actifs) —
 * `asset_node_id` précise sur quel actif elle a eu lieu, optionnel.
 * `verdict` reste `null` tant que l'exécution n'est pas clôturée et n'est
 * **jamais** déduit automatiquement des `ExecutionStep` — garde-fou non
 * négociable (principe fondateur n°1), toujours une action humaine
 * explicite (`cloturerExecution`).
 */
export type StatutExecution = 'planifiee' | 'en_cours' | 'terminee'
export type VerdictExecution = 'conforme' | 'non_conforme' | 'conforme_avec_ecart'

export interface Execution {
  id: string
  client_id: string
  test_id: string
  asset_node_id: string | null
  executant: string
  statut: StatutExecution
  verdict: VerdictExecution | null
  date_debut: string
  date_fin: string | null
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Résultat constaté pour une `EtapeTest` précise (référencée par
 * `test_step_id`), dans le cadre d'une `Execution` donnée. Immutable une
 * fois créé (ALCOA+ : un enregistrement d'exécution est un fait daté, pas
 * un brouillon éditable) — une correction passe par un `ExecutionEvent`,
 * jamais par une réécriture.
 */
export type ResultatEtapeExecution = 'conforme' | 'non_conforme' | 'non_applicable'

export interface ExecutionStep {
  id: string
  client_id: string
  execution_id: string
  test_step_id: string
  resultat: ResultatEtapeExecution
  observation: string
  horodatage: string
}

/**
 * Zéro-à-plusieurs valeurs mesurées rattachées à un `ExecutionStep` — une
 * étape peut produire plusieurs mesures (ex. 3 points de température),
 * d'où une entité séparée plutôt qu'un champ unique sur `ExecutionStep`.
 * `valeur` reste en texte (pas de type numérique imposé) — même choix que
 * `Parameter`/`CPP` (Phase 2), rien dans les sources ne justifie un type
 * de valeur unique.
 */
export interface Measurement {
  id: string
  client_id: string
  execution_step_id: string
  libelle: string
  valeur: string
  unite: string | null
  horodatage: string
}

/**
 * Journal d'événements *pendant* une exécution — distinct du `QualityEvent`
 * (Phase 5), qui est l'objet de gestion qualité formel. `quality_event_id`
 * référence *optionnellement* un `QualityEvent` déjà existant, jamais créé
 * automatiquement (DEC-002 : aucun couplage bloquant/automatique entre
 * modules, déjà appliqué en Phase 5).
 *
 * **Réaligné (25/08/2026) sur le vrai modèle cible** (`10_TEST_ENGINE.md`,
 * `01_ARCHITECTURE_MASTER_FINAL.md` §29, DEC-056/057) après lecture directe
 * du package source (Google Drive reconnecté en cours de session) : un
 * résultat inattendu suit `ExecutionEvent → Assessment → Decision →
 * Continue/Action/Retest/Deviation/Change/Stop/External` — ce type reflète
 * cette décision, jamais un type libre inventé sans base. `commentaire` est
 * conservé en plus de ces 7 décisions pour une observation qui n'appelle
 * aucune décision (classe "Human : Observations/Manual entries",
 * `08_SOURCE_DOCUMENT_MULTIMODAL.md`).
 */
export type TypeExecutionEvent =
  | 'continuer'
  | 'action'
  | 'retest'
  | 'deviation'
  | 'changement'
  | 'arret'
  | 'externe'
  | 'commentaire'

export interface ExecutionEvent {
  id: string
  client_id: string
  execution_id: string
  type: TypeExecutionEvent
  description: string
  quality_event_id: string | null
  horodatage: string
  actor: string
}

/**
 * Phase 7c (`docs/convergence/PHASE_7C_EVIDENCE_SPEC.md`) — dernière
 * sous-étape de la Phase 7, dont l'Acceptance Criteria (traçabilité
 * Requirement→Test→Execution→Evidence démontrable) se clôt ici. Une
 * `Evidence` est toujours rattachée à une `Execution` réelle — jamais une
 * preuve orpheline — et optionnellement à un `ExecutionStep` précis.
 * `type: native` = l'observation directe de l'exécutant fait foi, sans
 * fichier source ; `type: document` renvoie à un fichier externe via
 * `EvidenceLocation`. Immutable une fois créée, même garde-fou de
 * post-clôture qu'`ExecutionStep`/`Measurement` (Phase 7b, ALCOA+).
 */
export type TypeEvidence = 'native' | 'document'

export interface Evidence {
  id: string
  client_id: string
  execution_id: string
  execution_step_id: string | null
  type: TypeEvidence
  titre: string
  description: string
  horodatage: string
  actor: string
}

/**
 * Pointeur déclaratif vers où réside un document de preuve — jamais le
 * contenu binaire lui-même (aucun stockage de fichier réel construit dans
 * cet incrément, cf. §5 de la spec). Cohérent avec l'architecture déjà
 * actée (SDS §3/§5bis) : dépôt Git dédié = source de vérité, Drive =
 * miroir. Ne peut exister que pour une `Evidence` de type `document`.
 */
export type SystemeEvidenceLocation = 'github' | 'drive' | 'externe'

export interface EvidenceLocation {
  id: string
  client_id: string
  evidence_id: string
  systeme: SystemeEvidenceLocation
  reference: string
}

/**
 * Lien N:M explicite Evidence↔Requirement, jamais déduit — même logique
 * que `Couverture` (7a) face à `TestObjective.requirement_id` : une
 * preuve peut substantier une exigence au-delà de la couverture générique
 * du test dont elle provient. La traçabilité Execution→Test→Requirement
 * existe déjà par les clés étrangères ; ce lien sert spécifiquement à
 * déclarer qu'une `Evidence` appuie une `Requirement` précise.
 */
export interface ProvenanceLink {
  id: string
  client_id: string
  evidence_id: string
  requirement_id: string
  created_at: string
}

/**
 * Phase 8a (`docs/convergence/PHASE_8A_SOURCE_INTELLIGENCE_SPEC.md`) —
 * document/image d'origine.
 *
 * **Réaligné (25/08/2026) sur le vrai modèle cible**
 * (`03_DOMAIN_DATA_MODEL.md`, domaine "Source Intelligence" :
 * `Source, SourceVersion, SourceLocation, Extraction, ExtractionItem`)
 * après lecture directe du package source (Google Drive reconnecté en
 * cours de session) : la chaîne complète est
 * `Source → SourceVersion → Extraction → ExtractionItem → KnowledgeItem`,
 * pas `Source → Extraction → KnowledgeItem` (version fabriquée en 8a
 * faute de source disponible à l'époque). `SourceLocation` est un pointeur
 * déclaratif séparé de `Source` — un même `Source` peut avoir plusieurs
 * localisations (ex. miroir Drive + référence externe) ; même limite
 * assumée qu'`EvidenceLocation` (7c) : aucun stockage de fichier binaire
 * réel construit dans ce périmètre.
 */
export type TypeSource = 'document' | 'image'

export interface Source {
  id: string
  client_id: string
  type: TypeSource
  titre: string
  created_at: string
}

export type SystemeLocalisationSource = 'github' | 'drive' | 'externe'

export interface SourceLocation {
  id: string
  client_id: string
  source_id: string
  systeme: SystemeLocalisationSource
  reference: string
}

/**
 * Une révision d'une `Source` (détection de révision, DEC — scénario
 * "source revision" de `11_USE_CASES_70_SCENARIOS.md`) — une `Extraction`
 * porte toujours sur une version précise, jamais sur la `Source`
 * directement (`Relationship Matrix` : `SourceVersion produces Extraction`).
 */
export interface SourceVersion {
  id: string
  client_id: string
  source_id: string
  numero_version: number
  created_at: string
}

/**
 * Une exécution d'extraction (OCR via le relais Phase 6, ou saisie
 * manuelle directe) sur une `SourceVersion` précise. Ne porte plus le
 * texte brut directement — celui-ci est désormais porté par
 * `ExtractionItem` (0..N par `Extraction`), cohérent avec
 * `Relationship Matrix` : `Extraction produces ExtractionItem 1:N`.
 */
export type MethodeExtraction = 'ocr_azure' | 'saisie_manuelle'

export interface Extraction {
  id: string
  client_id: string
  source_version_id: string
  methode: MethodeExtraction
  horodatage: string
}

/**
 * Fragment de texte brut granulaire produit par une `Extraction` —
 * immutable, la "preuve de premier niveau" (ce que `GAP.md` nomme
 * "Evidence" dans ce pipeline, pour éviter toute collision avec
 * l'`Evidence` de traçabilité Test/Execution, Phase 7c, qui est un
 * concept distinct).
 */
export interface ExtractionItem {
  id: string
  client_id: string
  extraction_id: string
  contenu: string
  position: number
}

/**
 * Interprétation structurée candidate d'un `ExtractionItem`. **Garde-fou
 * non négociable** : toujours créé au statut `a_valider` (NEEDS_REVIEW),
 * jamais `valide` à la création, quel que soit le contenu — cohérent
 * avec le principe fondateur n°1 et l'Acceptance Criteria de la Phase 8.
 * Aucun appel IA n'est fait par ce module : `valeur_interpretee` est
 * toujours fournie par l'appelant. `extraction_item_id` est une
 * simplification N:1 du N:M réel du modèle cible (un `KnowledgeItem`
 * pourrait en théorie être synthétisé de plusieurs `ExtractionItem`) —
 * limite assumée et documentée plutôt que fabriquée.
 */
export type StatutKnowledgeItem = 'a_valider' | 'valide' | 'rejete'

export interface KnowledgeItem {
  id: string
  client_id: string
  extraction_item_id: string
  libelle: string
  valeur_interpretee: string
  statut: StatutKnowledgeItem
  valide_par: string | null
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Enregistrement auditable et distinct de la validation/rejet d'un
 * `KnowledgeItem` (domaine "Knowledge" de `03_DOMAIN_DATA_MODEL.md` :
 * `KnowledgeItem, KnowledgeRelation, Conflict, Confirmation`) — plutôt
 * qu'une simple mutation de `KnowledgeItem.statut`/`valide_par` sans
 * trace dédiée. `KnowledgeItem.statut`/`valide_par` restent une copie
 * dénormalisée pratique (même pattern que `Test.statut` + `audit_log`
 * ailleurs dans ce projet) ; `Confirmation` est la source de vérité de
 * l'historique des décisions.
 */
export interface Confirmation {
  id: string
  client_id: string
  knowledge_item_id: string
  decision: 'confirme' | 'rejete'
  confirme_par: string
  horodatage: string
}

/**
 * Relation explicite entre deux `KnowledgeItem` qui ne se contredisent
 * pas (contrairement à `Conflict`) — ex. un `KnowledgeItem` qui précise
 * ou complète un autre. Jamais déduite automatiquement.
 */
export interface KnowledgeRelation {
  id: string
  client_id: string
  knowledge_item_source_id: string
  knowledge_item_cible_id: string
  type: string
  created_at: string
}

/**
 * Désaccord explicite entre deux `KnowledgeItem` — reste `ouvert` tant
 * qu'aucune résolution explicite n'est fournie, jamais auto-résolu.
 */
export type StatutConflict = 'ouvert' | 'resolu'

export interface Conflict {
  id: string
  client_id: string
  knowledge_item_source_id: string
  knowledge_item_cible_id: string
  description: string
  statut: StatutConflict
  resolution: string | null
  created_at: string
}

/**
 * Phase 9 (`docs/convergence/PHASE_9_CONTENT_PLAN_SPEC.md`) — planifie
 * quelles entrées (Method/Template, contexte d'actif/procédé) alimentent
 * un livrable, sans produire le contenu réglementaire lui-même. Ne couvre
 * que la première moitié du pipeline (`Request → Resolve → Context
 * Snapshot → Content Plan`) — `Generate → Render → Approve → Freeze`
 * (intégration avec `DefinitionGabarit`/`RenduGabarit.vue` et le cycle de
 * vie de `Section`) reste un chantier distinct, non engagé ici.
 * `context_snapshot` est figé une seule fois à la création et reste
 * immutable — même si le `MethodProfile` référencé évolue plus tard.
 * `method_profile_type` distingue la table réellement référencée, car il
 * n'existe pas de type `Method` générique unifiant `MethodProfileACFC`/
 * `MethodProfileImpactAssessment` (décision déjà actée en Phase 3).
 *
 * `readiness` (ajouté 25/08/2026, réalignement après lecture directe de
 * `01_ARCHITECTURE_MASTER_FINAL.md` §26 et `09_DELIVERABLE_ENGINE.md`) :
 * reflète si les **données** résolues sont suffisantes pour générer
 * (READY/NEEDS_INFORMATION/NEEDS_REVIEW/BLOCKED) — un concept distinct de
 * `statut`, qui reflète le cycle de vie de **validation du plan lui-même**
 * (brouillon/valide/gele). Fourni explicitement par l'appelant à la
 * création, jamais calculé automatiquement par ce module (pas de
 * mécanisme d'évaluation de complétude construit ici).
 */
export type StatutContentPlan = 'brouillon' | 'valide' | 'gele'
export type TypeMethodProfileReference = 'acfc' | 'impact_assessment'
export type ReadinessContentPlan = 'pret' | 'besoin_information' | 'besoin_revue' | 'bloque'

export interface ContentPlan {
  id: string
  client_id: string
  template_id: TemplateType
  asset_node_id: string | null
  process_id: string | null
  method_profile_id: string | null
  method_profile_type: TypeMethodProfileReference | null
  context_snapshot: string
  readiness: ReadinessContentPlan
  statut: StatutContentPlan
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Phase 10 (`docs/convergence/PHASE_10_INTEGRATION_GATEWAY_SPEC.md`) —
 * connecteur générique vers un système documentaire externe (domaine
 * "Integration" de `03_DOMAIN_DATA_MODEL.md` : `Connector, SyncJob,
 * ExternalReference`). `github`/`google_drive` sont les connecteurs de
 * stockage propres à ValidaPharm (source de vérité/miroir, déjà
 * existants), réutilisés ici en ADAPT (TD-005) comme deux premières
 * implémentations concrètes de l'interface générique — pas le cœur
 * métier de cette phase, qui vise les vrais connecteurs QMS/documentaires
 * tiers. `AssetNode.qms_connector_id` (Structure Système) référence
 * désormais un `Connector` de ce domaine.
 */
export type TypeConnector =
  'github' | 'google_drive' | 'veeva_vault' | 'sharepoint' | 'dossier_reseau' | 'edms_generique'

export interface ConfigConnectorGitHub {
  owner: string
  repo: string
  branche: string | null
  jeton: string
}

export interface ConfigConnectorGoogleDrive {
  dossierId: string
  jeton: string
}

/** Squelette basé sur le flux d'authentification réel et vérifié de l'API Veeva Vault (session ID via endpoint d'authentification, header `Authorization` ensuite) — non testé en conditions réelles, cf. spec §4. */
export interface ConfigConnectorVeevaVault {
  vaultDns: string
  nomUtilisateur: string
  motDePasse: string
}

/** Type reconnu et modélisé — adaptateur non implémenté (aucune source vérifiée disponible dans cette session, cf. spec §4). */
export interface ConfigConnectorSharePoint {
  siteUrl: string
  jeton: string
}

/** Type reconnu et modélisé — adaptateur non implémenté (aucun accès disque réseau natif possible depuis un navigateur sans relais serveur, aucun point d'accès concret fourni). */
export interface ConfigConnectorDossierReseau {
  chemin: string
}

/** Type reconnu et modélisé — adaptateur non implémenté (aucune source vérifiée disponible dans cette session). */
export interface ConfigConnectorEdmsGenerique {
  url: string
  jeton: string
}

export type ConfigConnector =
  | { type: 'github'; config: ConfigConnectorGitHub }
  | { type: 'google_drive'; config: ConfigConnectorGoogleDrive }
  | { type: 'veeva_vault'; config: ConfigConnectorVeevaVault }
  | { type: 'sharepoint'; config: ConfigConnectorSharePoint }
  | { type: 'dossier_reseau'; config: ConfigConnectorDossierReseau }
  | { type: 'edms_generique'; config: ConfigConnectorEdmsGenerique }

export type Connector = {
  id: string
  client_id: string
  nom: string
  actif: boolean
  created_at: string
} & ConfigConnector

/**
 * Une tentative de synchronisation via un `Connector`. **Garde-fou non
 * négociable** : `indisponible`/`echec` ne bloque jamais une activité
 * métier indépendante — cohérent avec DEC-002/055 déjà appliqué à
 * `QualityEvent` (Phase 5), étendu ici explicitement aux connecteurs
 * (`05_CONTRACTS_EVENTS.md` : `PENDING/UNAVAILABLE/RETRYING/FAILED`).
 */
export type StatutSyncJob =
  'en_attente' | 'indisponible' | 'nouvelle_tentative' | 'echec' | 'reussi'

export interface SyncJob {
  id: string
  client_id: string
  connector_id: string
  statut: StatutSyncJob
  tentative: number
  derniere_erreur: string | null
  created_at: string
  updated_at: string
}

/**
 * Pointeur vers un document/objet externe — jamais son contenu dupliqué
 * comme contenu officiel (même principe que `EvidenceLocation`/
 * `SourceLocation`, Phases 7c/8a).
 */
export interface ExternalReference {
  id: string
  client_id: string
  connector_id: string
  identifiant_externe: string
  libelle: string
  created_at: string
}

/**
 * Phase 11 (`docs/convergence/PHASE_11_ORGANIZATION_MIGRATION_SPEC.md`) —
 * remplace le modèle `Client` plat par une hiérarchie organisationnelle
 * réelle (`01_ARCHITECTURE_MASTER_FINAL.md` §3 : `Organization → Workspace
 * → Global/Corporate ou Site N → Facility → Area`, DEC-003/061).
 *
 * **Décision structurante** : `Organization.id` reprend exactement
 * l'`id` du `Client` migré — aucune des ~25 tables existantes (toutes
 * indexées par `client_id`) n'a besoin d'être modifiée dans cet
 * incrément, leur `client_id` référence désormais `Organization.id`
 * (même valeur). `Client` devient ainsi littéralement "un cas particulier
 * à un seul niveau d'Organization" (TD-006), sans Big Bang.
 */
export interface Organization {
  id: string
  nom: string
  created_at: string
}

/**
 * `Workspace` est un arbre auto-référencé (`parent_workspace_id`) plutôt
 * que des types rigides `Global`/`Site`/`Facility`/`Area` — cohérent avec
 * le principe déjà retenu pour `AssetHierarchySchema` ("Global et site ne
 * sont pas des modèles différents", aucune profondeur figée). Un seul
 * `Workspace` racine par `Organization`, de type `global`, créé par la
 * migration ; les `Workspace` enfants (`type: 'site'`) représentent un
 * site, une facility ou une area selon leur profondeur dans l'arbre.
 */
export type TypeWorkspace = 'global' | 'site'

export interface Workspace {
  id: string
  organization_id: string
  type: TypeWorkspace
  nom: string
  parent_workspace_id: string | null
  created_at: string
}

/**
 * Phase 13 (`docs/convergence/PHASE_13_MISSION_ACTIVITY_SPEC.md`) — domaine
 * "Work" de `03_DOMAIN_DATA_MODEL.md` (`Mission, Activity, Dependency,
 * WorkflowDefinition, WorkflowInstance, WorkflowStep, Approval`),
 * décision d'entrée TD-009 : `Mission`/`Activity` seulement,
 * `WorkflowDefinition`/`WorkflowInstance`/`Approval` différés sur besoin
 * réel démontré.
 *
 * Une `Mission` est un conteneur de travail contextualisé (§8 de
 * `01_ARCHITECTURE_MASTER_FINAL.md` : ex. workstreams CQV/CSV partageant
 * Context/Sources/Evidence/Risk/Traceability) — pas un moteur de
 * raisonnement en soi. `workspace_id` suit exactement le pattern déjà
 * établi sur `AssetNode` (`null` = hérité/non assigné, visible depuis tout
 * `Workspace` de l'organisation). `asset_node_id` est une ancre optionnelle
 * unique, même pattern que `QualityEvent.asset_node_id` — pas un lien
 * polymorphe générique vers "l'objet concerné".
 *
 * Référence directe `Requirement`/`Assessment`/`Test`/`Evidence`/
 * `Deliverable` volontairement **non construite** ici (voir spec §3,
 * NEEDS ADAPTATION) : ce rôle appartient à l'entité cible `Strategy`
 * (`Strategy derives_from Assessment`/`addresses Requirement`/
 * `plans Test`, contexte "mission"), qui n'existe pas encore comme entité
 * persistée (`strategie-qualification/grilleDecision.ts` reste une
 * fonction déterministe pure, jamais une table).
 */
export type StatutMission = 'ouverte' | 'en_cours' | 'cloturee'

export interface Mission {
  id: string
  client_id: string
  workspace_id: string | null
  asset_node_id: string | null
  titre: string
  description: string
  statut: StatutMission
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Relation N:M `Mission ↔ QualityEvent` (`04_RELATIONSHIP_MATRIX_FINAL.md` :
 * "Mission relates_to QualityEvent") — jointure explicite, même pattern que
 * `ReferenceQualityEvent`/`Couverture` : jamais un tableau d'IDs
 * dénormalisé sur `Mission` ou `QualityEvent`.
 */
export interface AssociationMissionQualityEvent {
  id: string
  client_id: string
  mission_id: string
  quality_event_id: string
  created_at: string
}

/**
 * Unité de travail à l'intérieur d'une `Mission` (relation 1:N
 * `Mission contains Activity`, `mission_id` toujours renseigné — une
 * `Activity` n'existe jamais hors d'une `Mission`).
 *
 * `Activity produces Evidence` (matrice cible) volontairement **non
 * construit** ici (voir spec §3, CONFLICT) : contredirait le garde-fou
 * non négociable déjà testé d'`Evidence` (Phase 7c — "jamais une preuve
 * orpheline", `execution_id` non nul). Résolution différée à un incrément
 * qui la traitera explicitement.
 */
export type StatutActivity = 'a_faire' | 'en_cours' | 'terminee' | 'bloquee'

export interface Activity {
  id: string
  client_id: string
  mission_id: string
  titre: string
  description: string
  statut: StatutActivity
  audit_log: EntreeJournalAudit[]
  created_at: string
  updated_at: string
}

/**
 * Relation N:M `Activity depends_on Activity` (`04_RELATIONSHIP_MATRIX_
 * FINAL.md`) — jointure explicite, même pattern que `Dependency` nommée
 * dans le domaine "Work" de `03_DOMAIN_DATA_MODEL.md`. Une dépendance
 * exprime seulement un ordre attendu, jamais un verrou bloquant (aucune
 * fonction de ce module n'empêche de démarrer/terminer une `Activity`
 * dont une dépendance n'est pas encore terminée — même discipline que
 * DEC-002/055 déjà appliquée à `QualityEvent`/`Connector`).
 */
export interface Dependency {
  id: string
  client_id: string
  activity_source_id: string
  activity_cible_id: string
  created_at: string
}

/**
 * Phase 14 (`docs/convergence/PHASE_14_CONTEXT_ENGINE_SPEC.md`) — domaine
 * "Context" de `03_DOMAIN_DATA_MODEL.md` (`ContextView, ContextSnapshot,
 * Applicability, Effectivity, Override`). Généralise la résolution
 * Scope+Applicability+Effectivity+Override (`resoudreRegleEffective`,
 * `ancetresWorkspace`, Phase 11/12), jusqu'ici câblée sur le seul store
 * Structure Système, en une entité réutilisable par toute `Mission`.
 *
 * **Immutable** (invariant #12 de `03_DOMAIN_DATA_MODEL.md` : "ContextSnapshot
 * is immutable") : aucune fonction de mise à jour n'est exposée par
 * `useContextEngineStore` — pas d'`audit_log`/`updated_at`, il n'y a rien à
 * journaliser après création. `workspace_id`/`asset_node_id` sont l'ancre
 * fournie à l'assemblage (au moins l'un des deux non nul en pratique, non
 * imposé au niveau du type pour rester cohérent avec le pattern déjà
 * utilisé sur `Mission`/`QualityEvent`).
 *
 * Résolution de "méthode applicable" et de "documents pertinents"
 * volontairement **non construite** ici (spec §2) : `MethodProfileACFC`/
 * `MethodProfileImpactAssessment` et `Source` n'ont aujourd'hui aucun
 * rattachement `Workspace`/`AssetNode` — les y ajouter sans cas réel
 * fabriquerait une résolution non éprouvée.
 */
export interface ContextSnapshot {
  id: string
  client_id: string
  workspace_id: string | null
  asset_node_id: string | null
  created_at: string
}

/**
 * Type d'objet référencé par un `ContextSnapshotItem` — fermé et
 * documenté mot pour mot (même discipline que `StatutKnowledgeItem`),
 * limité à ce qui est réellement résoluble aujourd'hui (spec §2) : pas de
 * `'method_profile'` ni `'source'` tant qu'aucun rattachement
 * `Workspace`/`AssetNode` n'existe sur ces entités.
 */
export type TypeObjetContexte = 'asset_node' | 'manufacturing_context' | 'quality_event'

/**
 * Jointure explicite et **polymorphe** réalisant "`ContextSnapshot`
 * includes Versioned Objects N:M" (`04_RELATIONSHIP_MATRIX_FINAL.md`) —
 * un seul type de jointure générique (discriminé par `type_objet`) plutôt
 * qu'une jointure dédiée par type cible, cohérent avec l'invariant #5
 * ("N:M relationships needing context/provenance are explicit objects")
 * et le pattern déjà utilisé pour `ExternalReference` (pointeur générique).
 */
export interface ContextSnapshotItem {
  id: string
  client_id: string
  context_snapshot_id: string
  type_objet: TypeObjetContexte
  objet_id: string
}

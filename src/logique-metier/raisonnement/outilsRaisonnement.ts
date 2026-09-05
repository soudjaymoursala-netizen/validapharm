import { chaineTechniqueDepuis } from '../architecture-technique/chaineTechnique'
import { relationsConnaissanceDepuis } from '../graphe/relationsConnaissance'
import type {
  AssetNode,
  Couverture,
  Evidence,
  Execution,
  KnowledgeItem,
  KnowledgeRelation,
  Procedure,
  ProcedureStep,
  RelationTechnique,
  Requirement,
  Test,
} from '../domaine/types'
import type { DefinitionOutilRaisonnement } from './protocoleRaisonnement'

/**
 * Outils de lecture du moteur de raisonnement (spec §3) —
 * fonctions pures opérant sur des données déjà chargées par l'appelant
 * (`useReasoningEngineStore`), jamais d'accès direct à la base, même
 * discipline que `assemblerElementsContextSnapshot`.
 *
 * `Risk`/`Hazard`/`Control` (domaine Quality cible) volontairement
 * absents : non construits dans ce projet à ce jour.
 *
 * `assetNodes`/`relationsTechniques` : outillent la
 * traversée de l'Architecture Technique (Equipment→PLC→SCADA→Server).
 *
 * `procedures`/`procedureSteps` : outillent la
 * lecture d'une procédure structurée par un humain (cerveau procédural).
 *
 * `knowledgeRelations` : second consommateur réel du
 * parcours générique `parcourirGraphe` (Knowledge Graph), aux côtés de
 * `relationsTechniques`.
 */
export interface DonneesOutilsRaisonnement {
  requirements: readonly Requirement[]
  couvertures: readonly Couverture[]
  tests: readonly Test[]
  executions: readonly Execution[]
  evidences: readonly Evidence[]
  knowledgeItems: readonly KnowledgeItem[]
  assetNodes: readonly AssetNode[]
  relationsTechniques: readonly RelationTechnique[]
  procedures: readonly Procedure[]
  procedureSteps: readonly ProcedureStep[]
  knowledgeRelations: readonly KnowledgeRelation[]
}

export const CATALOGUE_OUTILS_RAISONNEMENT: readonly DefinitionOutilRaisonnement[] = [
  {
    nom: 'lister_requirements_pour_actif',
    description: 'Liste les Requirement rattachés à un AssetNode donné. Paramètre : asset_node_id.',
  },
  {
    nom: 'lister_tests_pour_requirement',
    description:
      'Liste les Test couvrant un Requirement donné (via Couverture). Paramètre : requirement_id.',
  },
  {
    nom: 'lister_evidence_pour_test',
    description:
      "Liste l'Evidence produite par les Execution d'un Test donné. Paramètre : test_id.",
  },
  {
    nom: 'lister_knowledge_items_valides',
    description: 'Liste les KnowledgeItem au statut validé. Aucun paramètre.',
  },
  {
    nom: 'tracer_chaine_technique',
    description:
      'Trace la chaîne de relations techniques sortantes depuis un AssetNode (ex. Equipment contrôlé par un PLC, connecté à un SCADA, hébergé sur un serveur). Paramètre : asset_node_id.',
  },
  {
    nom: 'lister_etapes_procedure',
    description:
      "Liste les étapes de la version la plus récente d'une procédure (SOP/WI), dans l'ordre. Paramètre : reference.",
  },
  {
    nom: 'tracer_relations_connaissance',
    description:
      'Trace la chaîne de relations sortantes entre KnowledgeItem depuis un fait donné (ex. un fait qui en précise ou en complète un autre). Paramètre : knowledge_item_id.',
  },
]

export function listerRequirementsPourActif(
  assetNodeId: string,
  donnees: DonneesOutilsRaisonnement,
): Requirement[] {
  return donnees.requirements.filter((r) => r.asset_node_id === assetNodeId)
}

export function listerTestsPourRequirement(
  requirementId: string,
  donnees: DonneesOutilsRaisonnement,
): Test[] {
  const testIds = new Set(
    donnees.couvertures.filter((c) => c.requirement_id === requirementId).map((c) => c.test_id),
  )
  return donnees.tests.filter((t) => testIds.has(t.id))
}

export function listerEvidencePourTest(
  testId: string,
  donnees: DonneesOutilsRaisonnement,
): Evidence[] {
  const executionIds = new Set(
    donnees.executions.filter((e) => e.test_id === testId).map((e) => e.id),
  )
  return donnees.evidences.filter((ev) => executionIds.has(ev.execution_id))
}

export function listerKnowledgeItemsValides(donnees: DonneesOutilsRaisonnement): KnowledgeItem[] {
  return donnees.knowledgeItems.filter((k) => k.statut === 'valide')
}

export function tracerChaineTechnique(
  assetNodeId: string,
  donnees: DonneesOutilsRaisonnement,
): Array<{ noeud: AssetNode; typeRelation: string }> {
  return chaineTechniqueDepuis(assetNodeId, donnees.relationsTechniques, donnees.assetNodes).map(
    (etape) => ({ noeud: etape.noeud, typeRelation: etape.relation.type_relation }),
  )
}

/**
 * Résout la version la plus récente d'une `reference` (numéro le plus
 * élevé) puis retourne ses étapes dans l'ordre — jamais une version
 * arbitraire, même discipline que `useProcedureStore.derniereVersion`.
 */
export function listerEtapesProcedure(
  reference: string,
  donnees: DonneesOutilsRaisonnement,
): ProcedureStep[] {
  const versions = donnees.procedures.filter((p) => p.reference === reference)
  if (versions.length === 0) return []
  const derniere = versions.reduce((plusRecente, p) =>
    p.numero_version > plusRecente.numero_version ? p : plusRecente,
  )
  return donnees.procedureSteps
    .filter((e) => e.procedure_id === derniere.id)
    .sort((a, b) => a.ordre - b.ordre)
}

export function tracerRelationsConnaissance(
  knowledgeItemId: string,
  donnees: DonneesOutilsRaisonnement,
): Array<{ item: KnowledgeItem; typeRelation: string }> {
  return relationsConnaissanceDepuis(
    knowledgeItemId,
    donnees.knowledgeRelations,
    donnees.knowledgeItems,
  ).map((etape) => ({ item: etape.item, typeRelation: etape.relation.type }))
}

export interface ResultatExecutionOutil {
  /** Résumé textuel lisible par le modèle (transmis dans le transcript). */
  resultat: string
  /** Ids réellement retournés — sert à la vérification de citation déterministe (spec §4). */
  idsObtenus: string[]
}

/**
 * Exécute un outil nommé par le protocole textuel (spec §2). Un nom
 * d'outil inconnu ou des paramètres manquants ne lèvent jamais
 * d'exception — retourne un résultat explicite décrivant l'échec, que le
 * modèle peut lire et corriger au tour suivant (dégradation gracieuse).
 */
export function executerOutil(
  appel: { nom: string; parametres: Record<string, string> },
  donnees: DonneesOutilsRaisonnement,
): ResultatExecutionOutil {
  switch (appel.nom) {
    case 'lister_requirements_pour_actif': {
      const assetNodeId = appel.parametres.asset_node_id
      if (!assetNodeId) return { resultat: 'Paramètre asset_node_id manquant.', idsObtenus: [] }
      const resultats = listerRequirementsPourActif(assetNodeId, donnees)
      return formaterResultat(
        resultats.map((r) => ({ id: r.id, libelle: `${r.reference} — ${r.titre}` })),
      )
    }
    case 'lister_tests_pour_requirement': {
      const requirementId = appel.parametres.requirement_id
      if (!requirementId) return { resultat: 'Paramètre requirement_id manquant.', idsObtenus: [] }
      const resultats = listerTestsPourRequirement(requirementId, donnees)
      return formaterResultat(resultats.map((t) => ({ id: t.id, libelle: t.titre })))
    }
    case 'lister_evidence_pour_test': {
      const testId = appel.parametres.test_id
      if (!testId) return { resultat: 'Paramètre test_id manquant.', idsObtenus: [] }
      const resultats = listerEvidencePourTest(testId, donnees)
      return formaterResultat(resultats.map((e) => ({ id: e.id, libelle: e.titre })))
    }
    case 'lister_knowledge_items_valides': {
      const resultats = listerKnowledgeItemsValides(donnees)
      return formaterResultat(resultats.map((k) => ({ id: k.id, libelle: k.libelle })))
    }
    case 'tracer_chaine_technique': {
      const assetNodeId = appel.parametres.asset_node_id
      if (!assetNodeId) return { resultat: 'Paramètre asset_node_id manquant.', idsObtenus: [] }
      const resultats = tracerChaineTechnique(assetNodeId, donnees)
      return formaterResultat(
        resultats.map((r) => ({ id: r.noeud.id, libelle: `${r.noeud.name} (${r.typeRelation})` })),
      )
    }
    case 'lister_etapes_procedure': {
      const reference = appel.parametres.reference
      if (!reference) return { resultat: 'Paramètre reference manquant.', idsObtenus: [] }
      const resultats = listerEtapesProcedure(reference, donnees)
      return formaterResultat(
        resultats.map((e) => ({
          id: e.id,
          libelle: `${e.ordre}. ${e.description}${e.obligatoire ? '' : ' (optionnelle)'}`,
        })),
      )
    }
    case 'tracer_relations_connaissance': {
      const knowledgeItemId = appel.parametres.knowledge_item_id
      if (!knowledgeItemId)
        return { resultat: 'Paramètre knowledge_item_id manquant.', idsObtenus: [] }
      const resultats = tracerRelationsConnaissance(knowledgeItemId, donnees)
      return formaterResultat(
        resultats.map((r) => ({
          id: r.item.id,
          libelle: `${r.item.libelle} (${r.typeRelation})`,
        })),
      )
    }
    default:
      return { resultat: `Outil inconnu : ${appel.nom}.`, idsObtenus: [] }
  }
}

function formaterResultat(
  elements: Array<{ id: string; libelle: string }>,
): ResultatExecutionOutil {
  if (elements.length === 0) return { resultat: 'Aucun résultat.', idsObtenus: [] }
  return {
    resultat: elements.map((e) => `- [${e.id}] ${e.libelle}`).join('\n'),
    idsObtenus: elements.map((e) => e.id),
  }
}

<script setup lang="ts">
// Éditeur de section. Rédaction guidée par le moteur de gabarits
// déclaratif (tâche #12) quand une définition existe pour le
// template_type de la section ; repli sur un champ de contenu générique
// sinon (gabarits pas encore définis dans le catalogue — voir
// logique-metier/gabarits/catalogue/index.ts). Transitions de statut avec
// garde-fous fidèles, sauvegarde automatique.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { extraireTexteDocx } from '../../connecteurs/office/DocxNatifAdapter'
import { GabaritDocxInvalideError } from '../../connecteurs/office/erreurs'
import { genererDocxPersonnalise } from '../../connecteurs/office/GenerationDocxAdapter'
import { genererDocxParDefaut } from '../../connecteurs/office/genererDocxParDefaut'
import { extraireTextePdf } from '../../connecteurs/pdf/PdfNatifAdapter'
import type {
  EtatConfianceIA,
  Project,
  ProjectDocument,
  Section,
} from '../../logique-metier/domaine/types'
import { construireDonneesExportGabarit } from '../../logique-metier/export/donneesExportGabarit'
import { genererExportCSV } from '../../logique-metier/export/genererExportCSV'
import { genererExportJSON } from '../../logique-metier/export/genererExportJSON'
import { nomFichierExport, recapitulatifWorkflow } from '../../logique-metier/export/valeursExport'
import { aLienVersTypeSection } from '../../logique-metier/detection-liens/aLienVersTypeSection'
import { liensRequis } from '../../logique-metier/machine-etats/gardesFinalisation'
import { verifierBlocageExport } from '../../logique-metier/export/verifierBlocageExport'
import { obtenirDefinitionGabarit } from '../../logique-metier/gabarits/catalogue'
import type { ChampTableauDynamique } from '../../logique-metier/gabarits/definitionGabarit'
import {
  detecterFormulationsFaiblesSection,
  type FormulationFaibleParChamp,
} from '../../logique-metier/qualite-redaction/detecterFormulationsFaibles'
import { construireObjectifAssistantSection } from '../../logique-metier/raisonnement/assistantSection'
import PastilleStatutSection from '../composants/PastilleStatutSection.vue'
import RenduGabarit from '../composants/RenduGabarit.vue'
import { identifiantActeurCourant } from '../identite/identiteLocale'
import { peutModifierSection } from '../../logique-metier/permissions/permissionsProjet'
import { useAuthStore } from '../stores/useAuthStore'
import { messageSysteme, type CodeMessageSysteme } from '../i18n/messages'
import { adaptateurAvecBascule, construireAdaptateursIA } from '../stores/construireAdaptateursIA'
import { LIBELLES_GABARIT } from '../i18n/libellesGabarit'
import { useClientConfigStore } from '../stores/useClientConfigStore'
import { useConnexionRelaisIAStore } from '../stores/useConnexionRelaisIAStore'
import { useGabaritExportStore } from '../stores/useGabaritExportStore'
import { useNormativeDocumentsStore } from '../stores/useNormativeDocumentsStore'
import { libelleFournisseurAffiche } from '../stores/usePanneauChatStore'
import { useProcedureStore } from '../stores/useProcedureStore'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useReasoningEngineStore } from '../stores/useReasoningEngineStore'
import ModaleSignature from '../composants/ModaleSignature.vue'
import {
  ACTION_RETOUR_REDACTION,
  avisDuCycleCourant,
  estEnCycleDeRelecture,
  useSectionsStore,
  type ResultatActionSection,
} from '../stores/useSectionsStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'

const props = defineProps<{ projectId: string; sectionId: string }>()

const route = useRoute()
const sectionsStore = useSectionsStore()
const projetsStore = useProjectsStore()
const gabaritExportStore = useGabaritExportStore()
const configStore = useClientConfigStore()
const relaisStore = useConnexionRelaisIAStore()
const reasoningStore = useReasoningEngineStore()
const normativeDocumentsStore = useNormativeDocumentsStore()
const procedureStore = useProcedureStore()
const structureStore = useStructureSystemeStore()
const section = ref<Section | undefined>(undefined)
const projet = ref<Project | undefined>(undefined)
const authStore = useAuthStore()
// Faux tant que la section et son projet ne sont pas chargés : jamais un
// bandeau « lecture seule » affiché à tort pendant le chargement (le Worker
// reste de toute façon le seul juge du droit d'écriture).
const lectureSeule = computed(() =>
  section.value && projet.value
    ? !peutModifierSection(projet.value, identifiantActeurCourant(), authStore.estAdmin)
    : false,
)
// Un projet appartient à un client : la barre latérale doit proposer les
// outils de CE client, jamais ceux du client visité précédemment.
watch(
  () => projet.value?.client_id,
  (clientId) => {
    if (clientId) useClientActifStore().definirClientActif(clientId)
  },
)
const gabaritSelectionneId = ref<string>('')
const nomNouveauGabarit = ref('')
const erreurGabaritExport = ref<string | null>(null)
const contenu = ref('')
const motifRejet = ref('')
const motifForcage = ref('')
const nouvelApprobateur = ref('')
const nouvelAvisRelecteurTexte = ref('')
/** Refus du serveur ou saisie incomplète sur le workflow — toujours affiché, jamais un clic sans effet. */
const erreurWorkflow = ref<string | null>(null)
/** Indicateur de sauvegarde automatique (audit UX du 26/09/2026 : rien n'indiquait si le travail était enregistré). */
const etatSauvegarde = ref<'inactif' | 'en_cours' | 'enregistre' | 'erreur'>('inactif')
const heureSauvegarde = ref<string | null>(null)
const erreurSauvegarde = ref<string | null>(null)

async function sauvegarder(ecriture: () => Promise<void>): Promise<void> {
  etatSauvegarde.value = 'en_cours'
  try {
    await ecriture()
    etatSauvegarde.value = 'enregistre'
    heureSauvegarde.value = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    erreurSauvegarde.value = null
  } catch (e) {
    etatSauvegarde.value = 'erreur'
    erreurSauvegarde.value = e instanceof Error ? e.message : "Échec de l'enregistrement."
  }
}

/** Exécute une action de workflow, affiche son refus éventuel en clair, puis recharge. */
async function actionWorkflow(action: () => Promise<void>): Promise<void> {
  erreurWorkflow.value = null
  try {
    await action()
  } catch (e) {
    erreurWorkflow.value = e instanceof Error ? e.message : "L'action n'a pas pu être enregistrée."
  }
  await recharger()
}

const emailCourant = computed(() => authStore.utilisateur?.email ?? '')
/** Seul l'approbateur désigné (ou un admin) peut approuver — même règle que le Worker. */
const peutApprouver = computed(
  () =>
    authStore.estAdmin ||
    (section.value?.workflow.approver_final ?? '').trim().toLowerCase() ===
      emailCourant.value.toLowerCase(),
)
const avisCycleCourant = computed(
  () => new Set(section.value ? avisDuCycleCourant(section.value) : []),
)
function dateLisible(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}
/**
 * Étapes du cycle de vie, affichées en tête de l'éditeur (audit UX du
 * 25/09/2026, constat 11 : le statut n'était qu'une ligne de texte grise,
 * sans étapes ni action suivante).
 */
const ETAPES_CYCLE = [
  { statuts: ['brouillon_aide', 'propose_par_ia_non_valide'], libelle: 'Rédaction' },
  { statuts: ['en_verification'], libelle: 'Vérification' },
  { statuts: ['en_approbation'], libelle: 'Approbation' },
  { statuts: ['valide_en_interne'], libelle: 'Validée en interne' },
] as const
const indexEtapeCourante = computed(() =>
  ETAPES_CYCLE.findIndex((e) =>
    (e.statuts as readonly string[]).includes(section.value?.status ?? ''),
  ),
)
const PROCHAINE_ETAPE: Record<Section['status'], string> = {
  brouillon_aide:
    'Rédigez le contenu, désignez l’approbateur final, puis engagez le cycle de vérification.',
  propose_par_ia_non_valide:
    'Relisez chaque partie proposée par l’IA, cochez-la, puis validez la section.',
  en_verification:
    'Les relecteurs donnent leur avis, puis la section est transmise à l’approbation (ou renvoyée en rédaction).',
  en_approbation:
    'L’approbateur final approuve (signature par mot de passe) ou renvoie en rédaction.',
  valide_en_interne: 'Section validée et verrouillée : les exports restent disponibles.',
}
const enCycleDeRelecture = computed(() =>
  section.value ? estEnCycleDeRelecture(section.value) : false,
)
/** Dernier retour automatique en rédaction (contenu modifié pendant le cycle), s'il est l'événement de cycle le plus récent. */
const retourAutomatique = computed(() => {
  if (section.value?.status !== 'brouillon_aide') return null
  const entrees = section.value.audit_log
  for (let i = entrees.length - 1; i >= 0; i--) {
    const entree = entrees[i]
    if (!entree) continue
    if (entree.action.startsWith(ACTION_RETOUR_REDACTION)) return entree
    if (entree.action.startsWith('rejet') || entree.action.startsWith('changement_statut')) {
      return null
    }
  }
  return null
})
const recapitulatif = computed(() =>
  section.value ? recapitulatifWorkflow(section.value) : undefined,
)

/**
 * L'IA est utilisable si le relais du serveur est configuré, ou si le
 * fournisseur choisi est local (constat 24 : l'utilisateur ne l'apprenait
 * qu'après avoir tout rempli).
 */
const iaDisponible = computed(
  () =>
    configStore.config?.ai_provider === 'local' || relaisStore.accesRelais().relayUrl !== undefined,
)
const panneauIAOuvert = ref(route.query.demarrage === 'adaptation')

const sectionCibleLienId = ref('')
const procedureLienId = ref('')
const noeudLienId = ref('')
const dernierResultat = ref<ResultatActionSection | undefined>(undefined)
const erreurLienSection = ref<string | null>(null)
const chargementInitial = ref(true)
let minuteurSauvegarde: ReturnType<typeof setTimeout> | undefined
let rechargementEnCours = false

// Génération de brouillon par adaptation (§4.1bis).
const modeReference = ref<'coller' | 'uploader'>('coller')
const texteDocumentReference = ref('')
const nomDocumentReference = ref('')
const contexteNouveauCas = ref('')
const confirmationDroitUsage = ref(false)
const enExtractionReference = ref(false)
const erreurExtractionReference = ref<string | null>(null)
const enGeneration = ref(false)
const erreurGeneration = ref<string | null>(null)
const documentReferenceUtilise = ref<ProjectDocument | undefined>(undefined)
/**
 * "Jamais de validation globale en un clic" — chaque section
 * du gabarit (au sens `DefinitionSection`, pas l'objet `Section` lui-même)
 * doit être explicitement relue avant que le bouton de validation ne
 * s'active. Volontairement non persisté : recharger la page en cours de
 * revue doit forcer une nouvelle relecture complète, jamais réutiliser
 * silencieusement une confirmation d'une visite précédente.
 */
const sousSectionsRevues = ref<Set<string>>(new Set())

// Assistant contextuel par section (Option 1) —
// délègue au Reasoning Engine déjà construit, jamais un second
// moteur : seul l'objectif envoyé change (contenu de la section injecté
// comme contexte, voir `construireObjectifAssistantSection`). Historique
// volontairement local à cet écran (non rechargé depuis le store) — même
// discipline que `sousSectionsRevues` : une nouvelle visite démarre une
// conversation neuve, `AIRequest`/`AIResponse` restent la trace durable.
const questionAssistant = ref('')
const assistantEnCours = ref(false)
const erreurAssistant = ref<string | null>(null)
interface EchangeAssistant {
  question: string
  reponse: string
  etatConfiance: EtatConfianceIA
}
const historiqueAssistant = ref<EchangeAssistant[]>([])
const LIBELLES_CONFIANCE_ASSISTANT: Record<EtatConfianceIA, string> = {
  connu: 'Connu (vérifié)',
  infere: 'Inféré',
  inconnu: 'Inconnu',
  conflit: 'Conflit',
  a_verifier: 'À vérifier',
}

const definitionGabarit = computed(() =>
  section.value ? obtenirDefinitionGabarit(section.value.template_type) : undefined,
)

const toutesLesSousSectionsRevues = computed(() =>
  definitionGabarit.value
    ? definitionGabarit.value.sections.every((s) => sousSectionsRevues.value.has(s.section_key))
    : true,
)

const nomFournisseurActuel = computed(() =>
  libelleFournisseurAffiche(configStore.config?.ai_provider ?? 'openai'),
)

/**
 * Revue de style (inspirée de l'outil "Strong Editor") — signal purement
 * informatif, jamais un verdict de conformité ni un blocage : le rédacteur
 * reste seul juge de la reformulation. Balaie soit les champs du gabarit
 * (values/tables), soit le champ de contenu générique en repli.
 */
const revueDeStyle = computed<FormulationFaibleParChamp[]>(() => {
  if (!section.value) return []
  if (definitionGabarit.value) {
    return detecterFormulationsFaiblesSection(section.value.values, section.value.tables)
  }
  return detecterFormulationsFaiblesSection({ contenu: contenu.value }, {})
})

const nombreFormulationsFaibles = computed(() =>
  revueDeStyle.value.reduce((total, champ) => total + champ.formulations.length, 0),
)

async function recharger(): Promise<void> {
  await sectionsStore.chargerSectionsDuProjet(props.projectId)
  const trouvee = (sectionsStore.sectionsParProjet[props.projectId] ?? []).find(
    (s) => s.id === props.sectionId,
  )
  section.value = trouvee
  // Réassignation programmatique, jamais une frappe utilisateur — le
  // `watch(contenu, ...)` ci-dessous ne doit surtout pas la réinterpréter
  // comme une modification à sauvegarder (bug réel trouvé le 13/09/2026 :
  // une valeur rechargée depuis un autre onglet planifiait une écriture
  // `mettreAJourValeurs` 400ms plus tard, ajoutant une entrée d'audit
  // "modification" fantôme et pouvant écraser une modification concurrente
  // plus récente par cette copie locale obsolète).
  rechargementEnCours = true
  contenu.value = typeof trouvee?.values.contenu === 'string' ? trouvee.values.contenu : ''
  await nextTick()
  rechargementEnCours = false

  if (trouvee?.generation_source.source_document_id) {
    documentReferenceUtilise.value = await sectionsStore.obtenirDocumentReference(
      trouvee.generation_source.source_document_id,
    )
  } else {
    documentReferenceUtilise.value = undefined
  }
}

/**
 * Autres sections du projet, hors la section courante — c'est le vivier
 * dans lequel piocher une cible de lien.
 */
const autresSectionsDuProjet = computed(() =>
  (sectionsStore.sectionsParProjet[props.projectId] ?? []).filter((s) => s.id !== props.sectionId),
)

/**
 * Sections déjà liées à la section courante (`project.links[]`, non
 * dirigé — l'un ou l'autre sens compte) — pour affichage et retrait.
 */
const sectionsLiees = computed(() => {
  if (!projet.value) return []
  const idsLies = new Set(
    projet.value.links
      .filter((l) => l.from_section_id === props.sectionId || l.to_section_id === props.sectionId)
      .map((l) => (l.from_section_id === props.sectionId ? l.to_section_id : l.from_section_id)),
  )
  return autresSectionsDuProjet.value.filter((s) => idsLies.has(s.id))
})

const sectionsLiablesRestantes = computed(() => {
  const idsDejaLies = new Set(sectionsLiees.value.map((s) => s.id))
  return autresSectionsDuProjet.value.filter((s) => !idsDejaLies.has(s.id))
})

/**
 * Crée un lien entre la section courante et la section choisie
 * (`sectionCibleLienId`) — seule voie légitime de satisfaire les
 * garde-fous de finalisation U-01/U-02/U-03 sans passer par « Forcer »
 * (trouvé manquant en simulant un vrai parcours de qualification de bout
 * en bout : aucune interface ne permettait de créer ce lien).
 */
async function lierSectionSelectionnee(): Promise<void> {
  if (!sectionCibleLienId.value) return
  erreurLienSection.value = null
  try {
    await projetsStore.ajouterLien(props.projectId, props.sectionId, sectionCibleLienId.value)
    projet.value = await projetsStore.obtenirProjet(props.projectId)
    sectionCibleLienId.value = ''
  } catch (e) {
    erreurLienSection.value =
      e instanceof Error ? e.message : 'Erreur inconnue lors de la création du lien.'
  }
}

/**
 * Prérequis de liaison (garde-fous U-01 à U-03), affichés dès le brouillon
 * avec une action directe pour chacun (constat 12) : lier une section
 * existante du bon type, ou la créer et la lier en un clic.
 */
const prerequis = computed(() => {
  if (!section.value || !projet.value) return []
  const sectionsDuProjet = sectionsStore.sectionsParProjet[props.projectId] ?? []
  return liensRequis(section.value.template_type).map((lien) => ({
    ...lien,
    satisfait: aLienVersTypeSection(
      props.sectionId,
      lien.typeCible,
      projet.value?.links ?? [],
      sectionsDuProjet,
    ),
    candidates: sectionsLiablesRestantes.value.filter((s) => s.template_type === lien.typeCible),
  }))
})
const prerequisSelection = ref<Record<string, string>>({})
const sectionCreeeId = ref<string | null>(null)
const prerequisEnCours = ref(false)

async function lierPrerequis(typeCible: string): Promise<void> {
  const cible = prerequisSelection.value[typeCible]
  if (!cible) return
  sectionCibleLienId.value = cible
  await lierSectionSelectionnee()
  prerequisSelection.value = { ...prerequisSelection.value, [typeCible]: '' }
}

async function creerEtLierPrerequis(typeCible: Section['template_type']): Promise<void> {
  if (!projet.value || prerequisEnCours.value) return
  erreurLienSection.value = null
  prerequisEnCours.value = true
  try {
    const creee = await sectionsStore.creerSection({
      project_id: props.projectId,
      template_type: typeCible,
      language: projet.value.language_default,
      titre: `${LIBELLES_GABARIT[typeCible]} — ${projet.value.name}`,
      owner_id: projetsStore.identiteCourante,
    })
    await projetsStore.ajouterLien(props.projectId, props.sectionId, creee.id)
    projet.value = await projetsStore.obtenirProjet(props.projectId)
    sectionCreeeId.value = creee.id
  } catch (e) {
    erreurLienSection.value =
      e instanceof Error ? e.message : 'La section n’a pas pu être créée et liée.'
  } finally {
    prerequisEnCours.value = false
  }
}

async function delierSection(autreSectionId: string): Promise<void> {
  erreurLienSection.value = null
  try {
    await projetsStore.retirerLien(props.projectId, props.sectionId, autreSectionId)
    projet.value = await projetsStore.obtenirProjet(props.projectId)
  } catch (e) {
    erreurLienSection.value =
      e instanceof Error ? e.message : 'Erreur inconnue lors du retrait du lien.'
  }
}

/**
 * Liens structurels réels Section↔Procedure / Section↔AssetNode (tâche
 * #118) — jusqu'ici renseignés uniquement par l'assistant guidé de
 * création de livrable, sans possibilité de les poser ensuite ou pour une
 * section créée hors de ce parcours. Édition manuelle uniquement (mêmes
 * champs, mêmes valeurs) : jamais de lien déduit automatiquement.
 */
const procedureLiee = computed(() =>
  section.value?.procedure_id
    ? (procedureStore.procedures.find((p) => p.id === section.value?.procedure_id) ?? null)
    : null,
)
const noeudLie = computed(() =>
  section.value?.asset_node_id
    ? (structureStore.noeuds.find((n) => n.id === section.value?.asset_node_id) ?? null)
    : null,
)

async function lierProcedureSelectionnee(): Promise<void> {
  if (!procedureLienId.value) return
  await sectionsStore.lierProcedure(props.sectionId, procedureLienId.value)
  procedureLienId.value = ''
  await recharger()
}
async function delierProcedure(): Promise<void> {
  await sectionsStore.lierProcedure(props.sectionId, null)
  await recharger()
}
async function lierAssetNodeSelectionne(): Promise<void> {
  if (!noeudLienId.value) return
  await sectionsStore.lierAssetNode(props.sectionId, noeudLienId.value)
  noeudLienId.value = ''
  await recharger()
}
async function delierAssetNode(): Promise<void> {
  await sectionsStore.lierAssetNode(props.sectionId, null)
  await recharger()
}

onMounted(async () => {
  try {
    await recharger()
    projet.value = await projetsStore.obtenirProjet(props.projectId)
    if (projet.value?.client_id) {
      await gabaritExportStore.charger(projet.value.client_id)
      await configStore.charger(projet.value.client_id)
      await relaisStore.charger()
      await reasoningStore.charger(projet.value.client_id)
      await normativeDocumentsStore.charger()
      await procedureStore.charger(projet.value.client_id)
      await structureStore.charger(projet.value.client_id)
    }
    // Arrivée depuis "À partir d'un document" (Fiche Projet) — porte
    // directement l'attention sur le panneau §4.1bis déjà construit,
    // jamais un nouveau mécanisme : simple confort de découverte.
    if (route.query.demarrage === 'adaptation') {
      modeReference.value = 'uploader'
      await nextTick()
      document
        .querySelector('.generation-brouillon')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } finally {
    chargementInitial.value = false
  }
})

// Sauvegarde automatique locale, debounce court — uniquement
// pour le repli générique (pas de gabarit défini pour ce template_type) ;
// RenduGabarit gère son propre debounce par champ pour un gabarit défini.
watch(contenu, (valeur) => {
  if (definitionGabarit.value) return
  if (rechargementEnCours) return
  if (minuteurSauvegarde) clearTimeout(minuteurSauvegarde)
  minuteurSauvegarde = setTimeout(() => {
    void sauvegarder(() => sectionsStore.mettreAJourValeurs(props.sectionId, { contenu: valeur }))
  }, 400)
})

async function majValeursGabarit(valeurs: Record<string, string | number | null>): Promise<void> {
  // `valeurs` est déjà l'instantané complet et à jour calculé par
  // RenduGabarit — jamais refusionné ici avec `section.value.values`, qui
  // pourrait être en retard d'un aller-retour de sauvegarde (course
  // trouvée en navigateur entre deux champs modifiés rapidement).
  await sauvegarder(() => sectionsStore.mettreAJourValeurs(props.sectionId, valeurs))
  await recharger()
}

const referenceSaisie = ref('')
const versionSaisie = ref('')
watch(
  () => [section.value?.meta.ref, section.value?.meta.version],
  () => {
    referenceSaisie.value = section.value?.meta.ref ?? ''
    versionSaisie.value = section.value?.meta.version ?? ''
  },
  { immediate: true },
)

/** Référence et version du livrable (constat 8 : « Référence : — » dans le Word, sans champ pour la saisir). */
async function majIdentification(): Promise<void> {
  if (!section.value) return
  const ref = referenceSaisie.value.trim()
  const version = versionSaisie.value.trim()
  if (ref === section.value.meta.ref && version === section.value.meta.version) return
  await sauvegarder(() => sectionsStore.mettreAJourMeta(props.sectionId, { ref, version }))
  await recharger()
}

async function majTableGabarit(
  cleTable: string,
  lignes: Array<Record<string, string | number | null>>,
): Promise<void> {
  await sauvegarder(() => sectionsStore.mettreAJourTable(props.sectionId, cleTable, lignes))
  await recharger()
}

// Export.
const blocageExport = computed(() =>
  section.value ? verifierBlocageExport(section.value) : { bloque: false as const },
)
const exportForce = ref(false)

const tableauxExportables = computed<ChampTableauDynamique[]>(() => {
  if (!definitionGabarit.value) return []
  return definitionGabarit.value.sections.flatMap((s) =>
    s.fields.filter((f): f is ChampTableauDynamique => f.type === 'tableau_dynamique'),
  )
})

function telechargerFichier(nom: string, contenu: string | ArrayBuffer, typeMime: string): void {
  const blob = new Blob([contenu], { type: typeMime })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  lien.click()
  URL.revokeObjectURL(url)
}

async function journaliserEtReinitialiser(): Promise<void> {
  await sectionsStore.journaliserExport(props.sectionId, blocageExport.value.bloque)
  exportForce.value = false
  await recharger()
}

/** Nom de fichier lisible : référence (ou type de livrable), titre et version — jamais l'identifiant technique. */
function nomFichier(extension: string, suffixe?: string): string {
  const s = section.value
  if (!s) return `export.${extension}`
  return nomFichierExport(
    {
      prefixe: s.meta.ref || LIBELLES_GABARIT[s.template_type],
      titre: s.meta.titre,
      version: s.meta.version,
      suffixe,
    },
    extension,
  )
}

const TYPE_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function exporterJSON(): Promise<void> {
  if (!section.value) return
  telechargerFichier(nomFichier('json'), genererExportJSON(section.value), 'application/json')
  await journaliserEtReinitialiser()
}

async function exporterWord(): Promise<void> {
  if (!section.value) return
  const docx = genererDocxParDefaut(
    construireDonneesExportGabarit(section.value, definitionGabarit.value, section.value.language),
    section.value.language,
  )
  telechargerFichier(nomFichier('docx'), docx, TYPE_DOCX)
  await journaliserEtReinitialiser()
}

/**
 * Import d'un gabarit `.docx` client —
 * refusé par le store lui-même (`importerGabarit`) si les éléments
 * obligatoires (bloc de signatures, historique des révisions) ne sont pas
 * mappés, jamais enregistré "à corriger plus tard".
 */
async function importerGabaritExport(evenement: Event): Promise<void> {
  erreurGabaritExport.value = null
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier || !projet.value?.client_id) return
  if (nomNouveauGabarit.value.trim().length === 0) {
    erreurGabaritExport.value = 'Donnez un nom au gabarit avant de l’importer.'
    return
  }

  try {
    const tampon = await fichier.arrayBuffer()
    const resultat = await gabaritExportStore.importerGabarit(
      projet.value.client_id,
      nomNouveauGabarit.value.trim(),
      tampon,
    )
    if (!resultat.ok) {
      erreurGabaritExport.value = `Gabarit refusé — balises obligatoires manquantes : ${resultat.tagsManquants.join(', ')}.`
      return
    }
    nomNouveauGabarit.value = ''
    gabaritSelectionneId.value = resultat.gabarit.id
  } catch (e) {
    erreurGabaritExport.value =
      e instanceof GabaritDocxInvalideError
        ? e.message
        : 'Erreur inconnue lors de l’import du gabarit.'
  } finally {
    ;(evenement.target as HTMLInputElement).value = ''
  }
}

/** Exporte au format `.docx` OOXML réel du gabarit client sélectionné — équivalence de contenu avec `exporterWord` garantie par `construireDonneesExportGabarit`. */
async function exporterWordGabaritClient(): Promise<void> {
  erreurGabaritExport.value = null
  if (!section.value) return
  const gabarit = gabaritExportStore.gabarits.find((g) => g.id === gabaritSelectionneId.value)
  if (!gabarit) {
    // Le gabarit a pu être supprimé entre-temps (autre onglet) — sans ce
    // message, le clic ne faisait strictement rien, sans la moindre
    // explication (bug réel trouvé le 13/09/2026).
    erreurGabaritExport.value = 'Ce gabarit a été supprimé — choisissez-en un autre.'
    return
  }

  try {
    const donnees = construireDonneesExportGabarit(
      section.value,
      definitionGabarit.value,
      section.value.language,
    )
    const docx = await genererDocxPersonnalise(gabarit.fichier, donnees)
    telechargerFichier(nomFichier('docx', gabarit.nom), docx, TYPE_DOCX)
    await journaliserEtReinitialiser()
  } catch (e) {
    erreurGabaritExport.value =
      e instanceof GabaritDocxInvalideError
        ? e.message
        : 'Erreur inconnue lors de la génération du document.'
  }
}

async function exporterCSV(champ: ChampTableauDynamique): Promise<void> {
  if (!section.value) return
  const csv = genererExportCSV(
    champ.colonnes,
    section.value.tables[champ.field_key] ?? [],
    section.value.language,
  )
  telechargerFichier(
    nomFichier('csv', champ.labels[section.value.language] ?? champ.labels.fr),
    csv,
    'text/csv;charset=utf-8',
  )
  await journaliserEtReinitialiser()
}

async function imprimer(): Promise<void> {
  await journaliserEtReinitialiser()
  window.print()
}

const messagesBlocage = computed<string[]>(() => {
  if (dernierResultat.value?.ok === false && 'blocagesFinalisation' in dernierResultat.value) {
    return dernierResultat.value.blocagesFinalisation.map((code: CodeMessageSysteme) =>
      messageSysteme(code, 'fr'),
    )
  }
  return []
})

// `RaisonBlocageTransition` (logique-metier/machine-etats/transitionSection.ts)
// → code de message système (i18n/messages.ts) — jamais affichée telle
// quelle (bug réel trouvé le 30/08/2026 : le code brut, ex. "roles_manquants",
// s'affichait directement à l'écran depuis la conception du workflow).
const CODES_RAISON_BLOCAGE: Record<
  NonNullable<ReturnType<typeof raisonTransitionBrute>>,
  CodeMessageSysteme
> = {
  roles_manquants: 'U-13',
  avis_manquant: 'U-14',
  motif_requis: 'U-15',
  section_verrouillee: 'U-16',
  transition_invalide: 'U-17',
}

function raisonTransitionBrute() {
  return dernierResultat.value?.ok === false && 'raisonTransition' in dernierResultat.value
    ? dernierResultat.value.raisonTransition
    : undefined
}

const raisonTransitionBloquee = computed(() => {
  const brute = raisonTransitionBrute()
  return brute ? messageSysteme(CODES_RAISON_BLOCAGE[brute], 'fr') : undefined
})

async function engagerVerification(): Promise<void> {
  await actionWorkflow(async () => {
    dernierResultat.value = await sectionsStore.engagerVerification(props.sectionId)
    if (dernierResultat.value.ok) motifForcage.value = ''
  })
}

function motifForcageSaisi(): boolean {
  if (motifForcage.value.trim().length > 0) return true
  erreurWorkflow.value = 'Saisissez le motif du forçage avant de forcer.'
  return false
}

async function forcerEngagerVerification(): Promise<void> {
  if (!motifForcageSaisi()) return
  await actionWorkflow(async () => {
    dernierResultat.value = await sectionsStore.engagerVerification(
      props.sectionId,
      motifForcage.value,
    )
    if (dernierResultat.value.ok) motifForcage.value = ''
  })
}

async function transmettreApprobation(): Promise<void> {
  await actionWorkflow(async () => {
    dernierResultat.value = await sectionsStore.transmettreApprobation(props.sectionId)
  })
}

// Approbation signée (décision du 26/09/2026) : fenêtre de signature, mot de
// passe vérifié par le serveur ; elle remplace la simple confirmation.
const signatureSection = ref<{ forcer: boolean; erreur: string | null; enCours: boolean } | null>(
  null,
)

function approuver(): void {
  erreurWorkflow.value = null
  signatureSection.value = { forcer: false, erreur: null, enCours: false }
}

function forcerApprouver(): void {
  if (!motifForcageSaisi()) return
  erreurWorkflow.value = null
  signatureSection.value = { forcer: true, erreur: null, enCours: false }
}

async function signerApprobation(motDePasse: string): Promise<void> {
  const demande = signatureSection.value
  if (!demande) return
  demande.enCours = true
  demande.erreur = null
  try {
    dernierResultat.value = await sectionsStore.approuver(
      props.sectionId,
      motDePasse,
      demande.forcer ? motifForcage.value : undefined,
    )
    if (dernierResultat.value.ok) motifForcage.value = ''
    signatureSection.value = null
    await recharger()
  } catch (e) {
    // Refus du serveur (mot de passe, séparation des tâches, approbateur…) :
    // affiché dans la fenêtre, qui reste ouverte pour corriger.
    demande.erreur = e instanceof Error ? e.message : "L'approbation n'a pas pu être enregistrée."
  } finally {
    demande.enCours = false
  }
}

async function rejeter(): Promise<void> {
  erreurWorkflow.value = null
  if (motifRejet.value.trim().length === 0) {
    erreurWorkflow.value = 'Saisissez un motif de rejet avant de rejeter.'
    return
  }
  try {
    dernierResultat.value = await sectionsStore.rejeter(props.sectionId, motifRejet.value)
  } catch (e) {
    erreurWorkflow.value = e instanceof Error ? e.message : "Le rejet n'a pas pu être enregistré."
    await recharger()
    return
  }
  // Un rejet bloqué (garde-fou de transition) ne doit jamais effacer le
  // motif que l'utilisateur vient de saisir — bug réel trouvé le
  // 13/09/2026 : le champ était vidé même en cas d'échec, sans que rien
  // n'indique qu'il fallait le ressaisir pour retenter.
  if (dernierResultat.value.ok) motifRejet.value = ''
  await recharger()
}

async function validerSectionIA(): Promise<void> {
  dernierResultat.value = await sectionsStore.validerSectionIA(props.sectionId)
  // Même motif que `rejeter` — un échec de la transition ne doit jamais
  // effacer la checklist de relecture déjà cochée (bug réel trouvé le
  // 13/09/2026), sans quoi l'utilisateur devrait tout re-cocher pour rien
  // alors que rien n'a été validé.
  if (dernierResultat.value.ok) sousSectionsRevues.value = new Set()
  await recharger()
}

/** Extraction du texte d'un fichier de référence (.docx/.pdf) — même patron que RevueStructureProcedure.vue. */
async function importerFichierReference(evenement: Event): Promise<void> {
  erreurExtractionReference.value = null
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return

  enExtractionReference.value = true
  try {
    const tampon = await fichier.arrayBuffer()
    texteDocumentReference.value = fichier.name.toLowerCase().endsWith('.pdf')
      ? (await extraireTextePdf(tampon)).texte
      : (await extraireTexteDocx(tampon)).texte
    nomDocumentReference.value = fichier.name
  } catch (e) {
    erreurExtractionReference.value =
      e instanceof Error ? e.message : "Erreur inconnue lors de l'extraction du fichier."
  } finally {
    enExtractionReference.value = false
    ;(evenement.target as HTMLInputElement).value = ''
  }
}

async function genererBrouillon(): Promise<void> {
  if (texteDocumentReference.value.trim().length === 0 || !confirmationDroitUsage.value) return
  erreurGeneration.value = null
  enGeneration.value = true
  try {
    const estFournisseurCloud = (configStore.config?.ai_provider ?? 'claude') !== 'local'
    const { principal, local } = construireAdaptateursIA({
      estFournisseurCloud,
      nomFournisseurActuel: nomFournisseurActuel.value,
      ...relaisStore.accesRelais(),
    })
    const resultat = await sectionsStore.genererBrouillonIA(
      props.sectionId,
      {
        texteDocumentReference: texteDocumentReference.value,
        nomDocumentReference:
          nomDocumentReference.value.trim() || `Texte collé — ${new Date().toLocaleString()}`,
        contexteNouveauCas: contexteNouveauCas.value,
        confirmationDroitUsage: confirmationDroitUsage.value,
        actor: identifiantActeurCourant(),
        documentsNormatifs: normativeDocumentsStore.documents,
      },
      adaptateurAvecBascule(principal, local),
    )
    if (!resultat.ok) {
      // Les trois motifs d'échec ont des causes distinctes — les confondre
      // (bug réel trouvé le 13/09/2026 : `statut_incompatible` affichait à
      // tort "confirmation du droit d'usage requise") induit l'utilisateur
      // en erreur sur l'action à corriger, en particulier dans le cas
      // réaliste où la section a changé de statut entre-temps (autre onglet).
      erreurGeneration.value =
        resultat.motif === 'gabarit_introuvable'
          ? 'Aucun gabarit défini pour ce type de section — génération impossible.'
          : resultat.motif === 'statut_incompatible'
            ? 'Cette section ne peut plus recevoir de brouillon généré (statut modifié entre-temps) — rechargez la page.'
            : "Confirmation du droit d'usage requise avant de générer."
      return
    }
    texteDocumentReference.value = ''
    nomDocumentReference.value = ''
    contexteNouveauCas.value = ''
    confirmationDroitUsage.value = false
    await recharger()
  } catch (e) {
    erreurGeneration.value =
      e instanceof Error ? e.message : 'Erreur inconnue lors de la génération du brouillon.'
  } finally {
    enGeneration.value = false
  }
}

async function poserQuestionAssistant(): Promise<void> {
  if (!section.value || !projet.value?.client_id || questionAssistant.value.trim().length === 0) {
    return
  }
  const question = questionAssistant.value.trim()
  erreurAssistant.value = null
  assistantEnCours.value = true
  try {
    const estFournisseurCloud = (configStore.config?.ai_provider ?? 'claude') !== 'local'
    const { principal, local } = construireAdaptateursIA({
      estFournisseurCloud,
      nomFournisseurActuel: nomFournisseurActuel.value,
      ...relaisStore.accesRelais(),
    })
    const { response } = await reasoningStore.executerRaisonnement(projet.value.client_id, {
      objectif: construireObjectifAssistantSection(
        section.value,
        question,
        normativeDocumentsStore.documents,
      ),
      missionId: null,
      contextSnapshotId: null,
      fournisseur: adaptateurAvecBascule(principal, local),
      mode: 'chat_normatif',
    })
    historiqueAssistant.value = [
      ...historiqueAssistant.value,
      { question, reponse: response.texte, etatConfiance: response.etat_confiance },
    ]
    questionAssistant.value = ''
  } catch (e) {
    erreurAssistant.value =
      e instanceof Error ? e.message : "Erreur inconnue lors de l'appel à l'assistant."
  } finally {
    assistantEnCours.value = false
  }
}

async function assignerApprobateur(): Promise<void> {
  const email = nouvelApprobateur.value.trim()
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    erreurWorkflow.value = "Saisissez l'adresse e-mail du compte de l'approbateur final."
    return
  }
  await actionWorkflow(async () => {
    await sectionsStore.assignerApprobateurFinal(props.sectionId, email)
    nouvelApprobateur.value = ''
  })
}

async function ajouterAvisRelecteur(): Promise<void> {
  const avis = nouvelAvisRelecteurTexte.value.trim()
  if (avis.length === 0) {
    erreurWorkflow.value = 'Saisissez votre avis avant de l’enregistrer.'
    return
  }
  await actionWorkflow(async () => {
    await sectionsStore.ajouterAvisRelecteur(props.sectionId, avis)
    nouvelAvisRelecteurTexte.value = ''
  })
}
</script>

<template>
  <main v-if="section" class="editeur-section">
    <RouterLink
      :to="{ name: 'fiche-projet', params: { projectId: props.projectId } }"
      class="no-print lien-retour"
    >
      Fiche projet
    </RouterLink>
    <header class="entete-section">
      <div class="ligne-titre">
        <h1>{{ section.meta.titre }}</h1>
        <PastilleStatutSection :statut="section.status" :langue="section.language" />
      </div>
      <p class="meta">
        {{ LIBELLES_GABARIT[section.template_type] }}
        <template v-if="section.meta.ref"> · Référence {{ section.meta.ref }}</template>
        <template v-if="section.meta.version"> · Version {{ section.meta.version }}</template>
      </p>
      <ol class="etapes-cycle no-print" aria-label="Cycle de vie de la section">
        <li
          v-for="(etape, index) in ETAPES_CYCLE"
          :key="etape.libelle"
          :class="{
            'etape-faite': index < indexEtapeCourante,
            'etape-courante': index === indexEtapeCourante,
          }"
          :aria-current="index === indexEtapeCourante ? 'step' : undefined"
        >
          {{ etape.libelle }}
        </li>
      </ol>
      <p class="prochaine-etape no-print">{{ PROCHAINE_ETAPE[section.status] }}</p>
    </header>

    <p
      v-if="etatSauvegarde !== 'inactif'"
      class="etat-sauvegarde no-print"
      :class="`etat-sauvegarde--${etatSauvegarde}`"
      role="status"
      aria-live="polite"
    >
      <template v-if="etatSauvegarde === 'en_cours'">Enregistrement…</template>
      <template v-else-if="etatSauvegarde === 'enregistre'">
        Enregistré à {{ heureSauvegarde }}
      </template>
      <template v-else>Non enregistré : {{ erreurSauvegarde }}</template>
    </p>

    <p v-if="lectureSeule" class="bandeau-lecture-seule no-print" role="status">
      Lecture seule : seuls le créateur du projet, les personnes partagées en édition et les
      administrateurs peuvent modifier ou exporter cette section.
    </p>

    <p v-if="retourAutomatique" class="bandeau-info no-print" role="status">
      La section est revenue en rédaction le {{ dateLisible(retourAutomatique.timestamp) }} ({{
        retourAutomatique.action.replace(`${ACTION_RETOUR_REDACTION} : `, '')
      }}, par {{ retourAutomatique.actor }}) : les avis précédents ne comptent plus. Engagez à
      nouveau le cycle une fois le contenu prêt.
    </p>
    <p v-if="enCycleDeRelecture && !lectureSeule" class="bandeau-avertissement no-print">
      Section
      {{ section.status === 'en_verification' ? 'en vérification' : 'en approbation' }} : toute
      modification du contenu (y compris la référence ou la version) la renverra en rédaction, et
      les avis de ce cycle ne compteront plus.
    </p>

    <!-- Désactive d'un coup tous les contrôles d'édition pour un lecteur :
         le Worker refuserait de toute façon l'écriture (403). -->
    <fieldset class="zone-edition" :disabled="lectureSeule">
      <details v-if="nombreFormulationsFaibles > 0" class="revue-de-style no-print">
        <summary>
          Revue de style — {{ nombreFormulationsFaibles }} formulation{{
            nombreFormulationsFaibles > 1 ? 's' : ''
          }}
          à reconsidérer
        </summary>
        <p class="rappel">
          Signal purement informatif, jamais un verdict de conformité — à vous d'apprécier si une
          reformulation est utile.
        </p>
        <ul>
          <li v-for="champ in revueDeStyle" :key="champ.champ">
            <strong>{{ champ.champ }}</strong>
            <ul>
              <li v-for="(formulation, index) in champ.formulations" :key="index">
                « {{ formulation.extrait }} » — {{ formulation.motif }}.
                {{ formulation.suggestion }}
              </li>
            </ul>
          </li>
        </ul>
      </details>

      <div v-if="section.status !== 'valide_en_interne'" class="identification no-print">
        <label>
          Référence du livrable
          <input
            v-model="referenceSaisie"
            type="text"
            placeholder="ex. URS-AUT-001"
            @change="majIdentification"
          />
        </label>
        <label>
          Version
          <input
            v-model="versionSaisie"
            type="text"
            placeholder="ex. 1.0"
            @change="majIdentification"
          />
        </label>
      </div>

      <RenduGabarit
        v-if="definitionGabarit"
        :key="section.id"
        :definition="definitionGabarit"
        :values="section.values"
        :tables="section.tables"
        :langue="section.language"
        :verrouille="section.status === 'valide_en_interne'"
        :champs-signales="section.generation_source.generated_fields"
        @maj-valeurs="majValeursGabarit"
        @maj-table="majTableGabarit"
      />
      <label v-else class="champ-contenu">
        Contenu
        <textarea v-model="contenu" :disabled="section.status === 'valide_en_interne'" rows="10" />
      </label>

      <section v-if="section.status === 'propose_par_ia_non_valide'" class="revue-ia no-print">
        <h2>Revue du brouillon proposé par IA</h2>
        <p v-if="documentReferenceUtilise">
          Document de référence : « {{ documentReferenceUtilise.filename }} »
        </p>
        <p class="rappel">
          Relisez explicitement chaque section ci-dessus avant de pouvoir valider — aucune
          validation globale en un clic n'est possible.
        </p>
        <fieldset v-if="definitionGabarit" class="checklist-revue">
          <label v-for="s in definitionGabarit.sections" :key="s.section_key">
            <input
              type="checkbox"
              :checked="sousSectionsRevues.has(s.section_key)"
              @change="
                (e: Event) =>
                  (e.target as HTMLInputElement).checked
                    ? sousSectionsRevues.add(s.section_key)
                    : sousSectionsRevues.delete(s.section_key)
              "
            />
            J'ai relu et validé « {{ s.labels[section.language] ?? s.labels.fr }} »
          </label>
        </fieldset>
      </section>

      <section
        v-if="prerequis.length > 0 && section.status !== 'valide_en_interne'"
        class="prerequis no-print"
      >
        <h2>Liens requis</h2>
        <p class="rappel">
          Ce type de livrable doit être relié aux sections ci-dessous. Sans lien, l'étape indiquée
          reste bloquée (sauf forçage motivé).
        </p>
        <p v-if="erreurLienSection" class="bandeau-erreur" role="alert">{{ erreurLienSection }}</p>
        <ul class="liste-prerequis">
          <li
            v-for="lien in prerequis"
            :key="lien.code"
            :class="lien.satisfait ? 'prerequis-ok' : 'prerequis-manquant'"
          >
            <span class="etat-prerequis">
              {{ lien.satisfait ? '✓ Lié' : '✗ Manquant' }} :
              <strong>{{ LIBELLES_GABARIT[lien.typeCible] }}</strong>
              <span class="rappel">
                (requis pour
                {{
                  lien.pointDeControle === 'entree_en_verification'
                    ? 'engager la vérification'
                    : 'approuver'
                }})
              </span>
            </span>
            <span v-if="!lien.satisfait && !lectureSeule" class="actions-prerequis">
              <template v-if="lien.candidates.length > 0">
                <select
                  v-model="prerequisSelection[lien.typeCible]"
                  :aria-label="`Section ${LIBELLES_GABARIT[lien.typeCible]} à lier`"
                >
                  <option value="">— choisir une section existante —</option>
                  <option v-for="c in lien.candidates" :key="c.id" :value="c.id">
                    {{ c.meta.titre }}
                  </option>
                </select>
                <button
                  type="button"
                  :disabled="!prerequisSelection[lien.typeCible]"
                  @click="lierPrerequis(lien.typeCible)"
                >
                  Lier
                </button>
              </template>
              <button
                type="button"
                :disabled="prerequisEnCours"
                @click="creerEtLierPrerequis(lien.typeCible)"
              >
                Créer la section {{ LIBELLES_GABARIT[lien.typeCible] }} et la lier
              </button>
            </span>
          </li>
        </ul>
        <p v-if="sectionCreeeId" class="bandeau-succes" role="status">
          Section créée et liée.
          <RouterLink
            :to="{
              name: 'editeur-section',
              params: { projectId: props.projectId, sectionId: sectionCreeeId },
            }"
          >
            L'ouvrir
          </RouterLink>
        </p>
      </section>

      <section class="workflow no-print">
        <h2>Rédaction, relecture et approbation</h2>
        <!-- Récapitulatif conservé après la validation (constat 13 : toutes
             les traces du workflow disparaissaient de l'écran). -->
        <dl v-if="recapitulatif" class="recapitulatif-workflow">
          <dt>Rédaction</dt>
          <dd>{{ recapitulatif.redacteurs.join(', ') || 'non renseignée' }}</dd>
          <dt>Approbateur final</dt>
          <dd>
            {{ recapitulatif.approbateurDesigne ?? 'non désigné' }}
            <template v-if="recapitulatif.approbation">
              — a approuvé le {{ dateLisible(recapitulatif.approbation.date) }}
              <template
                v-if="
                  recapitulatif.approbation.par.toLowerCase() !==
                  (recapitulatif.approbateurDesigne ?? '').toLowerCase()
                "
              >
                (approbation donnée par {{ recapitulatif.approbation.par }})
              </template>
            </template>
          </dd>
        </dl>
        <div
          v-if="section.status !== 'valide_en_interne' && !lectureSeule"
          class="ligne-formulaire"
        >
          <label>
            Adresse e-mail de l'approbateur final
            <input
              v-model="nouvelApprobateur"
              type="email"
              placeholder="ex. qualite@client.com"
              autocomplete="off"
            />
          </label>
          <button type="button" @click="assignerApprobateur">Désigner</button>
          <button type="button" @click="nouvelApprobateur = emailCourant">Moi-même</button>
        </div>

        <p>
          Avis de relecture : {{ avisCycleCourant.size }} sur ce cycle<template
            v-if="section.workflow.reviewers.length > avisCycleCourant.size"
          >
            ({{ section.workflow.reviewers.length - avisCycleCourant.size }} d'un cycle
            clos)</template
          >
        </p>
        <ul v-if="section.workflow.reviewers.length > 0" class="liste-avis">
          <li v-for="(avis, index) in section.workflow.reviewers" :key="index">
            {{ avis.user_id }} — {{ avis.avis }}
            <span class="date-avis">({{ dateLisible(avis.date) }})</span>
            <span v-if="!avisCycleCourant.has(avis)" class="avis-perime">
              — cycle clos (rejet ou contenu modifié depuis), ne compte plus
            </span>
          </li>
        </ul>
        <div
          v-if="section.status !== 'valide_en_interne' && !lectureSeule"
          class="ligne-formulaire"
        >
          <label>
            Votre avis (enregistré au nom de {{ emailCourant }})
            <input v-model="nouvelAvisRelecteurTexte" type="text" placeholder="ex. Favorable" />
          </label>
          <button type="button" @click="ajouterAvisRelecteur">Enregistrer mon avis</button>
        </div>
      </section>

      <p v-if="erreurWorkflow" class="blocage no-print" role="alert">{{ erreurWorkflow }}</p>

      <div v-if="messagesBlocage.length > 0" class="blocage no-print" role="alert">
        <p v-for="message in messagesBlocage" :key="message">
          {{ message }}
        </p>
        <label>
          Motif du forçage (obligatoire)
          <input v-model="motifForcage" type="text" />
        </label>
        <button
          type="button"
          @click="
            section.status === 'en_approbation' ? forcerApprouver() : forcerEngagerVerification()
          "
        >
          Forcer
        </button>
      </div>

      <p v-if="raisonTransitionBloquee" class="blocage no-print" role="alert">
        {{ raisonTransitionBloquee }}
      </p>

      <div class="actions-cycle no-print">
        <template v-if="section.status === 'brouillon_aide'">
          <button type="button" @click="engagerVerification">
            Engager le cycle « validé en interne »
          </button>
        </template>

        <template v-else-if="section.status === 'propose_par_ia_non_valide'">
          <button type="button" :disabled="!toutesLesSousSectionsRevues" @click="validerSectionIA">
            Valider cette section (contenu proposé par IA)
          </button>
          <p v-if="!toutesLesSousSectionsRevues" class="rappel">
            Relisez chaque section ci-dessus avant de pouvoir valider.
          </p>
        </template>

        <template v-else-if="section.status === 'en_verification'">
          <div class="decision-positive">
            <button type="button" @click="transmettreApprobation">
              Transmettre à l'approbation
            </button>
          </div>
        </template>

        <template v-else-if="section.status === 'en_approbation'">
          <div class="decision-positive">
            <button type="button" :disabled="!peutApprouver" @click="approuver">Approuver…</button>
            <p v-if="!peutApprouver" class="rappel">
              Seul l'approbateur désigné ({{ section.workflow.approver_final ?? 'non renseigné' }})
              ou un administrateur peut approuver.
            </p>
          </div>
        </template>

        <!-- Rejet séparé de l'action positive (constat 7) : deux décisions
             opposées ne partagent plus la même ligne. -->
        <fieldset v-if="enCycleDeRelecture" class="bloc-rejet">
          <legend>Renvoyer en rédaction</legend>
          <label>
            Motif du rejet (obligatoire)
            <input v-model="motifRejet" type="text" />
          </label>
          <button type="button" class="bouton-danger" @click="rejeter">Rejeter</button>
        </fieldset>

        <p v-else-if="section.status === 'valide_en_interne'" class="verrouille">
          Section verrouillée (validée en interne — pas une signature électronique opposable). Son
          contenu ne peut plus être modifié ; les exports restent disponibles.
        </p>
      </div>

      <section class="export no-print">
        <h2>Export</h2>

        <div v-if="blocageExport.bloque && !exportForce" class="blocage" role="alert">
          <p>{{ blocageExport.motif }}</p>
          <button type="button" @click="exportForce = true">
            Forcer l'export malgré l'avertissement
          </button>
        </div>

        <div v-else class="actions-export">
          <button type="button" @click="exporterJSON">Exporter en JSON</button>
          <button type="button" @click="exporterWord">Exporter en Word (.docx)</button>
          <button type="button" @click="imprimer">Imprimer / Exporter en PDF</button>
          <button
            v-for="champ in tableauxExportables"
            :key="champ.field_key"
            type="button"
            @click="exporterCSV(champ)"
          >
            Exporter « {{ champ.labels[section.language] ?? champ.labels.fr }} » en CSV
          </button>
        </div>

        <div v-if="projet?.client_id" class="gabarit-export-client">
          <h3>Gabarit d'export personnalisé</h3>
          <p v-if="erreurGabaritExport" class="bandeau-erreur" role="alert">
            {{ erreurGabaritExport }}
          </p>

          <div v-if="gabaritExportStore.gabarits.length > 0" class="selection-gabarit">
            <label>
              Gabarit
              <select v-model="gabaritSelectionneId">
                <option value="">— Gabarit par défaut —</option>
                <option v-for="g in gabaritExportStore.gabarits" :key="g.id" :value="g.id">
                  {{ g.nom }}
                </option>
              </select>
            </label>
            <button
              v-if="gabaritSelectionneId"
              type="button"
              :disabled="blocageExport.bloque && !exportForce"
              @click="exporterWordGabaritClient"
            >
              Exporter en Word (gabarit client, .docx)
            </button>
          </div>

          <div class="import-gabarit">
            <input
              v-model="nomNouveauGabarit"
              type="text"
              placeholder="Nom du gabarit à importer"
            />
            <label class="bouton-fichier">
              Importer un gabarit (.docx)
              <input type="file" accept=".docx" @change="importerGabaritExport" />
            </label>
          </div>
        </div>
      </section>
      <details
        v-if="projet?.client_id && section.status !== 'valide_en_interne'"
        class="panneau-replie outils-ia no-print"
        :open="panneauIAOuvert"
        @toggle="panneauIAOuvert = ($event.target as HTMLDetailsElement).open"
      >
        <summary>Aide à la rédaction par l'IA</summary>
        <p v-if="!iaDisponible" class="bandeau-avertissement" role="status">
          L'assistant IA n'est pas configuré : renseignez le relais IA dans
          <RouterLink to="/configuration">Configuration</RouterLink> pour utiliser la génération de
          brouillon et l'assistant.
        </p>
        <fieldset class="zone-ia" :disabled="!iaDisponible">
          <section
            v-if="section.status === 'brouillon_aide' && definitionGabarit && projet?.client_id"
            class="generation-brouillon no-print"
          >
            <h3>Génération de brouillon par adaptation</h3>
            <p class="rappel">
              Adapte un document de référence (structure, langage, raisonnement) au contexte du
              nouveau cas — le résultat reste au statut « proposé par IA — non validé » tant que
              chaque section du gabarit n'a pas été relue explicitement.
            </p>

            <fieldset class="choix-reference">
              <label>
                <input v-model="modeReference" type="radio" value="coller" />
                Coller le texte
              </label>
              <label>
                <input v-model="modeReference" type="radio" value="uploader" />
                Uploader un fichier (.docx, .pdf)
              </label>
            </fieldset>

            <label v-if="modeReference === 'coller'">
              Texte du document de référence
              <textarea v-model="texteDocumentReference" rows="6" />
            </label>
            <template v-else>
              <label class="bouton-fichier">
                Choisir un fichier (.docx, .pdf)
                <input type="file" accept=".docx,.pdf" @change="importerFichierReference" />
              </label>
              <p v-if="enExtractionReference">Extraction du texte en cours…</p>
              <p v-if="erreurExtractionReference" class="bandeau-erreur" role="alert">
                {{ erreurExtractionReference }}
              </p>
              <p v-if="nomDocumentReference && !enExtractionReference">
                Fichier chargé : « {{ nomDocumentReference }} » ({{ texteDocumentReference.length }}
                caractères extraits)
              </p>
            </template>

            <label v-if="modeReference === 'coller'">
              Nom du document de référence
              <input
                v-model="nomDocumentReference"
                type="text"
                placeholder="ex. IQ ligne A11 (2024)"
              />
            </label>

            <label>
              Contexte du nouveau cas
              <textarea v-model="contexteNouveauCas" rows="3" />
            </label>

            <label class="confirmation-droit-usage">
              <input v-model="confirmationDroitUsage" type="checkbox" />
              {{
                messageSysteme('U-07', section.language, {
                  titre: nomDocumentReference || 'ce document',
                })
              }}
            </label>

            <p v-if="erreurGeneration" class="bandeau-erreur" role="alert">
              {{ erreurGeneration }}
            </p>

            <button
              type="button"
              :disabled="
                enGeneration ||
                texteDocumentReference.trim().length === 0 ||
                !confirmationDroitUsage
              "
              @click="genererBrouillon"
            >
              {{ enGeneration ? 'Génération en cours…' : 'Générer le brouillon' }}
            </button>
          </section>

          <section v-if="projet?.client_id" class="assistant-section no-print">
            <h3>Assistant contextuel</h3>
            <p class="rappel">
              Pose une question sur cette section précise — l'assistant voit son contenu actuel et
              dispose des mêmes outils de traçabilité que le moteur de raisonnement. Fournisseur
              actuel :
              {{ nomFournisseurActuel }}. Jamais une écriture automatique dans la section — une
              réponse, jamais une action.
            </p>
            <ul v-if="historiqueAssistant.length > 0" class="historique-assistant">
              <li v-for="(echange, index) in historiqueAssistant" :key="index">
                <p class="question-assistant"><strong>Vous :</strong> {{ echange.question }}</p>
                <p class="reponse-assistant">
                  <strong>Assistant :</strong> {{ echange.reponse }}
                  <span class="badge-confiance">{{
                    LIBELLES_CONFIANCE_ASSISTANT[echange.etatConfiance]
                  }}</span>
                </p>
              </li>
            </ul>
            <p v-if="erreurAssistant" class="bandeau-erreur" role="alert">{{ erreurAssistant }}</p>
            <form class="formulaire-assistant" @submit.prevent="poserQuestionAssistant">
              <textarea
                v-model="questionAssistant"
                rows="2"
                placeholder="ex. Quels risques ne sont pas encore couverts par un test pour cet actif ?"
              />
              <button
                type="submit"
                :disabled="assistantEnCours || questionAssistant.trim().length === 0"
              >
                {{ assistantEnCours ? 'Réflexion en cours…' : 'Poser la question' }}
              </button>
            </form>
          </section>
        </fieldset>
      </details>

      <details class="panneau-replie outils-liens no-print">
        <summary>Liens vers d'autres sections, la procédure et l'actif</summary>
        <section class="liens-sections no-print">
          <h3>Sections liées</h3>
          <p class="rappel">
            Un lien vers la section requise (ex. Contexte procédé pour l'OQ/PQ, Plan de métrologie
            pour l'IQ) est la façon normale de satisfaire un garde-fou de finalisation — « Forcer »
            reste réservé aux exceptions justifiées.
          </p>
          <p v-if="erreurLienSection" class="bandeau-erreur" role="alert">
            {{ erreurLienSection }}
          </p>
          <ul v-if="sectionsLiees.length > 0" class="liste-liens">
            <li v-for="s in sectionsLiees" :key="s.id">
              {{ s.meta.titre }} ({{ LIBELLES_GABARIT[s.template_type] }})
              <button
                v-if="section.status !== 'valide_en_interne'"
                type="button"
                @click="delierSection(s.id)"
              >
                Délier
              </button>
            </li>
          </ul>
          <p v-else>Aucun lien pour l'instant.</p>
          <div v-if="section.status !== 'valide_en_interne'" class="ligne-formulaire">
            <label>
              Lier à
              <select
                v-model="sectionCibleLienId"
                :disabled="sectionsLiablesRestantes.length === 0"
              >
                <option value="">— choisir une section —</option>
                <option v-for="s in sectionsLiablesRestantes" :key="s.id" :value="s.id">
                  {{ s.meta.titre }} ({{ LIBELLES_GABARIT[s.template_type] }})
                </option>
              </select>
            </label>
            <button type="button" :disabled="!sectionCibleLienId" @click="lierSectionSelectionnee">
              Lier
            </button>
          </div>
        </section>

        <section class="liens-structurels no-print">
          <h3>Procédure et actif liés</h3>
          <p class="rappel">
            Liens retrouvables depuis la fiche procédure ou le dossier vivant de l'actif — jamais un
            simple texte d'audit.
          </p>
          <!-- `procedureStore`/`structureStore` se chargent en fin de chaîne
           séquentielle dans `onMounted` — sans cette garde, un lien
           structurel bel et bien enregistré s'affichait comme absent
           pendant ce court instant (`procedureLiee`/`noeudLie` restent
           `null` tant que ces stores n'ont pas fini de charger), un vrai
           flash de contenu trompeur (bug réel trouvé le 13/09/2026). -->
          <p v-if="chargementInitial" class="etat-vide">Chargement…</p>
          <template v-else>
            <div class="lien-structurel">
              <template v-if="procedureLiee">
                <span
                  >Procédure :
                  <strong
                    >{{ procedureLiee.reference }} v{{ procedureLiee.numero_version }} —
                    {{ procedureLiee.titre }}</strong
                  ></span
                >
                <span v-if="procedureStore.remplaceePar(procedureLiee)" class="alerte-obsolete">
                  ⚠ Révision obsolète — remplacée par la v{{
                    procedureStore.remplaceePar(procedureLiee)
                  }}
                </span>
                <button
                  v-if="section.status !== 'valide_en_interne'"
                  type="button"
                  @click="delierProcedure"
                >
                  Délier
                </button>
              </template>
              <div v-else-if="section.status !== 'valide_en_interne'" class="ligne-formulaire">
                <label>
                  Lier à une procédure
                  <select v-model="procedureLienId">
                    <option value="">— choisir —</option>
                    <option v-for="p in procedureStore.procedures" :key="p.id" :value="p.id">
                      {{ p.reference }} v{{ p.numero_version }} — {{ p.titre
                      }}{{ procedureStore.remplaceePar(p) ? ' (obsolète)' : '' }}
                    </option>
                  </select>
                </label>
                <button
                  type="button"
                  :disabled="!procedureLienId"
                  @click="lierProcedureSelectionnee"
                >
                  Lier
                </button>
              </div>
              <p v-else>Aucune procédure liée.</p>
            </div>
            <div class="lien-structurel">
              <template v-if="noeudLie">
                <span
                  >Actif :
                  <RouterLink
                    v-if="projet?.client_id"
                    :to="{
                      name: 'dossier-vivant-actif',
                      params: { clientId: projet.client_id, noeudId: noeudLie.id },
                    }"
                  >
                    {{ noeudLie.name }} ({{ noeudLie.code }})
                  </RouterLink>
                  <template v-else>{{ noeudLie.name }} ({{ noeudLie.code }})</template></span
                >
                <button
                  v-if="section.status !== 'valide_en_interne'"
                  type="button"
                  @click="delierAssetNode"
                >
                  Délier
                </button>
              </template>
              <div v-else-if="section.status !== 'valide_en_interne'" class="ligne-formulaire">
                <label>
                  Lier à un nœud Structure Système
                  <select v-model="noeudLienId">
                    <option value="">— choisir —</option>
                    <option v-for="n in structureStore.noeuds" :key="n.id" :value="n.id">
                      {{ n.name }} ({{ n.code }})
                    </option>
                  </select>
                </label>
                <button type="button" :disabled="!noeudLienId" @click="lierAssetNodeSelectionne">
                  Lier
                </button>
              </div>
              <p v-else>Aucun actif lié.</p>
            </div>
          </template>
        </section>
      </details>
    </fieldset>
    <ModaleSignature
      v-if="signatureSection && section"
      titre="Approuver la section"
      :signification="`En signant, vous approuvez « ${section.meta.titre} » : la section passe « validée en interne » et son contenu est verrouillé définitivement. L'approbation est tracée à votre nom.`"
      libelle-bouton="Signer et approuver"
      :erreur="signatureSection.erreur"
      :en-cours="signatureSection.enCours"
      @confirme="signerApprobation"
      @annule="signatureSection = null"
    />
  </main>
  <p v-else-if="chargementInitial">Chargement…</p>
  <p v-else>Section introuvable.</p>
</template>

<style scoped>
.zone-edition {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.etat-sauvegarde {
  margin: 0;
  font-size: 0.875rem;
  color: var(--vp-texte-secondaire);
}

.etat-sauvegarde--erreur {
  color: var(--vp-danger);
  font-weight: 600;
}

.date-avis,
.avis-perime {
  color: var(--vp-texte-secondaire);
  font-size: 0.875rem;
}

.bandeau-lecture-seule {
  padding: 0.5rem 0.75rem;
  border: 1px solid currentColor;
  border-radius: 4px;
}

/* Largeur portée à l'espace disponible (constat 10 : colonne bloquée à
   640 px, tableau dynamique tronqué alors que 400 px restaient vides). */
.editeur-section {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 72rem;
  min-width: 0;
}

.entete-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--vp-bordure);
}

.ligne-titre {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.ligne-titre h1 {
  margin: 0;
}

.meta {
  margin: 0;
  color: var(--vp-texte-secondaire);
}

.etapes-cycle {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: etape;
}

.etapes-cycle li {
  counter-increment: etape;
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: 999px;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.etapes-cycle li::before {
  content: counter(etape) '. ';
}

.etapes-cycle li.etape-faite {
  color: var(--vp-succes);
  border-color: var(--vp-succes);
}

.etapes-cycle li.etape-faite::before {
  content: '✓ ';
}

.etapes-cycle li.etape-courante {
  color: var(--vp-texte-principal);
  border-color: var(--vp-marque);
  background-color: var(--vp-marque-fond-leger);
  font-weight: var(--vp-poids-semibold);
}

.prochaine-etape {
  margin: 0;
  font-size: 0.9rem;
}

.bandeau-info,
.bandeau-avertissement,
.bandeau-succes {
  margin: 0;
  padding: 0.6rem 0.9rem;
  border-radius: var(--vp-rayon);
  border: 1px solid;
}

.bandeau-info {
  border-color: var(--vp-info);
  background-color: var(--vp-info-fond-leger);
}

.bandeau-avertissement {
  border-color: var(--vp-attention);
  background-color: var(--vp-attention-fond-leger);
}

.bandeau-succes {
  border-color: var(--vp-succes);
  background-color: var(--vp-succes-fond-leger);
}

.identification {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.identification label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.prerequis {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prerequis h2 {
  font-size: 1rem;
  margin: 0;
}

.liste-prerequis {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.liste-prerequis li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.prerequis-ok .etat-prerequis {
  color: var(--vp-succes);
}

.prerequis-manquant .etat-prerequis {
  color: var(--vp-danger);
}

.actions-prerequis {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.recapitulatif-workflow {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
  margin: 0;
}

.recapitulatif-workflow dt {
  font-weight: var(--vp-poids-semibold);
}

.recapitulatif-workflow dd {
  margin: 0;
}

.bloc-rejet {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem;
  border: 1px solid var(--vp-danger);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
}

.bloc-rejet legend {
  padding: 0 0.25rem;
  color: var(--vp-danger);
  font-weight: var(--vp-poids-semibold);
}

.bloc-rejet label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1 1 16rem;
}

/* Panneaux d'aide (IA, liens) repliés : le contenu du livrable et le
   workflow passent en premier (constat 11). */
.panneau-replie {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panneau-replie > summary {
  cursor: pointer;
  font-weight: var(--vp-poids-semibold);
}

.panneau-replie[open] > summary {
  margin-bottom: 0.75rem;
}

.zone-ia {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.liens-sections,
.liens-structurels {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.generation-brouillon h3,
.assistant-section h3,
.liens-sections h3,
.liens-structurels h3 {
  font-size: 1rem;
  margin: 0;
}

@media (max-width: 40rem) {
  .editeur-section {
    padding: 1rem;
  }
}

.champ-contenu {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.revue-de-style {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
  background-color: var(--vp-fond-carte);
}

.revue-de-style summary {
  cursor: pointer;
  font-weight: var(--vp-poids-medium);
}

.revue-de-style ul {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.revue-de-style ul ul {
  gap: 0.25rem;
  margin-top: 0.25rem;
  padding-left: 1.25rem;
  list-style: disc;
}

.revue-de-style li {
  font-size: 0.9em;
}

textarea,
input {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

/* `.bouton-danger` : « Rejeter » ne doit jamais avoir le même
   poids visuel qu'« Approuver »/« Transmettre à l'approbation » — un
   bouton plein indigo identique aux deux ne distinguait pas l'action
   destructrice de l'action positive dans un flux d'approbation GxP.
   Même recette que `GestionClients.vue`/`AdminUtilisateurs.vue`. */
.bouton-danger {
  background-color: transparent;
  color: var(--vp-danger);
  border: 1px solid var(--vp-danger);
}

button {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
  align-self: flex-start;
}

.workflow,
.generation-brouillon,
.assistant-section,
.revue-ia {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.generation-brouillon h2,
.assistant-section h2,
.revue-ia h2 {
  font-size: 1rem;
  margin: 0;
}

.historique-assistant {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.question-assistant,
.reponse-assistant {
  margin: 0;
  font-size: 0.9rem;
}

.badge-confiance {
  margin-left: 0.4rem;
  font-size: 0.75em;
  font-style: italic;
  color: var(--vp-texte-secondaire);
}

.formulaire-assistant {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.choix-reference,
.checklist-revue {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
}

.confirmation-droit-usage {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.workflow h2 {
  font-size: 1rem;
  margin: 0;
}

.ligne-formulaire {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.alerte-obsolete {
  color: var(--vp-danger);
  font-weight: var(--vp-poids-semibold);
}

.lien-structurel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ligne-formulaire label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.liste-avis {
  margin: 0;
  padding-left: 1.25rem;
}

.blocage {
  border: 1px solid var(--vp-danger);
  background-color: var(--vp-danger-fond-leger);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.actions-cycle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.verrouille {
  color: var(--vp-texte-secondaire);
}

.actions-export {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.gabarit-export-client {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-bordure);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selection-gabarit,
.import-gabarit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.bouton-fichier {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  cursor: pointer;
}

/* Le contrôle natif du fichier (« Choisir un fichier » + nom, largeur
   fixée par le navigateur) débordait sur mobile — seul le libellé stylé
   doit être visible. `display: none` retirait l'input de l'ordre de
   tabulation clavier (bug réel trouvé le 13/09/2026, même motif déjà
   corrigé sur Process.vue/RevueStructureProcedure.vue/
   TemplatesFormulaires.vue) — masqué visuellement mais toujours focusable/
   activable au clavier. */
.bouton-fichier input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

/* Impression / export PDF : uniquement le contenu du livrable,
   jamais le chrome applicatif (navigation, actions de workflow, export). */
@media print {
  .no-print {
    display: none !important;
  }
}
</style>

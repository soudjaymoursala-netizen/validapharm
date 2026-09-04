<script setup lang="ts">
// Éditeur de section (FDS §2). Rédaction guidée par le moteur de gabarits
// déclaratif (FDS §4, tâche #12) quand une définition existe pour le
// template_type de la section ; repli sur un champ de contenu générique
// sinon (gabarits pas encore définis dans le catalogue — voir
// logique-metier/gabarits/catalogue/index.ts). Transitions de statut avec
// garde-fous fidèles (FDS §3.2/§3.3), sauvegarde automatique (URS-F-009).
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { extraireTexteDocx } from '../../connecteurs/office/DocxNatifAdapter'
import { GabaritDocxInvalideError } from '../../connecteurs/office/erreurs'
import { genererDocxPersonnalise } from '../../connecteurs/office/GenerationDocxAdapter'
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
import { genererExportWord } from '../../logique-metier/export/genererExportWord'
import { verifierBlocageExport } from '../../logique-metier/export/verifierBlocageExport'
import { obtenirDefinitionGabarit } from '../../logique-metier/gabarits/catalogue'
import type { ChampTableauDynamique } from '../../logique-metier/gabarits/definitionGabarit'
import { construireObjectifAssistantSection } from '../../logique-metier/raisonnement/assistantSection'
import RenduGabarit from '../composants/RenduGabarit.vue'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { libelleStatut, messageSysteme, type CodeMessageSysteme } from '../i18n/messages'
import { adaptateurAvecBascule, construireAdaptateursIA } from '../stores/construireAdaptateursIA'
import { useClientConfigStore } from '../stores/useClientConfigStore'
import { useConnexionRelaisIAStore } from '../stores/useConnexionRelaisIAStore'
import { useGabaritExportStore } from '../stores/useGabaritExportStore'
import { NOMS_FOURNISSEURS } from '../stores/usePanneauChatStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useReasoningEngineStore } from '../stores/useReasoningEngineStore'
import { useSectionsStore, type ResultatActionSection } from '../stores/useSectionsStore'

const props = defineProps<{ projectId: string; sectionId: string }>()

const route = useRoute()
const sectionsStore = useSectionsStore()
const projetsStore = useProjectsStore()
const gabaritExportStore = useGabaritExportStore()
const configStore = useClientConfigStore()
const relaisStore = useConnexionRelaisIAStore()
const reasoningStore = useReasoningEngineStore()
const section = ref<Section | undefined>(undefined)
const projet = ref<Project | undefined>(undefined)
const gabaritSelectionneId = ref<string>('')
const nomNouveauGabarit = ref('')
const erreurGabaritExport = ref<string | null>(null)
const contenu = ref('')
const motifRejet = ref('')
const motifForcage = ref('')
const nouvelApprobateur = ref('')
const nouvelAvisRelecteurId = ref('')
const nouvelAvisRelecteurTexte = ref('')
const sectionCibleLienId = ref('')
const dernierResultat = ref<ResultatActionSection | undefined>(undefined)
let minuteurSauvegarde: ReturnType<typeof setTimeout> | undefined

// Génération de brouillon par adaptation (§4.1bis, Phase 33, TD-031,
// URS-F-060 à 064).
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
 * URS-F-061 : "jamais de validation globale en un clic" — chaque section
 * du gabarit (au sens `DefinitionSection`, pas l'objet `Section` lui-même)
 * doit être explicitement relue avant que le bouton de validation ne
 * s'active. Volontairement non persisté : recharger la page en cours de
 * revue doit forcer une nouvelle relecture complète, jamais réutiliser
 * silencieusement une confirmation d'une visite précédente.
 */
const sousSectionsRevues = ref<Set<string>>(new Set())

// Assistant contextuel par section (Phase 38, Option 1, TD-045) —
// délègue au Reasoning Engine déjà construit (Phase 15), jamais un second
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

const nomFournisseurActuel = computed(
  () => NOMS_FOURNISSEURS[configStore.config?.ai_provider ?? 'claude'] ?? 'Claude',
)

async function recharger(): Promise<void> {
  await sectionsStore.chargerSectionsDuProjet(props.projectId)
  const trouvee = (sectionsStore.sectionsParProjet[props.projectId] ?? []).find(
    (s) => s.id === props.sectionId,
  )
  section.value = trouvee
  contenu.value = typeof trouvee?.values.contenu === 'string' ? trouvee.values.contenu : ''

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
 * dans lequel piocher une cible de lien (FDS §3.3/§3.6).
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
  await projetsStore.ajouterLien(props.projectId, props.sectionId, sectionCibleLienId.value)
  projet.value = await projetsStore.obtenirProjet(props.projectId)
  sectionCibleLienId.value = ''
}

async function delierSection(autreSectionId: string): Promise<void> {
  await projetsStore.retirerLien(props.projectId, props.sectionId, autreSectionId)
  projet.value = await projetsStore.obtenirProjet(props.projectId)
}

onMounted(async () => {
  await recharger()
  projet.value = await projetsStore.obtenirProjet(props.projectId)
  if (projet.value?.client_id) {
    await gabaritExportStore.charger(projet.value.client_id)
    await configStore.charger(projet.value.client_id)
    await relaisStore.charger()
    await reasoningStore.charger(projet.value.client_id)
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
})

// Sauvegarde automatique locale, debounce court (URS-F-009) — uniquement
// pour le repli générique (pas de gabarit défini pour ce template_type) ;
// RenduGabarit gère son propre debounce par champ pour un gabarit défini.
watch(contenu, (valeur) => {
  if (definitionGabarit.value) return
  if (minuteurSauvegarde) clearTimeout(minuteurSauvegarde)
  minuteurSauvegarde = setTimeout(() => {
    void sectionsStore.mettreAJourValeurs(props.sectionId, { contenu: valeur })
  }, 400)
})

async function majValeursGabarit(valeurs: Record<string, string | number | null>): Promise<void> {
  // `valeurs` est déjà l'instantané complet et à jour calculé par
  // RenduGabarit — jamais refusionné ici avec `section.value.values`, qui
  // pourrait être en retard d'un aller-retour de sauvegarde (course
  // trouvée en navigateur entre deux champs modifiés rapidement).
  await sectionsStore.mettreAJourValeurs(props.sectionId, valeurs)
  await recharger()
}

async function majTableGabarit(
  cleTable: string,
  lignes: Array<Record<string, string | number | null>>,
): Promise<void> {
  await sectionsStore.mettreAJourTable(props.sectionId, cleTable, lignes)
  await recharger()
}

// Export (FS §4.3, URS-F-020/021/022/027/028ter).
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

function telechargerFichier(nomFichier: string, contenu: string, typeMime: string): void {
  const blob = new Blob([contenu], { type: typeMime })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(url)
}

async function journaliserEtReinitialiser(): Promise<void> {
  await sectionsStore.journaliserExport(props.sectionId, blocageExport.value.bloque)
  exportForce.value = false
  await recharger()
}

async function exporterJSON(): Promise<void> {
  if (!section.value) return
  telechargerFichier(
    `${section.value.meta.ref || section.value.id}.json`,
    genererExportJSON(section.value),
    'application/json',
  )
  await journaliserEtReinitialiser()
}

async function exporterWord(): Promise<void> {
  if (!section.value) return
  const html = genererExportWord(section.value, definitionGabarit.value, section.value.language)
  telechargerFichier(
    `${section.value.meta.ref || section.value.id}.doc`,
    html,
    'application/msword',
  )
  await journaliserEtReinitialiser()
}

/**
 * Import d'un gabarit `.docx` client (Phase 26, TD-024, URS-F-023/024) —
 * refusé par le store lui-même (`importerGabarit`) si les éléments
 * obligatoires (bloc de signatures, historique des révisions) ne sont pas
 * mappés (URS-F-026), jamais enregistré "à corriger plus tard".
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

/** Exporte au format `.docx` OOXML réel du gabarit client sélectionné — équivalence de contenu avec `exporterWord` garantie par `construireDonneesExportGabarit` (URS-F-025). */
async function exporterWordGabaritClient(): Promise<void> {
  erreurGabaritExport.value = null
  if (!section.value) return
  const gabarit = gabaritExportStore.gabarits.find((g) => g.id === gabaritSelectionneId.value)
  if (!gabarit) return

  try {
    const donnees = construireDonneesExportGabarit(
      section.value,
      definitionGabarit.value,
      section.value.language,
    )
    const docx = await genererDocxPersonnalise(gabarit.fichier, donnees)
    const blob = new Blob([docx], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const url = URL.createObjectURL(blob)
    const lien = document.createElement('a')
    lien.href = url
    lien.download = `${section.value.meta.ref || section.value.id}.docx`
    lien.click()
    URL.revokeObjectURL(url)
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
    `${section.value.meta.ref || section.value.id}-${champ.field_key}.csv`,
    csv,
    'text/csv',
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
  dernierResultat.value = await sectionsStore.engagerVerification(props.sectionId)
  if (dernierResultat.value.ok) motifForcage.value = ''
  await recharger()
}

async function forcerEngagerVerification(): Promise<void> {
  dernierResultat.value = await sectionsStore.engagerVerification(
    props.sectionId,
    motifForcage.value,
  )
  await recharger()
}

async function transmettreApprobation(): Promise<void> {
  dernierResultat.value = await sectionsStore.transmettreApprobation(props.sectionId)
  await recharger()
}

async function approuver(): Promise<void> {
  dernierResultat.value = await sectionsStore.approuver(props.sectionId)
  await recharger()
}

async function forcerApprouver(): Promise<void> {
  dernierResultat.value = await sectionsStore.approuver(props.sectionId, motifForcage.value)
  await recharger()
}

async function rejeter(): Promise<void> {
  if (motifRejet.value.trim().length === 0) return
  dernierResultat.value = await sectionsStore.rejeter(props.sectionId, motifRejet.value)
  motifRejet.value = ''
  await recharger()
}

async function validerSectionIA(): Promise<void> {
  dernierResultat.value = await sectionsStore.validerSectionIA(props.sectionId)
  sousSectionsRevues.value = new Set()
  await recharger()
}

/** Extraction du texte d'un fichier de référence (.docx/.pdf) — même patron que RevueStructureProcedure.vue (Phase 25). */
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
      relayUrl: relaisStore.connexion?.relayUrl,
      jetonRelais: relaisStore.connexion?.jeton,
    })
    const resultat = await sectionsStore.genererBrouillonIA(
      props.sectionId,
      {
        texteDocumentReference: texteDocumentReference.value,
        nomDocumentReference:
          nomDocumentReference.value.trim() || `Texte collé — ${new Date().toLocaleString()}`,
        contexteNouveauCas: contexteNouveauCas.value,
        confirmationDroitUsage: confirmationDroitUsage.value,
        actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
      },
      adaptateurAvecBascule(principal, local),
    )
    if (!resultat.ok) {
      erreurGeneration.value =
        resultat.motif === 'gabarit_introuvable'
          ? 'Aucun gabarit défini pour ce type de section — génération impossible.'
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
      relayUrl: relaisStore.connexion?.relayUrl,
      jetonRelais: relaisStore.connexion?.jeton,
    })
    const { response } = await reasoningStore.executerRaisonnement(projet.value.client_id, {
      objectif: construireObjectifAssistantSection(section.value, question),
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
  if (nouvelApprobateur.value.trim().length === 0) return
  await sectionsStore.assignerApprobateurFinal(props.sectionId, nouvelApprobateur.value.trim())
  nouvelApprobateur.value = ''
  await recharger()
}

async function ajouterAvisRelecteur(): Promise<void> {
  if (
    nouvelAvisRelecteurId.value.trim().length === 0 ||
    nouvelAvisRelecteurTexte.value.trim().length === 0
  ) {
    return
  }
  await sectionsStore.ajouterAvisRelecteur(
    props.sectionId,
    nouvelAvisRelecteurId.value.trim(),
    nouvelAvisRelecteurTexte.value.trim(),
  )
  nouvelAvisRelecteurId.value = ''
  nouvelAvisRelecteurTexte.value = ''
  await recharger()
}
</script>

<template>
  <main v-if="section" class="editeur-section">
    <RouterLink
      :to="{ name: 'fiche-projet', params: { projectId: props.projectId } }"
      class="no-print"
    >
      &larr; Fiche projet
    </RouterLink>
    <h1>{{ section.meta.titre }}</h1>
    <p class="meta">
      {{ section.template_type }} — statut :
      <strong>{{ libelleStatut(section.status, section.language) }}</strong>
    </p>

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

    <section
      v-if="section.status === 'brouillon_aide' && definitionGabarit && projet?.client_id"
      class="generation-brouillon no-print"
    >
      <h2>Génération de brouillon par adaptation (§4.1bis)</h2>
      <p class="rappel">
        Adapte un document de référence (structure, langage, raisonnement) au contexte du nouveau
        cas — le résultat reste au statut « proposé par IA — non validé » tant que chaque section du
        gabarit n'a pas été relue explicitement (URS-F-061).
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
        <input v-model="nomDocumentReference" type="text" placeholder="ex. IQ ligne A11 (2024)" />
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

      <p v-if="erreurGeneration" class="bandeau-erreur" role="alert">{{ erreurGeneration }}</p>

      <button
        type="button"
        :disabled="
          enGeneration || texteDocumentReference.trim().length === 0 || !confirmationDroitUsage
        "
        @click="genererBrouillon"
      >
        {{ enGeneration ? 'Génération en cours…' : 'Générer le brouillon' }}
      </button>
    </section>

    <section v-if="projet?.client_id" class="assistant-section no-print">
      <h2>Assistant contextuel (Phase 38)</h2>
      <p class="rappel">
        Pose une question sur cette section précise — l'assistant voit son contenu actuel et dispose
        des mêmes outils de traçabilité que le Reasoning Engine (§4.21). Fournisseur actuel :
        {{ nomFournisseurActuel }}. Jamais une écriture automatique dans la section — une réponse,
        jamais une action.
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
        <button type="submit" :disabled="assistantEnCours || questionAssistant.trim().length === 0">
          {{ assistantEnCours ? 'Réflexion en cours…' : 'Poser la question' }}
        </button>
      </form>
    </section>

    <section v-if="section.status === 'propose_par_ia_non_valide'" class="revue-ia no-print">
      <h2>Revue du brouillon proposé par IA (URS-F-061)</h2>
      <p v-if="documentReferenceUtilise">
        Document de référence : « {{ documentReferenceUtilise.filename }} » (URS-F-064)
      </p>
      <p class="rappel">
        Relisez explicitement chaque section ci-dessus avant de pouvoir valider — aucune validation
        globale en un clic n'est possible.
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

    <section class="liens-sections no-print">
      <h2>Liens vers d'autres sections (FDS §3.3/§3.6)</h2>
      <p class="rappel">
        Un lien vers la section requise (ex. Contexte procédé pour l'OQ/PQ, Plan de métrologie pour
        l'IQ) est la façon normale de satisfaire un garde-fou de finalisation — « Forcer » reste
        réservé aux exceptions justifiées.
      </p>
      <ul v-if="sectionsLiees.length > 0" class="liste-liens">
        <li v-for="s in sectionsLiees" :key="s.id">
          {{ s.meta.titre }} ({{ s.template_type }})
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
          <select v-model="sectionCibleLienId" :disabled="sectionsLiablesRestantes.length === 0">
            <option value="">— choisir une section —</option>
            <option v-for="s in sectionsLiablesRestantes" :key="s.id" :value="s.id">
              {{ s.meta.titre }} ({{ s.template_type }})
            </option>
          </select>
        </label>
        <button type="button" :disabled="!sectionCibleLienId" @click="lierSectionSelectionnee">
          Lier
        </button>
      </div>
    </section>

    <section v-if="section.status !== 'valide_en_interne'" class="workflow no-print">
      <h2>Workflow (URS-F-011, URS-F-014ter/quater)</h2>
      <p>
        Approbateur final :
        <strong>{{ section.workflow.approver_final ?? 'non renseigné' }}</strong>
      </p>
      <div class="ligne-formulaire">
        <label>
          Identifiant approbateur final
          <input v-model="nouvelApprobateur" type="text" placeholder="ex. qa-1" />
        </label>
        <button type="button" @click="assignerApprobateur">Assigner</button>
      </div>

      <p>Avis relecteurs : {{ section.workflow.reviewers.length }}</p>
      <ul v-if="section.workflow.reviewers.length > 0" class="liste-avis">
        <li v-for="(avis, index) in section.workflow.reviewers" :key="index">
          {{ avis.user_id }} — {{ avis.avis }}
        </li>
      </ul>
      <div class="ligne-formulaire">
        <label>
          Identifiant relecteur
          <input v-model="nouvelAvisRelecteurId" type="text" placeholder="ex. revu-1" />
        </label>
        <label>
          Avis
          <input v-model="nouvelAvisRelecteurTexte" type="text" placeholder="ex. Favorable" />
        </label>
        <button type="button" @click="ajouterAvisRelecteur">Ajouter l'avis</button>
      </div>
    </section>

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
        <button type="button" @click="transmettreApprobation">Transmettre à l'approbation</button>
        <label>
          Motif de rejet
          <input v-model="motifRejet" type="text" />
        </label>
        <button type="button" class="bouton-danger" @click="rejeter">Rejeter</button>
      </template>

      <template v-else-if="section.status === 'en_approbation'">
        <button type="button" @click="approuver">Approuver</button>
        <label>
          Motif de rejet
          <input v-model="motifRejet" type="text" />
        </label>
        <button type="button" class="bouton-danger" @click="rejeter">Rejeter</button>
      </template>

      <p v-else-if="section.status === 'valide_en_interne'" class="verrouille">
        Section verrouillée (validée en interne — pas une signature électronique opposable).
        Nouvelle révision : backlog.
      </p>
    </div>

    <section class="export no-print">
      <h2>Export (FS §4.3)</h2>

      <div v-if="blocageExport.bloque && !exportForce" class="blocage" role="alert">
        <p>{{ blocageExport.motif }}</p>
        <button type="button" @click="exportForce = true">
          Forcer l'export malgré l'avertissement
        </button>
      </div>

      <div v-else class="actions-export">
        <button type="button" @click="exporterJSON">Exporter en JSON</button>
        <button type="button" @click="exporterWord">Exporter en Word (.doc)</button>
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
        <h3>Gabarit d'export personnalisé (URS-F-023 à 026)</h3>
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
          <input v-model="nomNouveauGabarit" type="text" placeholder="Nom du gabarit à importer" />
          <label class="bouton-fichier">
            Importer un gabarit (.docx)
            <input type="file" accept=".docx" @change="importerGabaritExport" />
          </label>
        </div>
      </div>
    </section>
  </main>
  <p v-else>Chargement…</p>
</template>

<style scoped>
.editeur-section {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}

.meta {
  color: var(--vp-texte-secondaire);
}

.champ-contenu {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

textarea,
input {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

/* `.bouton-danger` (Phase 41) : « Rejeter » ne doit jamais avoir le même
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
  border: 1px solid var(--vp-statut-requalification-en-retard);
  background-color: var(--vp-marque-fond-leger);
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
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  cursor: pointer;
}

.bandeau-erreur {
  color: var(--vp-statut-requalification-en-retard);
}

/* Impression / export PDF (FS §4.3) : uniquement le contenu du livrable,
   jamais le chrome applicatif (navigation, actions de workflow, export). */
@media print {
  .no-print {
    display: none !important;
  }
}
</style>

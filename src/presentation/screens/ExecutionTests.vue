<script setup lang="ts">
// Exécution d'un Test approuvé + preuves associées —
// écran manquant trouvé en simulant un vrai
// parcours de qualification de bout en bout (§5.31 CONTEXTE-REPRISE-SESSION.
// md) : jusqu'ici, rédiger un protocole OQ était possible mais l'exécuter
// formellement (résultat par étape, mesures, preuves, clôture avec
// verdict explicite) ne l'était pas — les résultats étaient saisis
// directement dans le tableau libre du gabarit, sans piste de preuve
// dédiée ni garde-fou d'immutabilité post-clôture.
import { computed, onMounted, ref } from 'vue'
import ModaleSignature from '../composants/ModaleSignature.vue'
import { messageRefusSignature } from '../i18n/libellesSignature'
import { useClientsStore } from '../stores/useClientsStore'
import { useEvidenceStore } from '../stores/useEvidenceStore'
import { useExecutionStore } from '../stores/useExecutionStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import { useTestDefinitionStore } from '../stores/useTestDefinitionStore'
import type {
  ResultatEtapeExecution,
  TypeEvidence,
  TypeExecutionEvent,
  VerdictExecution,
} from '../../logique-metier/domaine/types'
import { useEnvoiUnique } from '../composables/useEnvoiUnique'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const testStore = useTestDefinitionStore()
const executionStore = useExecutionStore()
const evidenceStore = useEvidenceStore()

// Un seul envoi à la fois (audit d'intégrité M2 : deux clics créaient deux
// enregistrements) et refus du serveur affichés (M1).
const { enCours: envoiEnCours, executer } = useEnvoiUnique()
const erreurEnvoi = ref<string | null>(null)

async function envoyer(action: () => Promise<unknown>): Promise<void> {
  erreurEnvoi.value = null
  try {
    await executer(action)
  } catch (e) {
    erreurEnvoi.value = e instanceof Error ? e.message : String(e)
  }
}

const nomClient = ref<string | null>(null)
const erreurParExecution = ref<Record<string, string>>({})

const LIBELLES_ERREUR_EXECUTION: Record<string, string> = {
  execution_introuvable: 'Exécution introuvable — elle a peut-être été supprimée entre-temps.',
  execution_deja_cloturee:
    'Cette exécution est déjà clôturée — plus aucune modification possible (immutabilité post-clôture).',
  etape_inconnue: 'Étape inconnue pour ce test.',
  etape_execution_introuvable:
    "Étape d'exécution introuvable — elle a peut-être été supprimée entre-temps.",
  evidence_introuvable: 'Preuve introuvable — elle a peut-être été supprimée entre-temps.',
  type_non_document: 'Cette preuve ne peut pas recevoir de localisation (pas de type document).',
}

function libelleErreurExecution(code: string): string {
  return LIBELLES_ERREUR_EXECUTION[code] ?? "Une erreur inattendue s'est produite."
}

const LIBELLES_VERDICT: Record<VerdictExecution, string> = {
  conforme: 'Conforme',
  non_conforme: 'Non conforme',
  conforme_avec_ecart: 'Conforme avec écart',
}

const LIBELLES_RESULTAT_ETAPE: Record<ResultatEtapeExecution, string> = {
  conforme: 'Conforme',
  non_conforme: 'Non conforme',
  non_applicable: 'Non applicable',
}

const LIBELLES_TYPE_EVENEMENT: Record<TypeExecutionEvent, string> = {
  commentaire: 'Commentaire',
  action: 'Action',
  retest: 'Retest',
  deviation: 'Déviation',
  changement: 'Changement',
  arret: 'Arrêt',
  externe: 'Externe',
  continuer: 'Continuer',
  correction: 'Correction de résultat',
}
/** Types proposés à la saisie : la correction est créée par le serveur, jamais saisie à la main. */
const TYPES_EVENEMENT_SAISISSABLES = Object.entries(LIBELLES_TYPE_EVENEMENT).filter(
  ([code]) => code !== 'correction',
) as [TypeExecutionEvent, string][]

const LIBELLES_TYPE_PREUVE: Record<TypeEvidence, string> = {
  native: 'Native (observation directe)',
  document: 'Document',
}

function formaterHorodatage(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })
    : '—'
}

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await structureStore.charger(props.clientId)
  await testStore.charger(props.clientId)
  await executionStore.charger(props.clientId)
  await evidenceStore.charger(props.clientId)
})

const testsApprouves = computed(() => testStore.tests.filter((t) => t.statut === 'approuve'))

// --- Démarrage d'exécution ---
const testSelectionne = ref('')
const assetNodeSelectionne = ref('')
const erreurDemarrage = ref<string | null>(null)

async function demarrer(...args: Parameters<typeof demarrerSansGarde>): Promise<void> {
  await envoyer(() => demarrerSansGarde(...args))
}

async function demarrerSansGarde(): Promise<void> {
  erreurDemarrage.value = null
  if (!testSelectionne.value) return
  const resultat = await executionStore.demarrerExecution(props.clientId, {
    testId: testSelectionne.value,
    assetNodeId: assetNodeSelectionne.value || null,
  })
  if ('erreur' in resultat) {
    erreurDemarrage.value =
      resultat.erreur === 'test_non_approuve'
        ? 'Ce test doit être approuvé avant de pouvoir être exécuté.'
        : 'Test introuvable.'
    return
  }
  testSelectionne.value = ''
  assetNodeSelectionne.value = ''
}

function testDe(executionId: string) {
  const execution = executionStore.executions.find((e) => e.id === executionId)
  return execution ? testStore.tests.find((t) => t.id === execution.test_id) : undefined
}

function numeroEtape(executionId: string, testStepId: string): number {
  return (testDe(executionId)?.etapes ?? []).findIndex((e) => e.id === testStepId) + 1
}

// Signal purement informatif, jamais un blocage : clôturer après un « Arrêt »
// avec des étapes non jouées reste légitime.
function nombreEtapesSansResultat(executionId: string): number {
  const renseignees = new Set(
    executionStore.etapesExecution(executionId).map((e) => e.test_step_id),
  )
  return (testDe(executionId)?.etapes ?? []).filter((e) => !renseignees.has(e.id)).length
}

const executionsEnCours = computed(() =>
  executionStore.executions.filter((e) => e.statut === 'en_cours'),
)
const executionsTerminees = computed(() =>
  executionStore.executions.filter((e) => e.statut === 'terminee'),
)

// --- Résultat d'étape ---
const resultatsBrouillon = ref<Record<string, ResultatEtapeExecution>>({})
const observationsBrouillon = ref<Record<string, string>>({})

function cleEtape(executionId: string, testStepId: string): string {
  return `${executionId}:${testStepId}`
}

async function enregistrerResultat(
  ...args: Parameters<typeof enregistrerResultatSansGarde>
): Promise<void> {
  await envoyer(() => enregistrerResultatSansGarde(...args))
}

async function enregistrerResultatSansGarde(
  executionId: string,
  testStepId: string,
): Promise<void> {
  const cle = cleEtape(executionId, testStepId)
  const resultat = resultatsBrouillon.value[cle]
  if (!resultat) {
    erreurParExecution.value[executionId] = "Choisissez d'abord le résultat de l'étape."
    return
  }
  erreurParExecution.value[executionId] = ''
  const resultatMutation = await executionStore.enregistrerResultatEtape(
    props.clientId,
    executionId,
    {
      testStepId,
      resultat,
      observation: observationsBrouillon.value[cle]?.trim() ?? '',
    },
  )
  if ('erreur' in resultatMutation) {
    erreurParExecution.value[executionId] = libelleErreurExecution(resultatMutation.erreur)
  }
}

// --- Correction tracée d'un résultat (décision du 29/09/2026) ---
const correctionEnCours = ref<{
  executionId: string
  executionStepId: string
  resultat: ResultatEtapeExecution | ''
  observation: string
  motif: string
} | null>(null)

function ouvrirCorrection(executionId: string, executionStepId: string): void {
  const actuel = executionStore.executionSteps.find((e) => e.id === executionStepId)
  correctionEnCours.value = {
    executionId,
    executionStepId,
    resultat: '',
    observation: actuel?.observation ?? '',
    motif: '',
  }
}

async function enregistrerCorrection(): Promise<void> {
  const correction = correctionEnCours.value
  if (!correction) return
  if (!correction.resultat) {
    erreurParExecution.value[correction.executionId] = 'Choisissez le résultat corrigé.'
    return
  }
  if (correction.motif.trim().length === 0) {
    erreurParExecution.value[correction.executionId] =
      'Indiquez le motif de la correction : il est conservé dans l’enregistrement.'
    return
  }
  erreurParExecution.value[correction.executionId] = ''
  const resultat = correction.resultat
  await envoyer(async () => {
    await executionStore.corrigerResultatEtape(
      props.clientId,
      correction.executionId,
      correction.executionStepId,
      { resultat, observation: correction.observation.trim(), motif: correction.motif.trim() },
    )
    correctionEnCours.value = null
  })
}

// --- Déviation depuis une étape non conforme (audit UX exécution #7) ---
const champsDescriptionEvenement = ref<Record<string, HTMLInputElement | null>>({})

function declarerDeviation(executionId: string, testStepId: string, observation: string): void {
  const etape = testDe(executionId)?.etapes.find((e) => e.id === testStepId)
  typeEvenementBrouillon.value[executionId] = 'deviation'
  descriptionEvenementBrouillon.value[executionId] =
    `Étape ${numeroEtape(executionId, testStepId)} non conforme (${etape?.action ?? ''})` +
    (observation ? ` : ${observation}` : '')
  champsDescriptionEvenement.value[executionId]?.focus()
}

// --- Mesures ---
const mesuresBrouillon = ref<Record<string, { libelle: string; valeur: string; unite: string }>>({})

function mesureBrouillon(executionStepId: string): {
  libelle: string
  valeur: string
  unite: string
} {
  const existante = mesuresBrouillon.value[executionStepId]
  if (existante) return existante
  const nouvelle = { libelle: '', valeur: '', unite: '' }
  mesuresBrouillon.value[executionStepId] = nouvelle
  return nouvelle
}

async function ajouterMesure(...args: Parameters<typeof ajouterMesureSansGarde>): Promise<void> {
  await envoyer(() => ajouterMesureSansGarde(...args))
}

async function ajouterMesureSansGarde(executionId: string, executionStepId: string): Promise<void> {
  const brouillon = mesuresBrouillon.value[executionStepId]
  if (!brouillon || brouillon.libelle.trim().length === 0 || brouillon.valeur.trim().length === 0) {
    erreurParExecution.value[executionId] = 'Renseignez le libellé et la valeur de la mesure.'
    return
  }
  // Valeur numérique (virgule française acceptée) — audit UX exécution #3 :
  // « abc » était enregistré puis figé dans l'enregistrement immuable.
  if (!/^-?\d+([.,]\d+)?$/.test(brouillon.valeur.trim())) {
    erreurParExecution.value[executionId] =
      'La valeur d’une mesure doit être un nombre (ex. 12,5 ou -3).'
    return
  }
  erreurParExecution.value[executionId] = ''
  const resultat = await executionStore.ajouterMesure(props.clientId, executionStepId, {
    libelle: brouillon.libelle.trim(),
    valeur: brouillon.valeur.trim(),
    unite: brouillon.unite.trim() || null,
  })
  if ('erreur' in resultat) {
    erreurParExecution.value[executionId] = libelleErreurExecution(resultat.erreur)
    return
  }
  mesuresBrouillon.value[executionStepId] = { libelle: '', valeur: '', unite: '' }
}

// --- Événements d'exécution ---
const typeEvenementBrouillon = ref<Record<string, TypeExecutionEvent | ''>>({})
const descriptionEvenementBrouillon = ref<Record<string, string>>({})
/** Exécutions pour lesquelles une déviation vient d'être reportée au journal d'anomalies. */
const deviationReportee = ref<Record<string, boolean>>({})

async function consignerEvenement(
  ...args: Parameters<typeof consignerEvenementSansGarde>
): Promise<void> {
  await envoyer(() => consignerEvenementSansGarde(...args))
}

async function consignerEvenementSansGarde(executionId: string): Promise<void> {
  const type = typeEvenementBrouillon.value[executionId]
  if (!type) {
    erreurParExecution.value[executionId] = "Choisissez le type d'événement."
    return
  }
  const description = descriptionEvenementBrouillon.value[executionId]?.trim()
  if (!description) {
    erreurParExecution.value[executionId] = "Décrivez l'événement avant de le consigner."
    return
  }
  erreurParExecution.value[executionId] = ''
  const resultat = await executionStore.consignerEvenement(props.clientId, executionId, {
    type,
    description,
    qualityEventId: null,
  })
  if ('erreur' in resultat) {
    erreurParExecution.value[executionId] = libelleErreurExecution(resultat.erreur)
    return
  }
  descriptionEvenementBrouillon.value[executionId] = ''
  deviationReportee.value[executionId] = type === 'deviation' && resultat.quality_event_id !== null
}

// --- Preuves (Evidence) ---
const typePreuveBrouillon = ref<Record<string, TypeEvidence>>({})
const titrePreuveBrouillon = ref<Record<string, string>>({})
const descriptionPreuveBrouillon = ref<Record<string, string>>({})
const referenceLocalisationBrouillon = ref<Record<string, string>>({})
const etapePreuveBrouillon = ref<Record<string, string>>({})
const fichierPreuveBrouillon = ref<Record<string, File | null>>({})
const champsFichierPreuve = ref<Record<string, HTMLInputElement | null>>({})

function choisirFichierPreuve(executionId: string, evenement: Event): void {
  fichierPreuveBrouillon.value[executionId] =
    (evenement.target as HTMLInputElement).files?.[0] ?? null
}

async function ouvrirFichierPreuve(evidenceId: string, locationId: string): Promise<void> {
  await envoyer(async () => {
    const blob = await evidenceStore.obtenirFichier(props.clientId, evidenceId, locationId)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  })
}

/** Nom lisible d'une pièce jointe (référence : « nom · type · taille · SHA-256 … »). */
function nomFichierPreuve(reference: string): string {
  return reference.split(' · ')[0] ?? reference
}

async function enregistrerPreuve(
  ...args: Parameters<typeof enregistrerPreuveSansGarde>
): Promise<void> {
  await envoyer(() => enregistrerPreuveSansGarde(...args))
}

async function enregistrerPreuveSansGarde(executionId: string): Promise<void> {
  const type = typePreuveBrouillon.value[executionId] ?? 'native'
  const titre = titrePreuveBrouillon.value[executionId]?.trim()
  if (!titre) {
    erreurParExecution.value[executionId] = 'Donnez un titre à la preuve avant de l’enregistrer.'
    return
  }
  erreurParExecution.value[executionId] = ''
  const resultat = await evidenceStore.enregistrerPreuve(props.clientId, executionId, {
    executionStepId: etapePreuveBrouillon.value[executionId] || null,
    type,
    titre,
    description: descriptionPreuveBrouillon.value[executionId]?.trim() ?? '',
  })
  if ('erreur' in resultat) {
    erreurParExecution.value[executionId] = libelleErreurExecution(resultat.erreur)
    return
  }
  if (type === 'document') {
    const reference = referenceLocalisationBrouillon.value[executionId]?.trim()
    if (reference) {
      const resultatLocalisation = await evidenceStore.ajouterLocalisation(
        props.clientId,
        resultat.id,
        { systeme: 'github', reference },
      )
      if ('erreur' in resultatLocalisation) {
        // La preuve elle-même est déjà enregistrée à ce stade — seule la
        // localisation associée a échoué, ne pas ré-effacer le brouillon
        // pour permettre de retenter juste la référence.
        erreurParExecution.value[executionId] = libelleErreurExecution(resultatLocalisation.erreur)
        return
      }
    }
  }
  const fichier = fichierPreuveBrouillon.value[executionId]
  if (fichier) {
    try {
      await evidenceStore.joindreFichier(props.clientId, resultat.id, fichier)
    } catch (e) {
      // La preuve est enregistrée ; seul le fichier a échoué : le brouillon
      // reste pour permettre de le rejoindre.
      erreurParExecution.value[executionId] =
        `Preuve enregistrée, mais ${e instanceof Error ? e.message : String(e)}`
      return
    }
  }
  titrePreuveBrouillon.value[executionId] = ''
  descriptionPreuveBrouillon.value[executionId] = ''
  referenceLocalisationBrouillon.value[executionId] = ''
  etapePreuveBrouillon.value[executionId] = ''
  fichierPreuveBrouillon.value[executionId] = null
  const champ = champsFichierPreuve.value[executionId]
  if (champ) champ.value = ''
}

// --- Clôture ---
const verdictBrouillon = ref<Record<string, VerdictExecution>>({})

async function cloturer(...args: Parameters<typeof cloturerSansGarde>): Promise<void> {
  await envoyer(() => cloturerSansGarde(...args))
}

async function cloturerSansGarde(executionId: string): Promise<void> {
  const verdict = verdictBrouillon.value[executionId]
  if (!verdict) {
    erreurParExecution.value[executionId] = 'Choisissez le verdict avant de clôturer.'
    return
  }
  // Clôture irréversible (audit UX du 26/09/2026) : confirmation explicite,
  // et alerte si le verdict « Conforme » contredit ce qui a été consigné.
  const alertes: string[] = []
  const sansResultat = nombreEtapesSansResultat(executionId)
  if (sansResultat > 0) alertes.push(`${sansResultat} étape(s) sans résultat`)
  const nonConformes = executionStore
    .resultatsEnVigueur(executionId)
    .filter((e) => e.resultat === 'non_conforme').length
  const deviations = executionStore
    .evenementsExecution(executionId)
    .filter((e) => e.type === 'deviation').length
  if (verdict === 'conforme') {
    if (nonConformes > 0) alertes.push(`${nonConformes} étape(s) non conforme(s)`)
    if (deviations > 0) alertes.push(`${deviations} déviation(s) consignée(s)`)
  }
  // Clôture signée (décision du 26/09/2026) : le mot de passe est saisi
  // dans la fenêtre de signature et vérifié par le serveur.
  erreurParExecution.value[executionId] = ''
  signatureCloture.value = {
    executionId,
    verdict,
    avertissement:
      alertes.length > 0
        ? `Attention : ${alertes.join(', ')}. Vérifiez que ce verdict est bien justifié.`
        : null,
    erreur: null,
    enCours: false,
  }
}

const signatureCloture = ref<{
  executionId: string
  verdict: VerdictExecution
  avertissement: string | null
  erreur: string | null
  enCours: boolean
} | null>(null)

async function signerCloture(motDePasse: string): Promise<void> {
  const demande = signatureCloture.value
  if (!demande) return
  demande.enCours = true
  demande.erreur = null
  try {
    const resultat = await executionStore.cloturerExecution(
      props.clientId,
      demande.executionId,
      demande.verdict,
      motDePasse,
    )
    if ('erreur' in resultat) {
      const refusSignature = messageRefusSignature(resultat.erreur)
      if (refusSignature) {
        demande.erreur = refusSignature
        return
      }
      erreurParExecution.value[demande.executionId] = libelleErreurExecution(resultat.erreur)
    }
    signatureCloture.value = null
  } catch (e) {
    demande.erreur = e instanceof Error ? e.message : 'La clôture n’a pas pu être enregistrée.'
  } finally {
    demande.enCours = false
  }
}
</script>

<template>
  <main class="execution-tests">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Clients</RouterLink>
    <h1>Exécution de tests — {{ nomClient ?? props.clientId }}</h1>
    <p v-if="erreurEnvoi" class="bandeau-erreur" role="alert">{{ erreurEnvoi }}</p>
    <p class="rappel">
      Le verdict n'est jamais déduit des résultats d'étape — toujours une décision explicite à la
      clôture. Immutable après clôture.
    </p>

    <section class="bloc-demarrage">
      <h2>Démarrer une exécution</h2>
      <form class="formulaire" @submit.prevent="demarrer">
        <label>
          Test approuvé
          <select v-model="testSelectionne" required>
            <option value="">— choisir —</option>
            <option v-for="t in testsApprouves" :key="t.id" :value="t.id">{{ t.titre }}</option>
          </select>
        </label>
        <label>
          Nœud Structure Système (optionnel)
          <select v-model="assetNodeSelectionne">
            <option value="">— aucun —</option>
            <option v-for="noeud in structureStore.noeuds" :key="noeud.id" :value="noeud.id">
              {{ noeud.name }} ({{ noeud.code }})
            </option>
          </select>
        </label>
        <p v-if="erreurDemarrage" class="bandeau-erreur" role="alert">{{ erreurDemarrage }}</p>
        <button type="submit" :disabled="envoiEnCours">Démarrer l'exécution</button>
      </form>
    </section>

    <section v-if="executionsEnCours.length > 0" class="bloc-en-cours">
      <h2>Exécutions en cours</h2>
      <article v-for="execution in executionsEnCours" :key="execution.id" class="carte-execution">
        <h3>{{ testDe(execution.id)?.titre ?? execution.test_id }}</h3>
        <p class="meta">
          Démarrée le {{ formaterHorodatage(execution.date_debut) }}, exécutant
          {{ execution.executant }}
        </p>
        <p v-if="erreurParExecution[execution.id]" class="bandeau-erreur" role="alert">
          {{ erreurParExecution[execution.id] }}
        </p>

        <h4>Étapes</h4>
        <ol class="liste-etapes">
          <li v-for="(etape, index) in testDe(execution.id)?.etapes ?? []" :key="etape.id">
            <fieldset class="etape">
              <legend>
                Étape {{ index + 1 }} : {{ etape.action }} —
                <em>attendu : {{ etape.resultat_attendu }}</em>
              </legend>
              <template v-if="executionStore.resultatsEtape(execution.id, etape.id).length === 0">
                <div class="ligne-formulaire">
                  <label>
                    Résultat de l'étape {{ index + 1 }}
                    <select v-model="resultatsBrouillon[cleEtape(execution.id, etape.id)]">
                      <option value="">— choisir —</option>
                      <option
                        v-for="(libelle, code) in LIBELLES_RESULTAT_ETAPE"
                        :key="code"
                        :value="code"
                      >
                        {{ libelle }}
                      </option>
                    </select>
                  </label>
                  <label>
                    Observation
                    <input
                      v-model="observationsBrouillon[cleEtape(execution.id, etape.id)]"
                      type="text"
                    />
                  </label>
                  <button
                    type="button"
                    :disabled="envoiEnCours"
                    @click="enregistrerResultat(execution.id, etape.id)"
                  >
                    Enregistrer le résultat
                  </button>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="(es, rang) in executionStore.resultatsEtape(execution.id, etape.id)"
                  :key="es.id"
                  :class="[
                    'resultat-enregistre',
                    {
                      'resultat-corrige':
                        rang < executionStore.resultatsEtape(execution.id, etape.id).length - 1,
                    },
                  ]"
                >
                  <p>
                    <template
                      v-if="rang < executionStore.resultatsEtape(execution.id, etape.id).length - 1"
                    >
                      <s>{{ LIBELLES_RESULTAT_ETAPE[es.resultat] }}</s>
                      <span class="meta"> (corrigé)</span>
                    </template>
                    <template v-else>
                      Résultat : <strong>{{ LIBELLES_RESULTAT_ETAPE[es.resultat] }}</strong>
                    </template>
                    <span v-if="es.observation"> — {{ es.observation }}</span>
                    <span class="meta"> · {{ formaterHorodatage(es.horodatage) }}</span>
                  </p>
                  <p v-if="executionStore.mesuresEtape(es.id).length > 0" class="mesures">
                    Mesures :
                    <span v-for="m in executionStore.mesuresEtape(es.id)" :key="m.id">
                      {{ m.libelle }} = {{ m.valeur }}{{ m.unite ? ` ${m.unite}` : '' }} ;
                    </span>
                  </p>
                  <template
                    v-if="rang === executionStore.resultatsEtape(execution.id, etape.id).length - 1"
                  >
                    <div class="actions-etape">
                      <button
                        type="button"
                        :disabled="envoiEnCours"
                        @click="ouvrirCorrection(execution.id, es.id)"
                      >
                        Corriger…
                      </button>
                      <button
                        v-if="es.resultat === 'non_conforme'"
                        type="button"
                        @click="declarerDeviation(execution.id, etape.id, es.observation)"
                      >
                        Déclarer une déviation
                      </button>
                    </div>
                    <div
                      v-if="correctionEnCours && correctionEnCours.executionStepId === es.id"
                      class="correction"
                      role="group"
                      :aria-label="`Correction du résultat de l'étape ${index + 1}`"
                    >
                      <label>
                        Résultat corrigé
                        <select v-model="correctionEnCours.resultat">
                          <option value="">— choisir —</option>
                          <option
                            v-for="(libelle, code) in LIBELLES_RESULTAT_ETAPE"
                            :key="code"
                            :value="code"
                          >
                            {{ libelle }}
                          </option>
                        </select>
                      </label>
                      <label>
                        Observation
                        <input v-model="correctionEnCours.observation" type="text" />
                      </label>
                      <label>
                        Motif de la correction (obligatoire, conservé dans l'enregistrement)
                        <input v-model="correctionEnCours.motif" type="text" />
                      </label>
                      <div class="actions-etape">
                        <button type="button" @click="correctionEnCours = null">Annuler</button>
                        <button
                          type="button"
                          :disabled="envoiEnCours"
                          @click="enregistrerCorrection"
                        >
                          Enregistrer la correction
                        </button>
                      </div>
                    </div>
                    <div
                      class="ajout-mesure"
                      role="group"
                      :aria-label="`Mesure de l'étape ${index + 1}`"
                    >
                      <label>
                        Mesure
                        <input v-model="mesureBrouillon(es.id).libelle" type="text" />
                      </label>
                      <label>
                        Valeur
                        <input
                          v-model="mesureBrouillon(es.id).valeur"
                          type="text"
                          inputmode="decimal"
                        />
                      </label>
                      <label>
                        Unité
                        <input v-model="mesureBrouillon(es.id).unite" type="text" />
                      </label>
                      <button
                        type="button"
                        class="bouton-mesure"
                        :disabled="envoiEnCours"
                        @click="ajouterMesure(execution.id, es.id)"
                      >
                        + Mesure
                      </button>
                    </div>
                  </template>
                </div>
              </template>
            </fieldset>
          </li>
        </ol>

        <h4>Événement</h4>
        <div class="ligne-formulaire ligne-evenement">
          <label>
            Type d'événement
            <select v-model="typeEvenementBrouillon[execution.id]">
              <option value="">— choisir —</option>
              <option
                v-for="[code, libelle] in TYPES_EVENEMENT_SAISISSABLES"
                :key="code"
                :value="code"
              >
                {{ libelle }}
              </option>
            </select>
          </label>
          <label class="champ-large">
            Description de l'événement
            <input
              :ref="
                (el) => (champsDescriptionEvenement[execution.id] = el as HTMLInputElement | null)
              "
              v-model="descriptionEvenementBrouillon[execution.id]"
              type="text"
            />
          </label>
          <button type="button" :disabled="envoiEnCours" @click="consignerEvenement(execution.id)">
            Consigner
          </button>
        </div>
        <p v-if="deviationReportee[execution.id]" class="confirmation" role="status">
          Déviation reportée au
          <RouterLink :to="{ name: 'journal-anomalies', params: { clientId: props.clientId } }">
            journal d'anomalies
          </RouterLink>
          .
        </p>
        <ul v-if="executionStore.evenementsExecution(execution.id).length > 0">
          <li v-for="ev in executionStore.evenementsExecution(execution.id)" :key="ev.id">
            {{ LIBELLES_TYPE_EVENEMENT[ev.type] }} — {{ ev.description }}
            <span class="meta">({{ ev.actor }}, {{ formaterHorodatage(ev.horodatage) }})</span>
          </li>
        </ul>

        <h4>Preuves</h4>
        <div class="ligne-formulaire ligne-preuve">
          <label>
            Type de preuve
            <select v-model="typePreuveBrouillon[execution.id]">
              <option v-for="(libelle, code) in LIBELLES_TYPE_PREUVE" :key="code" :value="code">
                {{ libelle }}
              </option>
            </select>
          </label>
          <label>
            Étape concernée
            <select v-model="etapePreuveBrouillon[execution.id]">
              <option value="">— toute l'exécution —</option>
              <option
                v-for="es in executionStore.resultatsEnVigueur(execution.id)"
                :key="es.id"
                :value="es.id"
              >
                Étape {{ numeroEtape(execution.id, es.test_step_id) }}
              </option>
            </select>
          </label>
          <label>
            Titre de la preuve
            <input v-model="titrePreuveBrouillon[execution.id]" type="text" />
          </label>
          <label>
            Description
            <input v-model="descriptionPreuveBrouillon[execution.id]" type="text" />
          </label>
          <label>
            Photo ou fichier (facultatif)
            <input
              :ref="(el) => (champsFichierPreuve[execution.id] = el as HTMLInputElement | null)"
              type="file"
              accept="image/*,application/pdf,text/plain,text/csv,.xlsx,.docx"
              capture="environment"
              @change="choisirFichierPreuve(execution.id, $event)"
            />
          </label>
          <label v-if="typePreuveBrouillon[execution.id] === 'document'">
            Référence GitHub (chemin/commit, facultatif)
            <input v-model="referenceLocalisationBrouillon[execution.id]" type="text" />
          </label>
          <button type="button" :disabled="envoiEnCours" @click="enregistrerPreuve(execution.id)">
            Enregistrer la preuve
          </button>
        </div>
        <ul v-if="evidenceStore.preuvesExecution(execution.id).length > 0">
          <li v-for="preuve in evidenceStore.preuvesExecution(execution.id)" :key="preuve.id">
            {{ preuve.titre }} ({{ LIBELLES_TYPE_PREUVE[preuve.type] }})
            <template v-for="loc in evidenceStore.localisationsPreuve(preuve.id)" :key="loc.id">
              <button
                v-if="loc.systeme === 'fichier'"
                type="button"
                class="bouton-lien"
                :title="loc.reference"
                @click="ouvrirFichierPreuve(preuve.id, loc.id)"
              >
                {{ nomFichierPreuve(loc.reference) }}
              </button>
              <span v-else> — {{ loc.reference }}</span>
            </template>
          </li>
        </ul>

        <section class="bloc-cloture" aria-label="Clôture de l'exécution">
          <h4>Clôture — action définitive</h4>
          <p v-if="nombreEtapesSansResultat(execution.id) > 0" class="avertissement" role="status">
            ⚠ {{ nombreEtapesSansResultat(execution.id) }} étape(s) sans résultat enregistré — la
            clôture reste possible (ex. après un arrêt), mais ces étapes resteront vides dans
            l'enregistrement immuable.
          </p>
          <div class="ligne-formulaire">
            <label>
              Verdict final
              <select v-model="verdictBrouillon[execution.id]">
                <option value="">— choisir —</option>
                <option v-for="(libelle, code) in LIBELLES_VERDICT" :key="code" :value="code">
                  {{ libelle }}
                </option>
              </select>
            </label>
            <button
              type="button"
              class="bouton-danger"
              :disabled="envoiEnCours"
              @click="cloturer(execution.id)"
            >
              Clôturer l'exécution…
            </button>
          </div>
        </section>
      </article>
    </section>

    <section v-if="executionsTerminees.length > 0" class="bloc-terminees">
      <h2>Exécutions terminées</h2>
      <details
        v-for="execution in executionsTerminees"
        :key="execution.id"
        class="carte-execution execution-terminee"
      >
        <summary>
          {{ testDe(execution.id)?.titre ?? execution.test_id }} — verdict :
          <strong>{{ execution.verdict ? LIBELLES_VERDICT[execution.verdict] : '—' }}</strong>
          (clôturée le {{ formaterHorodatage(execution.date_fin) }})
        </summary>
        <p class="meta">
          Démarrée le {{ formaterHorodatage(execution.date_debut) }}, exécutant
          {{ execution.executant }} — enregistrement immuable, lecture seule.
        </p>

        <h4>Étapes</h4>
        <ul class="liste-etapes">
          <li v-for="etape in testDe(execution.id)?.etapes ?? []" :key="etape.id">
            <p>
              {{ etape.action }} — <em>attendu : {{ etape.resultat_attendu }}</em>
            </p>
            <p
              v-for="(es, rang) in executionStore.resultatsEtape(execution.id, etape.id)"
              :key="es.id"
            >
              <template
                v-if="rang < executionStore.resultatsEtape(execution.id, etape.id).length - 1"
              >
                <s>{{ LIBELLES_RESULTAT_ETAPE[es.resultat] }}</s>
                <span class="meta">(corrigé)</span>
              </template>
              <template v-else>
                Résultat : <strong>{{ LIBELLES_RESULTAT_ETAPE[es.resultat] }}</strong>
              </template>
              <span v-if="es.observation"> — {{ es.observation }}</span>
              <span v-if="executionStore.mesuresEtape(es.id).length > 0" class="mesures">
                — Mesures :
                <span v-for="m in executionStore.mesuresEtape(es.id)" :key="m.id">
                  {{ m.libelle }} = {{ m.valeur }}{{ m.unite ? ` ${m.unite}` : '' }};
                </span>
              </span>
            </p>
            <p
              v-if="
                !executionStore
                  .etapesExecution(execution.id)
                  .some((e) => e.test_step_id === etape.id)
              "
              class="meta"
            >
              Aucun résultat enregistré pour cette étape.
            </p>
          </li>
        </ul>

        <template v-if="executionStore.evenementsExecution(execution.id).length > 0">
          <h4>Événements</h4>
          <ul>
            <li v-for="ev in executionStore.evenementsExecution(execution.id)" :key="ev.id">
              {{ LIBELLES_TYPE_EVENEMENT[ev.type] }} — {{ ev.description }}
            </li>
          </ul>
        </template>

        <template v-if="evidenceStore.preuvesExecution(execution.id).length > 0">
          <h4>Preuves</h4>
          <ul>
            <li v-for="preuve in evidenceStore.preuvesExecution(execution.id)" :key="preuve.id">
              {{ preuve.titre }} ({{ LIBELLES_TYPE_PREUVE[preuve.type] }})
              <span v-if="preuve.description"> — {{ preuve.description }}</span>
              <template v-for="loc in evidenceStore.localisationsPreuve(preuve.id)" :key="loc.id">
                <button
                  v-if="loc.systeme === 'fichier'"
                  type="button"
                  class="bouton-lien"
                  :title="loc.reference"
                  @click="ouvrirFichierPreuve(preuve.id, loc.id)"
                >
                  {{ nomFichierPreuve(loc.reference) }}
                </button>
                <span v-else> — {{ loc.reference }}</span>
              </template>
            </li>
          </ul>
        </template>
      </details>
    </section>
    <ModaleSignature
      v-if="signatureCloture"
      titre="Clôturer l'exécution"
      :signification="`En signant, vous clôturez cette exécution avec le verdict « ${LIBELLES_VERDICT[signatureCloture.verdict]} ». Elle deviendra définitive : plus aucun résultat, mesure ou preuve ne pourra y être ajouté.`"
      libelle-bouton="Signer et clôturer"
      :avertissement="signatureCloture.avertissement"
      :erreur="signatureCloture.erreur"
      :en-cours="signatureCloture.enCours"
      @confirme="signerCloture"
      @annule="signatureCloture = null"
    />
  </main>
</template>

<style scoped>
.execution-tests {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 52rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure, #ddd);
  padding: 1rem;
  border-radius: 0.5rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input[type='text'],
select {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
}

.carte-execution {
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.liste-etapes li {
  margin-bottom: 0.75rem;
}

.execution-terminee summary {
  cursor: pointer;
}

.ligne-formulaire {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.resultat-enregistre {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.resultat-enregistre p {
  margin: 0;
}

.resultat-corrige {
  color: var(--vp-texte-secondaire);
}

fieldset.etape {
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.4rem;
  padding: 0.5rem 0.75rem;
}

fieldset.etape legend {
  font-weight: 600;
  padding: 0 0.3rem;
}

.ligne-formulaire label,
.ajout-mesure label,
.correction label {
  font-size: 0.85em;
}

.champ-large {
  flex: 1 1 14rem;
}

.ajout-mesure,
.actions-etape {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.4rem;
}

.bouton-mesure {
  white-space: nowrap;
}

.correction {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-attention);
  border-radius: 0.4rem;
}

.bloc-cloture {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid var(--vp-danger);
  border-radius: 0.5rem;
}

.bloc-cloture h4 {
  margin-top: 0;
}

.bouton-danger {
  background-color: var(--vp-danger);
  color: #fff;
  border: 1px solid var(--vp-danger);
  border-radius: 0.3rem;
  padding: 0.45rem 0.9rem;
  font-weight: 600;
}

.bouton-lien {
  background: none;
  border: none;
  padding: 0 0.25rem;
  color: var(--vp-marque);
  text-decoration: underline;
  cursor: pointer;
}

.confirmation {
  color: var(--vp-succes);
}

/* Audit UX exécution #22 : cibles tactiles confortables sur tablette. */
.carte-execution button,
.carte-execution select,
.carte-execution input {
  min-height: 2.5rem;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

.avertissement {
  color: var(--vp-attention);
}

button {
  cursor: pointer;
}
</style>

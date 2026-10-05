<script setup lang="ts">
// Écran Risk Assessment / AMDEC autonome —
// gap trouvé en poursuivant l'inventaire de
// §5.31 CONTEXTE-REPRISE-SESSION.md : le domaine, la persistance et le
// store existaient sans aucun écran ; seul le petit tableau S×O×D intégré
// au gabarit DQ était utilisable, pas la vraie méthodologie AMDEC
// versionnée par client.
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { calculerIPR } from '../../logique-metier/moteur-calcul/calculerIPR'
import { evaluerVerdictRiskAssessment } from '../../logique-metier/risque/evaluerVerdictRiskAssessment'
import type { VerdictRiskAssessment } from '../../logique-metier/domaine/types'
import { formaterDateFr } from '../i18n/formaterDate'
import BadgeVerdict from '../composants/BadgeVerdict.vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useParameterStore } from '../stores/useParameterStore'
import { useRiskAssessmentStore } from '../stores/useRiskAssessmentStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { OrigineMethodeRiskAssessment } from '../../logique-metier/domaine/types'
import { messageBornesAmdec } from '../../logique-metier/risque/bornesMethodeAmdec'
import { useEnvoiUnique } from '../composables/useEnvoiUnique'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const parameterStore = useParameterStore()
const riskStore = useRiskAssessmentStore()

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

const route = useRoute()
const nomClient = ref<string | null>(null)
const formulaireConfigOuvert = ref(false)
const chargementInitial = ref(true)

onMounted(async () => {
  try {
    const client = await clientsStore.obtenirClient(props.clientId)
    nomClient.value = client?.name ?? null
    await structureStore.charger(props.clientId)
    await parameterStore.charger(props.clientId)
    await riskStore.charger(props.clientId)
    if (!riskStore.profilActif) formulaireConfigOuvert.value = true
    // Arrivée depuis l'ACFC ou le Dossier vivant : nœud prérempli (constat 17).
    if (
      typeof route.query.noeud === 'string' &&
      structureStore.noeuds.some((n) => n.id === route.query.noeud)
    ) {
      assetNodeSelectionne.value = route.query.noeud
    }
  } finally {
    chargementInitial.value = false
  }
})

const LIBELLES_VERDICT: Record<string, string> = {
  acceptable: 'Acceptable',
  action_requise: 'Action requise',
}

function tonVerdict(verdict: VerdictRiskAssessment | null): 'action' | 'favorable' | 'a_completer' {
  if (verdict === null) return 'a_completer'
  return verdict === 'action_requise' ? 'action' : 'favorable'
}

function libelleVerdict(verdict: VerdictRiskAssessment | null): string {
  return verdict ? (LIBELLES_VERDICT[verdict] ?? verdict) : 'Non calculé'
}

/** Rappel de l'échelle et du seuil du profil actif (constat 10 : invisibles après configuration). */
const plage = computed(() =>
  riskStore.profilActif
    ? `${riskStore.profilActif.echelle_min}–${riskStore.profilActif.echelle_max}`
    : '',
)

const versionsProfil = computed(() =>
  [...riskStore.profils].sort((a, b) => b.created_at.localeCompare(a.created_at)),
)

const LIBELLES_ORIGINE: Record<OrigineMethodeRiskAssessment, string> = {
  procedure_client: 'Procédure client',
  defini_utilisateur: "Défini avec l'utilisateur",
  baseline_validapharm: 'Baseline ValidaPharm',
}

/** Nouvelle version préremplie avec le profil actif (constat 8). */
function ouvrirNouvelleVersion(): void {
  const actif = riskStore.profilActif
  if (actif) {
    echelleMin.value = actif.echelle_min
    echelleMax.value = actif.echelle_max
    seuilAction.value = actif.seuil_action
    source.value = actif.source
    origin.value = actif.origin
  }
  erreurConfig.value = null
  formulaireConfigOuvert.value = true
}

// --- Configuration du profil (échelle S×O×D + seuil) ---
const echelleMin = ref(1)
const echelleMax = ref(5)
const seuilAction = ref(50)
const source = ref('')
const origin = ref<OrigineMethodeRiskAssessment>('defini_utilisateur')

const erreurConfig = ref<string | null>(null)

async function enregistrerNouvelleVersion(
  ...args: Parameters<typeof enregistrerNouvelleVersionSansGarde>
): Promise<void> {
  await envoyer(() => enregistrerNouvelleVersionSansGarde(...args))
}

async function enregistrerNouvelleVersionSansGarde(): Promise<void> {
  erreurConfig.value = null
  if (source.value.trim().length === 0) {
    erreurConfig.value = 'Indiquez la source de la méthode (procédure, fichier…).'
    return
  }
  const refusBornes = messageBornesAmdec(echelleMin.value, echelleMax.value, seuilAction.value)
  if (refusBornes) {
    erreurConfig.value = refusBornes
    return
  }
  try {
    await riskStore.creerNouvelleVersion(props.clientId, {
      echelleMin: echelleMin.value,
      echelleMax: echelleMax.value,
      seuilAction: seuilAction.value,
      source: source.value.trim(),
      origin: origin.value,
    })
  } catch (e) {
    erreurConfig.value = e instanceof Error ? e.message : String(e)
    return
  }
  source.value = ''
  formulaireConfigOuvert.value = false
}

// --- Nouvelle ligne AMDEC ---
const assetNodeSelectionne = ref('')
const parameterSelectionne = ref('')
const etapeProcessus = ref('')
const modeDefaillance = ref('')
const effetDefaillance = ref('')
const causePotentielle = ref('')
const controleActuel = ref('')
const severiteInitiale = ref<number | null>(null)
const occurrenceInitiale = ref<number | null>(null)
const detectabiliteInitiale = ref<number | null>(null)
const erreurCreation = ref<string | null>(null)

async function creerEvaluation(
  ...args: Parameters<typeof creerEvaluationSansGarde>
): Promise<void> {
  await envoyer(() => creerEvaluationSansGarde(...args))
}

/** Note vide → `null` ; sinon la valeur saisie telle quelle (contrôlée ensuite). */
function noteSaisie(valeur: number | string | null | undefined): number | null {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null
}

/** Message en français pour une note hors échelle (constat 10 : infobulle native en anglais). */
function refusNotes(notes: Array<number | null>): string | null {
  const profil = riskStore.profilActif
  if (!profil) return null
  const horsEchelle = notes.some(
    (n) => n !== null && (!Number.isInteger(n) || n < profil.echelle_min || n > profil.echelle_max),
  )
  return horsEchelle
    ? `Chaque note doit être un nombre entier entre ${profil.echelle_min} et ${profil.echelle_max}.`
    : null
}

/** IPR et verdict calculés en direct pendant la saisie (constat 10). */
const apercuInitial = computed(() => {
  const profil = riskStore.profilActif
  if (!profil) return null
  const ipr = calculerIPR(
    noteSaisie(severiteInitiale.value),
    noteSaisie(occurrenceInitiale.value),
    noteSaisie(detectabiliteInitiale.value),
    { min: profil.echelle_min, max: profil.echelle_max },
  )
  return ipr.calcule
    ? { ipr: ipr.valeur, verdict: evaluerVerdictRiskAssessment(ipr, profil.seuil_action) }
    : null
})

async function creerEvaluationSansGarde(): Promise<void> {
  erreurCreation.value = null
  if (etapeProcessus.value.trim().length === 0 || modeDefaillance.value.trim().length === 0) {
    erreurCreation.value = "L'étape du processus et le mode de défaillance sont obligatoires."
    return
  }
  const refus = refusNotes([
    noteSaisie(severiteInitiale.value),
    noteSaisie(occurrenceInitiale.value),
    noteSaisie(detectabiliteInitiale.value),
  ])
  if (refus) {
    erreurCreation.value = refus
    return
  }
  // Un champ numérique vidé vaut `''` avec `v-model.number` : les notes
  // S/O/D initiales sont facultatives (guide §20), elles partent donc à
  // `null` — jamais un 400 « corps invalide » sans message (audit UX).
  const note = (valeur: number | string | null) =>
    typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null
  let resultat: Awaited<ReturnType<typeof riskStore.creerEvaluation>>
  try {
    resultat = await riskStore.creerEvaluation(props.clientId, {
      assetNodeId: assetNodeSelectionne.value || null,
      parameterId: parameterSelectionne.value || null,
      etapeProcessus: etapeProcessus.value.trim(),
      modeDefaillance: modeDefaillance.value.trim(),
      effetDefaillance: effetDefaillance.value.trim(),
      causePotentielle: causePotentielle.value.trim(),
      controleActuel: controleActuel.value.trim(),
      severiteInitiale: note(severiteInitiale.value),
      occurrenceInitiale: note(occurrenceInitiale.value),
      detectabiliteInitiale: note(detectabiliteInitiale.value),
    })
  } catch (e) {
    erreurCreation.value = e instanceof Error ? e.message : "La ligne n'a pas pu être créée."
    return
  }
  if ('erreur' in resultat) {
    erreurCreation.value = 'Aucun profil de méthode configuré.'
    return
  }
  assetNodeSelectionne.value = ''
  parameterSelectionne.value = ''
  etapeProcessus.value = ''
  modeDefaillance.value = ''
  effetDefaillance.value = ''
  causePotentielle.value = ''
  controleActuel.value = ''
  severiteInitiale.value = null
  occurrenceInitiale.value = null
  detectabiliteInitiale.value = null
}

// --- Action résiduelle ---
const recommandationBrouillon = ref<Record<string, string>>({})
const responsableBrouillon = ref<Record<string, string>>({})
const severiteResiduelleBrouillon = ref<Record<string, number | null>>({})
const occurrenceResiduelleBrouillon = ref<Record<string, number | null>>({})
const detectabiliteResiduelleBrouillon = ref<Record<string, number | null>>({})
/** Une erreur par ligne : un message ne s'affiche plus sur toutes les cartes à la fois (constat 11). */
const erreurAction = ref<Record<string, string | null>>({})
/** Confirmation explicite : l'IPR résiduel ne pourra plus être modifié (constat 11). */
const confirmationResiduelle = ref<Record<string, boolean>>({})

function profilDeLigne(methodProfileId: string) {
  return riskStore.profils.find((p) => p.id === methodProfileId) ?? null
}

async function enregistrerAction(
  ...args: Parameters<typeof enregistrerActionSansGarde>
): Promise<void> {
  await envoyer(() => enregistrerActionSansGarde(...args))
}

async function enregistrerActionSansGarde(
  riskAssessmentId: string,
  methodProfileId: string,
): Promise<void> {
  const signaler = (message: string | null) => {
    erreurAction.value = { ...erreurAction.value, [riskAssessmentId]: message }
  }
  signaler(null)
  const profil = profilDeLigne(methodProfileId)
  const notes = [
    severiteResiduelleBrouillon.value[riskAssessmentId],
    occurrenceResiduelleBrouillon.value[riskAssessmentId],
    detectabiliteResiduelleBrouillon.value[riskAssessmentId],
  ].map(noteSaisie)
  if (!recommandationBrouillon.value[riskAssessmentId]?.trim() || notes.some((n) => n === null)) {
    signaler('Renseignez la recommandation et les trois notes résiduelles (S, O, D).')
    return
  }
  if (
    profil &&
    notes.some(
      (n) =>
        n !== null && (n < profil.echelle_min || n > profil.echelle_max || !Number.isInteger(n)),
    )
  ) {
    signaler(
      `Chaque note résiduelle doit être un entier entre ${profil.echelle_min} et ${profil.echelle_max} (échelle de la version du profil de cette ligne).`,
    )
    return
  }
  if (!confirmationResiduelle.value[riskAssessmentId]) {
    signaler("Cochez la confirmation : l'IPR résiduel ne pourra plus être modifié.")
    return
  }
  const note = (valeur: number | string | null | undefined) =>
    typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null
  // Date cible et actions menées ne sont pas saisies sur cet écran : on
  // conserve celles déjà enregistrées, jamais une remise à zéro silencieuse
  // (audit d'intégrité front, M11).
  const existante = riskStore.evaluations.find((e) => e.id === riskAssessmentId)
  let resultat: Awaited<ReturnType<typeof riskStore.enregistrerActionResiduelle>>
  try {
    resultat = await riskStore.enregistrerActionResiduelle(props.clientId, riskAssessmentId, {
      recommandation: recommandationBrouillon.value[riskAssessmentId]?.trim() || null,
      responsable: responsableBrouillon.value[riskAssessmentId]?.trim() || null,
      dateCible: existante?.date_cible ?? null,
      actionsMenees: existante?.actions_menees ?? null,
      severiteResiduelle: note(severiteResiduelleBrouillon.value[riskAssessmentId]),
      occurrenceResiduelle: note(occurrenceResiduelleBrouillon.value[riskAssessmentId]),
      detectabiliteResiduelle: note(detectabiliteResiduelleBrouillon.value[riskAssessmentId]),
    })
  } catch (e) {
    signaler(e instanceof Error ? e.message : "L'action n'a pas pu être enregistrée.")
    return
  }
  if ('erreur' in resultat) {
    signaler('Cette ligne AMDEC est introuvable — elle a peut-être été supprimée entre-temps.')
  }
}

function libelleAssetNode(assetNodeId: string | null): string | null {
  if (!assetNodeId) return null
  const noeud = structureStore.noeuds.find((n) => n.id === assetNodeId)
  return noeud ? `${noeud.name} (${noeud.code})` : assetNodeId
}

const evaluationsTriees = computed(() =>
  [...riskStore.evaluations].sort((a, b) => b.created_at.localeCompare(a.created_at)),
)

function recharger(): void {
  window.location.reload()
}
</script>

<template>
  <main class="risk-assessment">
    <RouterLink
      :to="{ name: 'fiche-client', params: { clientId: props.clientId } }"
      class="lien-retour"
    >
      {{ nomClient ?? 'Fiche client' }}
    </RouterLink>
    <h1>Risk Assessment / AMDEC — {{ nomClient ?? props.clientId }}</h1>
    <p v-if="riskStore.profilActif" class="rappel-echelle">
      Échelle {{ plage }} · seuil d'action IPR ≥ {{ riskStore.profilActif.seuil_action }} (méthode
      {{ riskStore.profilActif.version }})
    </p>
    <p v-if="erreurEnvoi" class="bandeau-erreur" role="alert">{{ erreurEnvoi }}</p>
    <p class="rappel">
      L'IPR est calculé mais jamais autoritatif à lui seul — le verdict reste une aide à la
      décision, cohérent avec la méthodologie AMDEC du client (ICH Q9).
    </p>

    <p v-if="chargementInitial" class="etat-vide">Chargement…</p>
    <p v-else-if="riskStore.chargementEchoue" class="bandeau-erreur" role="alert">
      Impossible de charger les profils AMDEC de ce client (serveur injoignable ou session expirée)
      : rien n'est perdu, mais n'en créez pas de nouvelle avant d'avoir rechargé la page.
      <button type="button" @click="recharger">Recharger</button>
    </p>
    <template v-else>
      <section v-if="!riskStore.profilActif || formulaireConfigOuvert" class="bloc-config">
        <h2>Configuration du profil de méthode</h2>
        <p v-if="!riskStore.profilActif" class="rappel" role="alert">
          Aucun profil AMDEC n'est configuré pour ce client. Renseignez l'échelle réelle S×O×D et le
          seuil d'action de la méthodologie du client.
        </p>
        <form class="formulaire" @submit.prevent="enregistrerNouvelleVersion">
          <label>
            Source
            <input v-model="source" type="text" required placeholder="ex. Processus_AMDEC.xlsx" />
          </label>
          <label>
            Origine
            <select v-model="origin">
              <option value="procedure_client">Procédure client</option>
              <option value="defini_utilisateur">Défini avec l'utilisateur</option>
              <option value="baseline_validapharm">Baseline ValidaPharm</option>
            </select>
          </label>
          <label>
            Échelle minimale
            <input v-model.number="echelleMin" type="number" min="1" step="1" required />
          </label>
          <label>
            Échelle maximale
            <input v-model.number="echelleMax" type="number" min="2" step="1" required />
          </label>
          <label>
            Seuil d'action (IPR)
            <input v-model.number="seuilAction" type="number" min="2" step="1" required />
          </label>
          <p v-if="riskStore.profilActif" class="rappel">
            Prérempli avec la version {{ riskStore.profilActif.version }} ; elle reste conservée
            telle quelle, les lignes existantes gardent leur version.
          </p>
          <p v-if="erreurConfig" class="bandeau-erreur" role="alert">{{ erreurConfig }}</p>
          <div class="actions">
            <button
              v-if="riskStore.profilActif"
              type="button"
              @click="formulaireConfigOuvert = false"
            >
              Annuler
            </button>
            <button type="submit" :disabled="envoiEnCours">Enregistrer cette version</button>
          </div>
        </form>
      </section>

      <template v-else>
        <details class="methode-active">
          <summary>
            Méthode {{ riskStore.profilActif.version }} — source :
            {{ riskStore.profilActif.source }}
          </summary>
          <dl>
            <dt>Origine</dt>
            <dd>{{ LIBELLES_ORIGINE[riskStore.profilActif.origin] }}</dd>
            <dt>En vigueur depuis</dt>
            <dd>{{ formaterDateFr(riskStore.profilActif.effective_date) }}</dd>
            <dt>Échelle S, O, D</dt>
            <dd>{{ plage }}</dd>
            <dt>Seuil d'action</dt>
            <dd>IPR ≥ {{ riskStore.profilActif.seuil_action }}</dd>
          </dl>
          <template v-if="versionsProfil.length > 1">
            <p class="rappel">Versions précédentes (conservées, jamais modifiées) :</p>
            <ul>
              <li v-for="v in versionsProfil.slice(1)" :key="v.id">
                {{ v.version }} — échelle {{ v.echelle_min }}–{{ v.echelle_max }}, seuil
                {{ v.seuil_action }} ({{ formaterDateFr(v.effective_date) }})
              </li>
            </ul>
          </template>
          <button type="button" class="lien-config" @click="ouvrirNouvelleVersion">
            Nouvelle version préremplie
          </button>
        </details>

        <section class="bloc-nouvelle-ligne">
          <h2>Nouvelle ligne AMDEC</h2>
          <form class="formulaire" novalidate @submit.prevent="creerEvaluation">
            <label>
              Nœud Structure Système (optionnel)
              <select v-model="assetNodeSelectionne">
                <option value="">— aucun —</option>
                <option v-for="noeud in structureStore.noeuds" :key="noeud.id" :value="noeud.id">
                  {{ noeud.name }} ({{ noeud.code }})
                </option>
              </select>
            </label>
            <label>
              Paramètre (optionnel)
              <select v-model="parameterSelectionne">
                <option value="">— aucun —</option>
                <option v-for="p in parameterStore.parametres" :key="p.id" :value="p.id">
                  {{ p.nom }}
                </option>
              </select>
            </label>
            <label>
              Étape du processus
              <input v-model="etapeProcessus" type="text" required />
            </label>
            <label>
              Mode de défaillance
              <input v-model="modeDefaillance" type="text" required />
            </label>
            <label>
              Effet de la défaillance
              <input v-model="effetDefaillance" type="text" />
            </label>
            <label>
              Cause potentielle
              <input v-model="causePotentielle" type="text" />
            </label>
            <label>
              Contrôle actuel
              <input v-model="controleActuel" type="text" />
            </label>
            <label>
              Sévérité initiale ({{ plage }}, facultative)
              <input
                v-model.number="severiteInitiale"
                type="number"
                step="1"
                :min="riskStore.profilActif.echelle_min"
                :max="riskStore.profilActif.echelle_max"
              />
            </label>
            <label>
              Occurrence initiale ({{ plage }}, facultative)
              <input
                v-model.number="occurrenceInitiale"
                type="number"
                step="1"
                :min="riskStore.profilActif.echelle_min"
                :max="riskStore.profilActif.echelle_max"
              />
            </label>
            <label>
              Détectabilité initiale ({{ plage }}, facultative)
              <input
                v-model.number="detectabiliteInitiale"
                type="number"
                step="1"
                :min="riskStore.profilActif.echelle_min"
                :max="riskStore.profilActif.echelle_max"
              />
            </label>
            <p class="apercu-ipr" role="status">
              IPR initial :
              <template v-if="apercuInitial">
                <strong>{{ apercuInitial.ipr }}</strong>
                <BadgeVerdict
                  :ton="tonVerdict(apercuInitial.verdict)"
                  :texte="libelleVerdict(apercuInitial.verdict)"
                />
              </template>
              <template v-else
                >calculé dès que les trois notes sont saisies dans l'échelle.</template
              >
            </p>
            <p v-if="erreurCreation" class="bandeau-erreur" role="alert">{{ erreurCreation }}</p>
            <button type="submit" :disabled="envoiEnCours">Créer la ligne</button>
          </form>
        </section>
      </template>

      <section v-if="evaluationsTriees.length > 0" class="bloc-evaluations">
        <h2>Lignes AMDEC</h2>
        <!-- Vue tabulaire pour comparer les lignes (constat 10) ; le détail et
             l'action résiduelle se déplient sous chaque ligne. -->
        <div class="table-defilante">
          <table class="table-amdec">
            <thead>
              <tr>
                <th scope="col">Étape</th>
                <th scope="col">Mode de défaillance</th>
                <th scope="col"><abbr title="Sévérité">S</abbr></th>
                <th scope="col"><abbr title="Occurrence">O</abbr></th>
                <th scope="col"><abbr title="Détectabilité">D</abbr></th>
                <th scope="col">IPR</th>
                <th scope="col">Verdict</th>
                <th scope="col"><abbr title="Sévérité résiduelle">S′</abbr></th>
                <th scope="col"><abbr title="Occurrence résiduelle">O′</abbr></th>
                <th scope="col"><abbr title="Détectabilité résiduelle">D′</abbr></th>
                <th scope="col">IPR′</th>
                <th scope="col">Verdict′</th>
              </tr>
            </thead>
            <tbody v-for="e in evaluationsTriees" :key="e.id" class="groupe-ligne">
              <tr>
                <td>{{ e.etape_processus }}</td>
                <td>
                  <strong>{{ e.mode_defaillance }}</strong>
                  <span v-if="libelleAssetNode(e.asset_node_id)" class="meta">
                    <br />{{ libelleAssetNode(e.asset_node_id) }}
                  </span>
                </td>
                <td>{{ e.severite_initiale ?? '—' }}</td>
                <td>{{ e.occurrence_initiale ?? '—' }}</td>
                <td>{{ e.detectabilite_initiale ?? '—' }}</td>
                <td>{{ e.ipr_initial ?? '—' }}</td>
                <td>
                  <BadgeVerdict
                    :ton="tonVerdict(e.verdict_initial)"
                    :texte="libelleVerdict(e.verdict_initial)"
                  />
                </td>
                <td>{{ e.severite_residuelle ?? '—' }}</td>
                <td>{{ e.occurrence_residuelle ?? '—' }}</td>
                <td>{{ e.detectabilite_residuelle ?? '—' }}</td>
                <td>{{ e.ipr_residuel ?? '—' }}</td>
                <td>
                  <BadgeVerdict
                    v-if="e.ipr_residuel !== null"
                    :ton="tonVerdict(e.verdict_residuel)"
                    :texte="libelleVerdict(e.verdict_residuel)"
                  />
                  <template v-else>—</template>
                </td>
              </tr>
              <tr class="ligne-detail">
                <td colspan="12">
                  <details>
                    <summary>
                      Détail{{ e.ipr_residuel === null ? ' et action résiduelle' : '' }} — méthode
                      {{ profilDeLigne(e.method_profile_id)?.version ?? '?' }} (seuil
                      {{ profilDeLigne(e.method_profile_id)?.seuil_action ?? '?' }})
                    </summary>
                    <dl class="detail-ligne">
                      <dt>Effet</dt>
                      <dd>{{ e.effet_defaillance || '—' }}</dd>
                      <dt>Cause potentielle</dt>
                      <dd>{{ e.cause_potentielle || '—' }}</dd>
                      <dt>Contrôle actuel</dt>
                      <dd>{{ e.controle_actuel || '—' }}</dd>
                      <template v-if="e.recommandation">
                        <dt>Action</dt>
                        <dd>
                          {{ e.recommandation }}
                          <template v-if="e.responsable"> — {{ e.responsable }}</template>
                        </dd>
                      </template>
                    </dl>
                    <form
                      v-if="e.ipr_residuel === null"
                      class="formulaire-residuel"
                      novalidate
                      @submit.prevent="enregistrerAction(e.id, e.method_profile_id)"
                    >
                      <label>
                        Recommandation
                        <input v-model="recommandationBrouillon[e.id]" type="text" />
                      </label>
                      <label>
                        Responsable
                        <input v-model="responsableBrouillon[e.id]" type="text" />
                      </label>
                      <label>
                        S résiduelle ({{ profilDeLigne(e.method_profile_id)?.echelle_min }}–{{
                          profilDeLigne(e.method_profile_id)?.echelle_max
                        }})
                        <input
                          v-model.number="severiteResiduelleBrouillon[e.id]"
                          type="number"
                          step="1"
                        />
                      </label>
                      <label>
                        O résiduelle
                        <input
                          v-model.number="occurrenceResiduelleBrouillon[e.id]"
                          type="number"
                          step="1"
                        />
                      </label>
                      <label>
                        D résiduelle
                        <input
                          v-model.number="detectabiliteResiduelleBrouillon[e.id]"
                          type="number"
                          step="1"
                        />
                      </label>
                      <label class="case-confirmation">
                        <input v-model="confirmationResiduelle[e.id]" type="checkbox" />
                        Définitif : l'IPR résiduel ne pourra plus être modifié.
                      </label>
                      <p v-if="erreurAction[e.id]" class="bandeau-erreur" role="alert">
                        {{ erreurAction[e.id] }}
                      </p>
                      <button type="submit" :disabled="envoiEnCours">
                        Enregistrer l'action résiduelle
                      </button>
                    </form>
                  </details>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.risk-assessment {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 72rem;
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
input[type='number'],
select {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.lien-config {
  background: none;
  color: var(--vp-marque, #4338ca);
  border: none;
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
}

.carte-evaluation {
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.ligne-formulaire {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.5rem;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

button {
  cursor: pointer;
}
.rappel-echelle {
  margin: 0;
  font-weight: var(--vp-poids-semibold);
}

.methode-active {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
}

.methode-active summary {
  cursor: pointer;
  font-weight: var(--vp-poids-semibold);
}

.methode-active dl,
.detail-ligne {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
}

.methode-active dd,
.detail-ligne dd {
  margin: 0;
}

.apercu-ipr {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
}

.table-defilante {
  overflow-x: auto;
}

.table-amdec {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9rem;
}

.table-amdec th,
.table-amdec td {
  border-bottom: 1px solid var(--vp-bordure);
  padding: 0.4rem 0.5rem;
  text-align: left;
  vertical-align: top;
  font-variant-numeric: tabular-nums;
}

.table-amdec .ligne-detail td {
  border-bottom: 2px solid var(--vp-bordure);
  padding-top: 0;
}

.ligne-detail summary {
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.formulaire-residuel {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem 0.75rem;
  margin-top: 0.75rem;
}

.formulaire-residuel input[type='number'] {
  width: 5rem;
}

.case-confirmation {
  flex-direction: row;
  align-items: center;
  gap: 0.4rem;
  flex-basis: 100%;
}
</style>

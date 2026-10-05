<script setup lang="ts">
// Impact Assessment / System Classification (F1 du catalogue §10) —
// écran manquant trouvé le 29/08/2026 en comparant
// l'inventaire d'écrans réel (`src/presentation/screens/`) à celui
// documenté (25/08/2026) : le store
// `useImpactAssessmentStore` et le moteur de décision existaient
// sans jamais avoir de composant, contrairement à ce que la
// documentation de conception affirmait. Même patron que `AssistantStrategieQualification.vue`
// (ACFC) : méthode configurable par client, aucune question
// fabriquée par défaut, verdict strictement binaire
// (Direct Impact / Not Direct Impact — pas de niveau "impact indirect").
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useClientsStore } from '../stores/useClientsStore'
import { useImpactAssessmentStore } from '../stores/useImpactAssessmentStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { OrigineMethodeImpactAssessment } from '../../logique-metier/domaine/types'
import type { ReponseQuestionOuiNon } from '../../logique-metier/assessment/moteurQuestionsOuiNon'
import {
  evaluerVerdictImpactAssessment,
  methodeCompletementRepondue,
} from '../../logique-metier/assessment/evaluerVerdictImpactAssessment'
import { libelleVerdictImpact, tonVerdictImpact } from '../i18n/libellesVerdictQuestionnaire'
import { formaterDateFr } from '../i18n/formaterDate'
import BadgeVerdict from '../composants/BadgeVerdict.vue'
import { useEnvoiUnique } from '../composables/useEnvoiUnique'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const methodeStore = useImpactAssessmentStore()
const structureStore = useStructureSystemeStore()

const route = useRoute()
const nomClient = ref<string | null>(null)
const formulaireConfigOuvert = ref(false)
const chargementInitial = ref(true)

onMounted(async () => {
  try {
    const client = await clientsStore.obtenirClient(props.clientId)
    nomClient.value = client?.name ?? null
    await methodeStore.charger(props.clientId)
    await structureStore.charger(props.clientId)
    if (!methodeStore.profilActif) formulaireConfigOuvert.value = true
    // Arrivée depuis le Dossier vivant (constat 17) : actif prérempli.
    if (typeof route.query.element === 'string') nomElement.value = route.query.element
    if (
      typeof route.query.noeud === 'string' &&
      structureStore.noeuds.some((n) => n.id === route.query.noeud)
    ) {
      assetNodeIdSelectionne.value = route.query.noeud
    }
  } finally {
    chargementInitial.value = false
  }
})

// --- Configuration de la méthode (création d'une nouvelle version) ---
const brouillonQuestions = reactive<string[]>(['', ''])
const brouillonSource = ref('')
const brouillonOrigin = ref<OrigineMethodeImpactAssessment>('defini_utilisateur')

function ajouterLigneQuestion(): void {
  brouillonQuestions.push('')
}
function retirerLigneQuestion(index: number): void {
  if (brouillonQuestions.length > 1) brouillonQuestions.splice(index, 1)
}

// Un seul envoi à la fois (audit M2 : deux clics créaient deux évaluations)
// et les refus du serveur affichés (M1).
const { enCours: envoiEnCours, executer } = useEnvoiUnique()
const erreurEnvoi = ref<string | null>(null)

async function envoyer(action: () => Promise<void>): Promise<void> {
  erreurEnvoi.value = null
  try {
    await executer(action)
  } catch (e) {
    erreurEnvoi.value = e instanceof Error ? e.message : String(e)
  }
}

async function enregistrerNouvelleVersion(): Promise<void> {
  await envoyer(enregistrerNouvelleVersionSansGarde)
}

const erreurConfig = ref<string | null>(null)

/** Nouvelle version préremplie avec la version active (constat 8). */
function ouvrirNouvelleVersion(): void {
  const actif = methodeStore.profilActif
  if (actif) {
    brouillonQuestions.splice(
      0,
      brouillonQuestions.length,
      ...actif.questions.map((q) => q.texte.fr ?? ''),
    )
    brouillonSource.value = actif.source
    brouillonOrigin.value = actif.origin
  }
  erreurConfig.value = null
  formulaireConfigOuvert.value = true
}

/** Import d'un fichier texte, une question par ligne (constat 15, même outil que l'ACFC). */
async function importerQuestionsTexte(evenement: Event): Promise<void> {
  const champ = evenement.target as HTMLInputElement
  const fichier = champ.files?.[0]
  champ.value = ''
  if (!fichier) return
  const lignes = (await fichier.text())
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.length > 0)
  if (lignes.length > 0) brouillonQuestions.splice(0, brouillonQuestions.length, ...lignes)
}

const LIBELLES_ORIGINE: Record<OrigineMethodeImpactAssessment, string> = {
  procedure_client: 'Procédure client',
  defini_utilisateur: "Défini avec l'utilisateur",
  baseline_validapharm: 'Baseline ValidaPharm',
}

const versionsMethode = computed(() =>
  [...methodeStore.profils].sort((a, b) => b.created_at.localeCompare(a.created_at)),
)

async function enregistrerNouvelleVersionSansGarde(): Promise<void> {
  const questions = brouillonQuestions
    .map((texte) => texte.trim())
    .filter((texte) => texte.length > 0)
    .map((texte) => ({ texte }))
  erreurConfig.value = null
  if (brouillonSource.value.trim().length === 0) {
    erreurConfig.value = 'Indiquez la source de la méthode (procédure, réunion…).'
    return
  }
  if (questions.length === 0) {
    erreurConfig.value = 'Saisissez au moins une question.'
    return
  }

  await methodeStore.creerNouvelleVersion(props.clientId, {
    questions,
    source: brouillonSource.value.trim(),
    origin: brouillonOrigin.value,
  })
  brouillonQuestions.splice(0, brouillonQuestions.length, '', '')
  brouillonSource.value = ''
  formulaireConfigOuvert.value = false
  // Les réponses visaient les questions de la version précédente.
  for (const cle of Object.keys(reponses)) Reflect.deleteProperty(reponses, cle)
}

// --- Évaluation contre la méthode active ---
const nomElement = ref('')
// Nœud Structure Système évalué (optionnel) — trouvé manquant en simulant un
// vrai parcours de qualification : `assetNodeId` existe dans le store depuis
// l'origine mais aucun écran ne le proposait, réduisant chaque évaluation à
// un nom libre sans rattachement traçable au référentiel d'actifs.
const assetNodeIdSelectionne = ref('')
const reponses = reactive<Record<string, ReponseQuestionOuiNon>>({})
const evaluationEnregistree = ref(false)

const LIBELLES_REPONSE: Record<ReponseQuestionOuiNon, string> = {
  oui: 'Oui',
  non: 'Non',
  inconnu: 'Inconnu',
  sans_objet: 'Sans objet',
}

const complet = computed(() =>
  methodeStore.profilActif
    ? methodeCompletementRepondue(methodeStore.profilActif.questions, reponses)
    : false,
)

// `null` tant que le questionnaire est incomplet OU qu'un « Inconnu » empêche
// de conclure (décision du 25/09/2026) — `complet` distingue les deux cas.
const verdict = computed(() => {
  if (!methodeStore.profilActif || !complet.value) return null
  return evaluerVerdictImpactAssessment(
    methodeStore.profilActif.questions,
    reponses,
    methodeStore.profilActif.decision_rule,
  )
})

async function enregistrerEvaluation(): Promise<void> {
  await envoyer(enregistrerEvaluationSansGarde)
}

async function enregistrerEvaluationSansGarde(): Promise<void> {
  if (!complet.value || nomElement.value.trim().length === 0) return
  const resultat = await methodeStore.creerEvaluation(props.clientId, {
    nomElement: nomElement.value.trim(),
    assetNodeId: assetNodeIdSelectionne.value || null,
    reponses: { ...reponses },
  })
  if ('erreur' in resultat) return
  evaluationEnregistree.value = true
}

function nouvelleEvaluation(): void {
  nomElement.value = ''
  assetNodeIdSelectionne.value = ''
  for (const cle of Object.keys(reponses)) Reflect.deleteProperty(reponses, cle)
  evaluationEnregistree.value = false
}

/** Historique lisible (constat 16) : date, auteur, élément, nœud, méthode, verdict. */
const historique = computed(() =>
  [...methodeStore.evaluations]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => ({
      ...e,
      auteur: e.audit_log[0]?.actor ?? '—',
      noeud: structureStore.noeuds.find((n) => n.id === e.asset_node_id) ?? null,
      questions: methodeStore.profils.find((p) => p.id === e.method_profile_id)?.questions ?? [],
    })),
)

function libelleReponse(reponse: string | undefined): string {
  return reponse ? (LIBELLES_REPONSE[reponse as ReponseQuestionOuiNon] ?? reponse) : '—'
}

/**
 * « À compléter » : nouvelle évaluation préremplie (mêmes élément, nœud et
 * réponses connues), seules les réponses « Inconnu » restent à donner — une
 * nouvelle entrée, jamais une modification de l'ancienne (constat 16).
 */
function reevaluer(id: string): void {
  const e = methodeStore.evaluations.find((x) => x.id === id)
  if (!e) return
  nouvelleEvaluation()
  nomElement.value = e.nom_element
  assetNodeIdSelectionne.value = e.asset_node_id ?? ''
  const questionsActives = new Set(methodeStore.profilActif?.questions.map((q) => q.id) ?? [])
  for (const [question, reponse] of Object.entries(e.reponses)) {
    if (reponse !== 'inconnu' && questionsActives.has(question)) {
      reponses[question] = reponse as ReponseQuestionOuiNon
    }
  }
  window.scrollTo?.({ top: 0, behavior: 'smooth' })
}

function recharger(): void {
  window.location.reload()
}
</script>

<template>
  <main class="impact-assessment">
    <RouterLink
      :to="{ name: 'fiche-client', params: { clientId: props.clientId } }"
      class="lien-retour"
    >
      {{ nomClient ?? 'Fiche client' }}
    </RouterLink>
    <h1>Impact Assessment / System Classification — {{ nomClient ?? props.clientId }}</h1>
    <p class="bandeau-disclaimer">Aide à la décision, non une décision de classification.</p>
    <p v-if="erreurEnvoi" class="bandeau-erreur" role="alert">{{ erreurEnvoi }}</p>

    <p v-if="chargementInitial" class="etat-vide">Chargement…</p>
    <p v-else-if="methodeStore.chargementEchoue" class="bandeau-erreur" role="alert">
      Impossible de charger les méthodes Impact Assessment de ce client (serveur injoignable ou
      session expirée) : rien n'est perdu, mais n'en créez pas de nouvelle avant d'avoir rechargé la
      page.
      <button type="button" @click="recharger">Recharger</button>
    </p>
    <template v-else>
      <section v-if="!methodeStore.profilActif || formulaireConfigOuvert" class="bloc-config">
        <h2>Configuration de la méthode</h2>
        <p v-if="!methodeStore.profilActif" class="rappel" role="alert">
          Aucune méthode Impact Assessment n'est configurée pour ce client. Aucune question n'est
          proposée par défaut — saisissez les questions réelles de la procédure du client, mot pour
          mot.
        </p>
        <form class="formulaire" @submit.prevent="enregistrerNouvelleVersion">
          <p v-if="methodeStore.profilActif" class="rappel">
            Prérempli avec la version {{ methodeStore.profilActif.version }} : corrigez ce qui doit
            l'être. La version actuelle reste conservée telle quelle.
          </p>
          <label
            >Source (ex. "Procédure interne QD-00098219", "Défini avec le client le ...")
            <input v-model="brouillonSource" type="text" required />
          </label>
          <label>
            Origine
            <select v-model="brouillonOrigin">
              <option value="procedure_client">Procédure client</option>
              <option value="defini_utilisateur">Défini avec l'utilisateur</option>
              <option value="baseline_validapharm">Baseline ValidaPharm</option>
            </select>
          </label>
          <fieldset class="questions-config">
            <legend>Questions (une par ligne, mot pour mot)</legend>
            <label class="bouton-fichier">
              Importer un fichier texte (une question par ligne)
              <input type="file" accept="text/plain,.txt" @change="importerQuestionsTexte" />
            </label>
            <div
              v-for="(_, index) in brouillonQuestions"
              :key="index"
              class="ligne-question-config"
            >
              <input
                v-model="brouillonQuestions[index]"
                type="text"
                :placeholder="`Question ${index + 1}`"
                :aria-label="`Question ${index + 1}`"
              />
              <button
                type="button"
                :disabled="brouillonQuestions.length <= 1"
                @click="retirerLigneQuestion(index)"
              >
                Retirer
              </button>
            </div>
            <button type="button" @click="ajouterLigneQuestion">+ Ajouter une question</button>
          </fieldset>
          <p v-if="erreurConfig" class="bandeau-erreur" role="alert">{{ erreurConfig }}</p>
          <div class="actions">
            <button
              v-if="methodeStore.profilActif"
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
            Méthode {{ methodeStore.profilActif.version }} — source :
            {{ methodeStore.profilActif.source }}
          </summary>
          <dl>
            <dt>Origine</dt>
            <dd>{{ LIBELLES_ORIGINE[methodeStore.profilActif.origin] }}</dd>
            <dt>En vigueur depuis</dt>
            <dd>{{ formaterDateFr(methodeStore.profilActif.effective_date) }}</dd>
          </dl>
          <ol>
            <li v-for="q in methodeStore.profilActif.questions" :key="q.id">{{ q.texte.fr }}</li>
          </ol>
          <template v-if="versionsMethode.length > 1">
            <p class="rappel">Versions précédentes (conservées, jamais modifiées) :</p>
            <ul>
              <li v-for="v in versionsMethode.slice(1)" :key="v.id">
                {{ v.version }} — {{ v.source }} ({{ formaterDateFr(v.effective_date) }})
              </li>
            </ul>
          </template>
          <button type="button" class="lien-config" @click="ouvrirNouvelleVersion">
            Corriger ou compléter : nouvelle version préremplie
          </button>
        </details>

        <section class="bloc-evaluation">
          <h2>Évaluation</h2>
          <label class="nom-element">
            Système évalué
            <input
              v-model="nomElement"
              type="text"
              required
              placeholder="ex. Isolateur de remplissage STICK002"
            />
          </label>
          <label class="nom-element">
            Nœud Structure Système (optionnel)
            <select v-model="assetNodeIdSelectionne">
              <option value="">— aucun —</option>
              <option v-for="noeud in structureStore.noeuds" :key="noeud.id" :value="noeud.id">
                {{ noeud.name }} ({{ noeud.code }})
              </option>
            </select>
          </label>
          <ul class="liste-questions">
            <li v-for="question in methodeStore.profilActif.questions" :key="question.id">
              <!-- Figé une fois l'évaluation enregistrée : le verdict affiché
                   doit toujours être celui enregistré (audit UX du 26/09/2026). -->
              <fieldset class="reponses-question">
                <legend class="texte-question">{{ question.texte.fr }}</legend>
                <label v-for="opt in ['oui', 'non', 'inconnu', 'sans_objet'] as const" :key="opt">
                  <input
                    v-model="reponses[question.id]"
                    type="radio"
                    :name="`impact-${question.id}`"
                    :value="opt"
                    :disabled="evaluationEnregistree"
                  />
                  {{ LIBELLES_REPONSE[opt] }}
                </label>
              </fieldset>
            </li>
          </ul>
          <p v-if="complet" class="resultat-partiel" role="status">
            Verdict :
            <BadgeVerdict :ton="tonVerdictImpact(verdict)" :texte="libelleVerdictImpact(verdict)" />
          </p>
          <p v-if="complet && verdict === null" class="rappel">
            Aucune réponse « Oui » et au moins une réponse « Inconnu » : pas de verdict tant que
            l'inconnu n'est pas levé. L'évaluation peut être enregistrée « à compléter », puis
            refaite une fois la réponse connue.
          </p>
          <button
            v-if="complet && !evaluationEnregistree"
            type="button"
            :disabled="envoiEnCours"
            @click="enregistrerEvaluation"
          >
            Enregistrer cette évaluation
          </button>
          <p v-if="evaluationEnregistree" class="confirmation" role="status">
            Évaluation enregistrée.
          </p>
          <button v-if="evaluationEnregistree" type="button" @click="nouvelleEvaluation">
            Nouvelle évaluation
          </button>
          <!-- Enchaînement de la démarche (constat 17) : un système à impact
               direct passe à l'évaluation de criticité, nœud prérempli. -->
          <p v-if="evaluationEnregistree && verdict === 'impact_direct'" class="etape-suivante">
            Étape suivante :
            <RouterLink
              :to="{
                name: 'assistant-strategie-qualification',
                params: { clientId: props.clientId },
                query: {
                  element: nomElement,
                  ...(assetNodeIdSelectionne ? { noeud: assetNodeIdSelectionne } : {}),
                },
              }"
            >
              évaluer la criticité (ACFC) de ce système
            </RouterLink>
          </p>
        </section>
      </template>
    </template>

    <section v-if="historique.length > 0" class="bloc-historique">
      <h2>Évaluations enregistrées</h2>
      <div class="table-defilante">
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Auteur</th>
              <th scope="col">Système</th>
              <th scope="col">Nœud</th>
              <th scope="col">Méthode</th>
              <th scope="col">Verdict</th>
              <th scope="col"><span class="visuellement-masque">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in historique" :key="e.id">
              <td>{{ formaterDateFr(e.created_at) }}</td>
              <td>{{ e.auteur }}</td>
              <td>
                <details>
                  <summary>{{ e.nom_element }}</summary>
                  <ul class="reponses-detail">
                    <li v-for="q in e.questions" :key="q.id">
                      {{ q.texte.fr }} : {{ libelleReponse(e.reponses[q.id]) }}
                    </li>
                  </ul>
                </details>
              </td>
              <td>
                <RouterLink
                  v-if="e.noeud"
                  :to="{
                    name: 'dossier-vivant-actif',
                    params: { clientId: props.clientId, noeudId: e.noeud.id },
                  }"
                >
                  {{ e.noeud.name }}
                </RouterLink>
                <template v-else>—</template>
              </td>
              <td>{{ e.method_profile_version }}</td>
              <td>
                <BadgeVerdict
                  :ton="tonVerdictImpact(e.verdict)"
                  :texte="libelleVerdictImpact(e.verdict)"
                />
              </td>
              <td>
                <button
                  v-if="e.verdict === null && methodeStore.profilActif"
                  type="button"
                  @click="reevaluer(e.id)"
                >
                  Réévaluer (nouvelle entrée)
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.impact-assessment {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 56rem;
}

.bandeau-disclaimer {
  font-style: italic;
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.bloc-config,
.bloc-evaluation {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.formulaire label,
.nom-element {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input[type='text'],
select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

.questions-config {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ligne-question-config {
  display: flex;
  gap: 0.5rem;
}

.ligne-question-config input {
  flex: 1;
}

button {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lien-config {
  background: none;
  color: var(--vp-marque);
  padding: 0;
  text-decoration: underline;
  align-self: flex-start;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.liste-questions {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.liste-questions li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
}

.texte-question {
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.reponses-question {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.reponses-question label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.resultat-partiel {
  font-weight: 600;
}

.confirmation {
  color: var(--vp-marque);
  font-weight: 600;
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

.methode-active dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
}

.methode-active dd {
  margin: 0;
}

.reponses-question {
  border: 0;
  padding: 0;
  margin: 0;
}

.reponses-question legend {
  padding: 0;
  margin-bottom: 0.35rem;
}

.table-defilante {
  overflow-x: auto;
}

.table-defilante table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9rem;
}

.table-defilante th,
.table-defilante td {
  border-bottom: 1px solid var(--vp-bordure);
  padding: 0.4rem 0.5rem;
  text-align: left;
  vertical-align: top;
}

.reponses-detail {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.85rem;
}

.etape-suivante {
  margin: 0;
  font-weight: var(--vp-poids-medium);
}

.visuellement-masque {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>

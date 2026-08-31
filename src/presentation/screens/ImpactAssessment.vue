<script setup lang="ts">
// Impact Assessment / System Classification (F1 du catalogue §10,
// URS-F-056 à quater) — écran manquant trouvé le 29/08/2026 en comparant
// l'inventaire d'écrans réel (`src/presentation/screens/`) à celui
// documenté depuis la FDS v15 (Phase 3, 25/08/2026) : le store
// `useImpactAssessmentStore` et le moteur de décision existaient depuis
// la Phase 3 sans jamais avoir de composant, contrairement à ce que la
// FDS affirmait. Même patron que `AssistantStrategieQualification.vue`
// (ACFC, Phase 1) : méthode configurable par client, aucune question
// fabriquée par défaut (URS-F-056ter), verdict strictement binaire
// (Direct Impact / Not Direct Impact — pas de niveau "impact indirect",
// URS-F-056).
import { computed, onMounted, reactive, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useImpactAssessmentStore } from '../stores/useImpactAssessmentStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { OrigineMethodeImpactAssessment } from '../../logique-metier/domaine/types'
import type { ReponseQuestionOuiNon } from '../../logique-metier/assessment/moteurQuestionsOuiNon'
import { methodeCompletementRepondue } from '../../logique-metier/assessment/evaluerVerdictImpactAssessment'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const methodeStore = useImpactAssessmentStore()
const structureStore = useStructureSystemeStore()

const nomClient = ref<string | null>(null)
const formulaireConfigOuvert = ref(false)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await methodeStore.charger(props.clientId)
  await structureStore.charger(props.clientId)
  if (!methodeStore.profilActif) formulaireConfigOuvert.value = true
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

async function enregistrerNouvelleVersion(): Promise<void> {
  const questions = brouillonQuestions
    .map((texte) => texte.trim())
    .filter((texte) => texte.length > 0)
    .map((texte) => ({ texte }))
  if (questions.length === 0 || brouillonSource.value.trim().length === 0) return

  await methodeStore.creerNouvelleVersion(props.clientId, {
    questions,
    source: brouillonSource.value.trim(),
    origin: brouillonOrigin.value,
  })
  brouillonQuestions.splice(0, brouillonQuestions.length, '', '')
  brouillonSource.value = ''
  formulaireConfigOuvert.value = false
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

const complet = computed(() =>
  methodeStore.profilActif
    ? methodeCompletementRepondue(methodeStore.profilActif.questions, reponses)
    : false,
)

const verdict = computed(() => {
  if (!methodeStore.profilActif || !complet.value) return null
  // Recalcul local pour affichage immédiat — `creerEvaluation` recalcule
  // lui-même via le moteur déterministe, jamais une confiance sur ce
  // seul affichage (même discipline que l'ACFC).
  return Object.values(reponses).includes('oui') ? 'impact_direct' : 'non_impact_direct'
})

async function enregistrerEvaluation(): Promise<void> {
  if (!verdict.value || nomElement.value.trim().length === 0) return
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
</script>

<template>
  <main class="impact-assessment">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Impact Assessment / System Classification — {{ nomClient ?? props.clientId }}</h1>
    <p class="bandeau-disclaimer">
      Aide à la décision, non une décision de classification (URS-F-056).
    </p>

    <section v-if="!methodeStore.profilActif || formulaireConfigOuvert" class="bloc-config">
      <h2>Configuration de la méthode</h2>
      <p v-if="!methodeStore.profilActif" class="rappel" role="alert">
        Aucune méthode Impact Assessment n'est configurée pour ce client. Aucune question n'est
        proposée par défaut — saisissez les questions réelles de la procédure du client, mot pour
        mot (URS-F-056ter).
      </p>
      <form class="formulaire" @submit.prevent="enregistrerNouvelleVersion">
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
          <div v-for="(_, index) in brouillonQuestions" :key="index" class="ligne-question-config">
            <input
              v-model="brouillonQuestions[index]"
              type="text"
              :placeholder="`Question ${index + 1}`"
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
        <div class="actions">
          <button
            v-if="methodeStore.profilActif"
            type="button"
            @click="formulaireConfigOuvert = false"
          >
            Annuler
          </button>
          <button type="submit">Enregistrer cette version</button>
        </div>
      </form>
    </section>

    <template v-else>
      <section class="bloc-evaluation">
        <h2>
          Évaluation — {{ methodeStore.profilActif.source }} ({{
            methodeStore.profilActif.version
          }})
        </h2>
        <button type="button" class="lien-config" @click="formulaireConfigOuvert = true">
          Configurer une nouvelle version des questions
        </button>
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
            <p class="texte-question">{{ question.texte.fr }}</p>
            <div class="reponses-question">
              <label v-for="opt in ['oui', 'non', 'inconnu', 'sans_objet']" :key="opt">
                <input v-model="reponses[question.id]" type="radio" :value="opt" />
                {{ opt }}
              </label>
            </div>
          </li>
        </ul>
        <p v-if="verdict" class="resultat-partiel" role="status">
          Verdict :
          <strong>{{ verdict === 'impact_direct' ? 'Direct Impact' : 'Not Direct Impact' }}</strong>
        </p>
        <button
          v-if="verdict && !evaluationEnregistree"
          type="button"
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
      </section>
    </template>

    <section v-if="methodeStore.evaluations.length > 0" class="bloc-historique">
      <h2>Évaluations enregistrées</h2>
      <ul>
        <li v-for="e in methodeStore.evaluations" :key="e.id">
          {{ e.nom_element }} —
          {{ e.verdict === 'impact_direct' ? 'Direct Impact' : 'Not Direct Impact' }}
        </li>
      </ul>
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
  max-width: 40rem;
}

.bandeau-disclaimer {
  font-style: italic;
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
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
  color: white;
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
  text-transform: capitalize;
}

.resultat-partiel {
  font-weight: 600;
}

.confirmation {
  color: var(--vp-marque);
  font-weight: 600;
}
</style>

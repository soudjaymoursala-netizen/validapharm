<script setup lang="ts">
// Assistant de stratégie de qualification (FS §4.6, URS-F-050 à 055) —
// module par client (URS-F-054) ; l'accès depuis une section Change
// Control en cours de rédaction (même URS-F-054) reste hors périmètre de
// cet incrément — `change_control` n'existe pas encore comme
// `TemplateType` dans ce projet. Aucune génération IA ici (URS-F-050bis) :
// différée avec le reste du routage par mode (tâches #28/#29).
//
// Section 1 (ACFC) réécrite le 25/08/2026 (Phase 1 de convergence
// architecturale, `docs/convergence/CONVERGENCE_PLAN.md`) : remplace la
// grille de criticité codée en dur par une méthode ACFC configurable par
// client (`useMethodProfileACFCStore`) — voir
// `docs/convergence/TECHNICAL_DECISIONS.md` TD-002. Aucune question n'est
// fabriquée par défaut : tant qu'un client n'a rien configuré, l'écran le
// dit explicitement plutôt que de proposer une grille inventée.
import { computed, onMounted, reactive, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useMethodProfileACFCStore } from '../stores/useMethodProfileACFCStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { OrigineMethodeACFC, ReponseQuestionACFC } from '../../logique-metier/domaine/types'
import {
  evaluerVerdictACFC,
  methodeCompletementRepondue,
} from '../../logique-metier/acfc/evaluerVerdictACFC'
import {
  determinerConclusion,
  LIBELLES_CONCLUSION,
  VERSION_GRILLE_STRATEGIE_QUALIFICATION,
  type NiveauComplexite,
} from '../../logique-metier/strategie-qualification/grilleDecision'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const methodeStore = useMethodProfileACFCStore()
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
const brouillonOrigin = ref<OrigineMethodeACFC>('defini_utilisateur')

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

// --- Évaluation ACFC contre la méthode active ---
const nomElement = ref('')
// Nœud Structure Système évalué (optionnel) — trouvé manquant en simulant un
// vrai parcours de qualification (`assetNodeId` existait dans le store
// depuis l'origine de l'écran, Phase 1, sans jamais être exposé).
const assetNodeIdSelectionne = ref('')
const reponses = reactive<Record<string, ReponseQuestionACFC>>({})
const evaluationEnregistree = ref(false)

const complet = computed(() =>
  methodeStore.profilActif
    ? methodeCompletementRepondue(methodeStore.profilActif.questions, reponses)
    : false,
)

const verdict = computed(() => {
  if (!methodeStore.profilActif || !complet.value) return null
  return evaluerVerdictACFC(
    methodeStore.profilActif.questions,
    reponses,
    methodeStore.profilActif.decision_rule,
  )
})

async function enregistrerEvaluation(): Promise<void> {
  if (!verdict.value || nomElement.value.trim().length === 0) return
  await methodeStore.creerEvaluation(props.clientId, {
    nomElement: nomElement.value.trim(),
    assetNodeId: assetNodeIdSelectionne.value || null,
    reponses: { ...reponses },
  })
  evaluationEnregistree.value = true
}

// --- Complexité + conclusion (FS §4.6, inchangé dans son principe) ---
const complexite = ref<NiveauComplexite | null>(null)

const conclusion = computed(() =>
  verdict.value ? determinerConclusion(verdict.value, complexite.value) : null,
)
</script>

<template>
  <main class="assistant-strategie">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Stratégie de qualification — {{ nomClient ?? props.clientId }}</h1>
    <p class="bandeau-disclaimer">Aide à la décision, non une décision de qualification.</p>

    <section v-if="!methodeStore.profilActif || formulaireConfigOuvert" class="bloc-config">
      <h2>Configuration de la méthode ACFC</h2>
      <p v-if="!methodeStore.profilActif" class="rappel" role="alert">
        Aucune méthode ACFC n'est configurée pour ce client. Aucune question n'est proposée par
        défaut — saisissez les questions réelles de la procédure du client, mot pour mot.
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
      <section class="bloc-criticite">
        <h2>
          1. Évaluation ACFC — {{ methodeStore.profilActif.source }} ({{
            methodeStore.profilActif.version
          }})
        </h2>
        <button type="button" class="lien-config" @click="formulaireConfigOuvert = true">
          Configurer une nouvelle version des questions
        </button>
        <label class="nom-element">
          Composant/fonction évalué
          <input
            v-model="nomElement"
            type="text"
            required
            placeholder="ex. Vanne de régulation V-101"
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
          Verdict ACFC : <strong>{{ verdict === 'critique' ? 'Critique' : 'Non critique' }}</strong>
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
      </section>

      <section v-if="verdict" class="bloc-complexite">
        <h2>2. Évaluation de la complexité</h2>
        <label>
          <input v-model="complexite" type="radio" value="catalogue" />
          Catalogue — système sans adaptation particulière du fournisseur
        </label>
        <label>
          <input v-model="complexite" type="radio" value="specifique" />
          Spécifique — système fait à façon ou hautement configuré
        </label>
      </section>

      <section v-if="conclusion" class="bloc-conclusion">
        <h2>Conclusion</h2>
        <p class="conclusion" role="status">{{ LIBELLES_CONCLUSION[conclusion] }}</p>
        <p class="version-grille">
          Version de la table de décision : {{ VERSION_GRILLE_STRATEGIE_QUALIFICATION }}
        </p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.assistant-strategie {
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

.bloc-complexite {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bloc-complexite label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bloc-conclusion {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
}

.conclusion {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-marque);
}

.resultat-partiel {
  font-weight: 600;
}

.confirmation {
  color: var(--vp-marque);
  font-weight: 600;
}

.version-grille {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}
</style>

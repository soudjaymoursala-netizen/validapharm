<script setup lang="ts">
// Exécution d'un Test approuvé + preuves associées (Phases 7b/7c de
// convergence architecturale) — écran manquant trouvé en simulant un vrai
// parcours de qualification de bout en bout (§5.31 CONTEXTE-REPRISE-SESSION.
// md) : jusqu'ici, rédiger un protocole OQ était possible mais l'exécuter
// formellement (résultat par étape, mesures, preuves, clôture avec
// verdict explicite) ne l'était pas — les résultats étaient saisis
// directement dans le tableau libre du gabarit, sans piste de preuve
// dédiée ni garde-fou d'immutabilité post-clôture.
import { computed, onMounted, ref } from 'vue'
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

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const testStore = useTestDefinitionStore()
const executionStore = useExecutionStore()
const evidenceStore = useEvidenceStore()

const nomClient = ref<string | null>(null)

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

async function demarrer(): Promise<void> {
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

async function enregistrerResultat(executionId: string, testStepId: string): Promise<void> {
  const cle = cleEtape(executionId, testStepId)
  const resultat = resultatsBrouillon.value[cle]
  if (!resultat) return
  await executionStore.enregistrerResultatEtape(props.clientId, executionId, {
    testStepId,
    resultat,
    observation: observationsBrouillon.value[cle]?.trim() ?? '',
  })
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

async function ajouterMesure(executionStepId: string): Promise<void> {
  const brouillon = mesuresBrouillon.value[executionStepId]
  if (!brouillon || brouillon.libelle.trim().length === 0 || brouillon.valeur.trim().length === 0)
    return
  await executionStore.ajouterMesure(props.clientId, executionStepId, {
    libelle: brouillon.libelle.trim(),
    valeur: brouillon.valeur.trim(),
    unite: brouillon.unite.trim() || null,
  })
  mesuresBrouillon.value[executionStepId] = { libelle: '', valeur: '', unite: '' }
}

// --- Événements d'exécution ---
const typeEvenementBrouillon = ref<Record<string, TypeExecutionEvent>>({})
const descriptionEvenementBrouillon = ref<Record<string, string>>({})

async function consignerEvenement(executionId: string): Promise<void> {
  const type = typeEvenementBrouillon.value[executionId] ?? 'commentaire'
  const description = descriptionEvenementBrouillon.value[executionId]?.trim()
  if (!description) return
  await executionStore.consignerEvenement(props.clientId, executionId, {
    type,
    description,
    qualityEventId: null,
  })
  descriptionEvenementBrouillon.value[executionId] = ''
}

// --- Preuves (Evidence) ---
const typePreuveBrouillon = ref<Record<string, TypeEvidence>>({})
const titrePreuveBrouillon = ref<Record<string, string>>({})
const descriptionPreuveBrouillon = ref<Record<string, string>>({})
const referenceLocalisationBrouillon = ref<Record<string, string>>({})

async function enregistrerPreuve(executionId: string): Promise<void> {
  const type = typePreuveBrouillon.value[executionId] ?? 'native'
  const titre = titrePreuveBrouillon.value[executionId]?.trim()
  if (!titre) return
  const resultat = await evidenceStore.enregistrerPreuve(props.clientId, executionId, {
    executionStepId: null,
    type,
    titre,
    description: descriptionPreuveBrouillon.value[executionId]?.trim() ?? '',
  })
  if ('erreur' in resultat) return
  if (type === 'document') {
    const reference = referenceLocalisationBrouillon.value[executionId]?.trim()
    if (reference) {
      await evidenceStore.ajouterLocalisation(props.clientId, resultat.id, {
        systeme: 'github',
        reference,
      })
    }
  }
  titrePreuveBrouillon.value[executionId] = ''
  descriptionPreuveBrouillon.value[executionId] = ''
  referenceLocalisationBrouillon.value[executionId] = ''
}

// --- Clôture ---
const verdictBrouillon = ref<Record<string, VerdictExecution>>({})

async function cloturer(executionId: string): Promise<void> {
  const verdict = verdictBrouillon.value[executionId]
  if (!verdict) return
  await executionStore.cloturerExecution(props.clientId, executionId, verdict)
}
</script>

<template>
  <main class="execution-tests">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Clients</RouterLink>
    <h1>Exécution de tests — {{ nomClient ?? props.clientId }}</h1>
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
        <button type="submit">Démarrer l'exécution</button>
      </form>
    </section>

    <section v-if="executionsEnCours.length > 0" class="bloc-en-cours">
      <h2>Exécutions en cours</h2>
      <article v-for="execution in executionsEnCours" :key="execution.id" class="carte-execution">
        <h3>{{ testDe(execution.id)?.titre ?? execution.test_id }}</h3>
        <p class="meta">
          Démarrée le {{ execution.date_debut }}, exécutant {{ execution.executant }}
        </p>

        <h4>Étapes</h4>
        <ul class="liste-etapes">
          <li v-for="etape in testDe(execution.id)?.etapes ?? []" :key="etape.id">
            <p>
              {{ etape.action }} — <em>attendu : {{ etape.resultat_attendu }}</em>
            </p>
            <template
              v-if="
                !executionStore
                  .etapesExecution(execution.id)
                  .some((e) => e.test_step_id === etape.id)
              "
            >
              <select v-model="resultatsBrouillon[cleEtape(execution.id, etape.id)]">
                <option value="">— choisir —</option>
                <option value="conforme">Conforme</option>
                <option value="non_conforme">Non conforme</option>
                <option value="non_applicable">Non applicable</option>
              </select>
              <input
                v-model="observationsBrouillon[cleEtape(execution.id, etape.id)]"
                type="text"
                placeholder="Observation"
              />
              <button type="button" @click="enregistrerResultat(execution.id, etape.id)">
                Enregistrer le résultat
              </button>
            </template>
            <template v-else>
              <p
                v-for="es in executionStore
                  .etapesExecution(execution.id)
                  .filter((e) => e.test_step_id === etape.id)"
                :key="es.id"
                class="resultat-enregistre"
              >
                Résultat : <strong>{{ es.resultat }}</strong>
                <span v-if="es.observation"> — {{ es.observation }}</span>
                <span v-if="executionStore.mesuresEtape(es.id).length > 0" class="mesures">
                  Mesures :
                  <span v-for="m in executionStore.mesuresEtape(es.id)" :key="m.id">
                    {{ m.libelle }} = {{ m.valeur }}{{ m.unite ? ` ${m.unite}` : '' }};
                  </span>
                </span>
                <span class="ajout-mesure">
                  <input
                    v-model="mesureBrouillon(es.id).libelle"
                    type="text"
                    placeholder="Libellé mesure"
                  />
                  <input v-model="mesureBrouillon(es.id).valeur" type="text" placeholder="Valeur" />
                  <input v-model="mesureBrouillon(es.id).unite" type="text" placeholder="Unité" />
                  <button type="button" @click="ajouterMesure(es.id)">+ Mesure</button>
                </span>
              </p>
            </template>
          </li>
        </ul>

        <h4>Événement</h4>
        <div class="ligne-formulaire">
          <select v-model="typeEvenementBrouillon[execution.id]">
            <option value="commentaire">Commentaire</option>
            <option value="action">Action</option>
            <option value="retest">Retest</option>
            <option value="deviation">Déviation</option>
            <option value="changement">Changement</option>
            <option value="arret">Arrêt</option>
            <option value="externe">Externe</option>
            <option value="continuer">Continuer</option>
          </select>
          <input
            v-model="descriptionEvenementBrouillon[execution.id]"
            type="text"
            placeholder="Description"
          />
          <button type="button" @click="consignerEvenement(execution.id)">Consigner</button>
        </div>
        <ul v-if="executionStore.evenementsExecution(execution.id).length > 0">
          <li v-for="ev in executionStore.evenementsExecution(execution.id)" :key="ev.id">
            {{ ev.type }} — {{ ev.description }}
          </li>
        </ul>

        <h4>Preuves</h4>
        <div class="ligne-formulaire">
          <select v-model="typePreuveBrouillon[execution.id]">
            <option value="native">Native (observation directe)</option>
            <option value="document">Document</option>
          </select>
          <input v-model="titrePreuveBrouillon[execution.id]" type="text" placeholder="Titre" />
          <input
            v-model="descriptionPreuveBrouillon[execution.id]"
            type="text"
            placeholder="Description"
          />
          <input
            v-if="typePreuveBrouillon[execution.id] === 'document'"
            v-model="referenceLocalisationBrouillon[execution.id]"
            type="text"
            placeholder="Référence GitHub (chemin/commit)"
          />
          <button type="button" @click="enregistrerPreuve(execution.id)">
            Enregistrer la preuve
          </button>
        </div>
        <ul v-if="evidenceStore.preuvesExecution(execution.id).length > 0">
          <li v-for="preuve in evidenceStore.preuvesExecution(execution.id)" :key="preuve.id">
            {{ preuve.titre }} ({{ preuve.type }})
          </li>
        </ul>

        <h4>Clôture</h4>
        <div class="ligne-formulaire">
          <select v-model="verdictBrouillon[execution.id]">
            <option value="">— choisir —</option>
            <option value="conforme">Conforme</option>
            <option value="non_conforme">Non conforme</option>
            <option value="conforme_avec_ecart">Conforme avec écart</option>
          </select>
          <button type="button" @click="cloturer(execution.id)">Clôturer l'exécution</button>
        </div>
      </article>
    </section>

    <section v-if="executionsTerminees.length > 0" class="bloc-terminees">
      <h2>Exécutions terminées</h2>
      <ul>
        <li v-for="execution in executionsTerminees" :key="execution.id">
          {{ testDe(execution.id)?.titre ?? execution.test_id }} — verdict :
          <strong>{{ execution.verdict }}</strong> (clôturée le {{ execution.date_fin }})
        </li>
      </ul>
    </section>
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

.ajout-mesure {
  display: flex;
  gap: 0.4rem;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

button {
  cursor: pointer;
}
</style>

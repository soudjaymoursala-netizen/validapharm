<script setup lang="ts">
// Écran Parameter → ClassificationCriticiteParametre / CPP / CQA —
// gap trouvé en poursuivant l'inventaire de
// §5.31 CONTEXTE-REPRISE-SESSION.md : le domaine, la persistance et le store
// existaient sans aucun écran, rendant impossible de classer un paramètre
// critique et de déclarer un CPP/CQA pour un vrai projet.
import { onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useParameterStore } from '../stores/useParameterStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { NiveauCriticiteParametre } from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const parameterStore = useParameterStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await structureStore.charger(props.clientId)
  await parameterStore.charger(props.clientId)
})

function libelleParametre(parameterId: string): string {
  const p = parameterStore.parametres.find((p) => p.id === parameterId)
  return p ? p.nom : parameterId
}

// --- Paramètres ---
const nomParametre = ref('')
const descriptionParametre = ref('')
const uniteParametre = ref('')
const assetNodeParametre = ref('')

async function creerParametre(): Promise<void> {
  if (nomParametre.value.trim().length === 0) return
  await parameterStore.creerParametre(props.clientId, {
    nom: nomParametre.value.trim(),
    description: descriptionParametre.value.trim(),
    unite: uniteParametre.value.trim() || null,
    assetNodeId: assetNodeParametre.value || null,
  })
  nomParametre.value = ''
  descriptionParametre.value = ''
  uniteParametre.value = ''
  assetNodeParametre.value = ''
}

// --- Classification de criticité (indicatif — jamais un CPP/CQA) ---
const parametreClassification = ref('')
const niveauClassification = ref<NiveauCriticiteParametre | ''>('')
const contexteClassification = ref('')
const justificationClassification = ref('')

async function classifier(): Promise<void> {
  if (
    !parametreClassification.value ||
    !niveauClassification.value ||
    justificationClassification.value.trim().length === 0
  )
    return
  await parameterStore.classifierParametre(props.clientId, {
    parameterId: parametreClassification.value,
    niveau: niveauClassification.value,
    contexte: contexteClassification.value.trim() || null,
    justification: justificationClassification.value.trim(),
  })
  parametreClassification.value = ''
  niveauClassification.value = ''
  contexteClassification.value = ''
  justificationClassification.value = ''
}

// --- CPP (déclaration humaine explicite, distincte de la classification) ---
const parametreCPP = ref('')
const contexteCPP = ref('')
const justificationCPP = ref('')
const motifsDesactivationCPP = ref<Record<string, string>>({})

async function declarerCPP(): Promise<void> {
  if (
    !parametreCPP.value ||
    contexteCPP.value.trim().length === 0 ||
    justificationCPP.value.trim().length === 0
  )
    return
  await parameterStore.declarerCPP(props.clientId, {
    parameterId: parametreCPP.value,
    contexte: contexteCPP.value.trim(),
    justification: justificationCPP.value.trim(),
  })
  parametreCPP.value = ''
  contexteCPP.value = ''
  justificationCPP.value = ''
}

async function desactiverCPP(cppId: string): Promise<void> {
  const motif = motifsDesactivationCPP.value[cppId]?.trim()
  if (!motif) return
  await parameterStore.desactiverCPP(props.clientId, cppId, motif)
  motifsDesactivationCPP.value[cppId] = ''
}

// --- CQA (déclaration humaine explicite, pas nécessairement liée à un Parameter) ---
const nomCQA = ref('')
const descriptionCQA = ref('')
const contexteCQA = ref('')
const justificationCQA = ref('')
const motifsDesactivationCQA = ref<Record<string, string>>({})

async function declarerCQA(): Promise<void> {
  if (
    nomCQA.value.trim().length === 0 ||
    contexteCQA.value.trim().length === 0 ||
    justificationCQA.value.trim().length === 0
  )
    return
  await parameterStore.declarerCQA(props.clientId, {
    nom: nomCQA.value.trim(),
    description: descriptionCQA.value.trim(),
    contexte: contexteCQA.value.trim(),
    justification: justificationCQA.value.trim(),
  })
  nomCQA.value = ''
  descriptionCQA.value = ''
  contexteCQA.value = ''
  justificationCQA.value = ''
}

async function desactiverCQA(cqaId: string): Promise<void> {
  const motif = motifsDesactivationCQA.value[cqaId]?.trim()
  if (!motif) return
  await parameterStore.desactiverCQA(props.clientId, cqaId, motif)
  motifsDesactivationCQA.value[cqaId] = ''
}

const libellesNiveauCriticite: Record<NiveauCriticiteParametre, string> = {
  important: 'Important',
  critique: 'Critique',
}
</script>

<template>
  <main class="parametres-critiques">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Clients</RouterLink>
    <h1>Paramètres critiques — {{ nomClient ?? props.clientId }}</h1>
    <p class="rappel">
      Un CPP ou un CQA n'est jamais promu automatiquement à partir d'une classification de criticité
      — toujours une déclaration humaine explicite et séparée (ICH Q8/Q9/Q10).
    </p>

    <section class="bloc-parametres">
      <h2>Paramètres</h2>
      <form class="formulaire" @submit.prevent="creerParametre">
        <label>
          Nom
          <input v-model="nomParametre" type="text" required placeholder="ex. Température" />
        </label>
        <label>
          Description
          <textarea v-model="descriptionParametre" rows="2" />
        </label>
        <label>
          Unité
          <input v-model="uniteParametre" type="text" placeholder="ex. °C" />
        </label>
        <label>
          Nœud Structure Système (optionnel)
          <select v-model="assetNodeParametre">
            <option value="">— aucun —</option>
            <option v-for="noeud in structureStore.noeuds" :key="noeud.id" :value="noeud.id">
              {{ noeud.name }} ({{ noeud.code }})
            </option>
          </select>
        </label>
        <button type="submit">Créer le paramètre</button>
      </form>
      <ul v-if="parameterStore.parametres.length > 0">
        <li v-for="p in parameterStore.parametres" :key="p.id">
          <strong>{{ p.nom }}</strong>
          <span v-if="p.unite"> ({{ p.unite }})</span>
        </li>
      </ul>
      <p v-else>Aucun paramètre pour l'instant.</p>
    </section>

    <section class="bloc-classification">
      <h2>Classification de criticité (indicatif, ne crée ni CPP ni CQA)</h2>
      <form class="formulaire" @submit.prevent="classifier">
        <label>
          Paramètre
          <select v-model="parametreClassification" required>
            <option value="">— choisir —</option>
            <option v-for="p in parameterStore.parametres" :key="p.id" :value="p.id">
              {{ p.nom }}
            </option>
          </select>
        </label>
        <label>
          Niveau
          <select v-model="niveauClassification" required>
            <option value="">— choisir —</option>
            <option value="important">Important</option>
            <option value="critique">Critique</option>
          </select>
        </label>
        <label>
          Contexte (optionnel)
          <input v-model="contexteClassification" type="text" />
        </label>
        <label>
          Justification
          <textarea v-model="justificationClassification" rows="2" required />
        </label>
        <button type="submit">Classifier</button>
      </form>
      <ul v-if="parameterStore.classifications.length > 0">
        <li v-for="c in parameterStore.classifications" :key="c.id">
          {{ libelleParametre(c.parameter_id) }} —
          <strong>{{ libellesNiveauCriticite[c.niveau] }}</strong>
        </li>
      </ul>
      <p v-else>Aucune classification pour l'instant.</p>
    </section>

    <section class="bloc-cpp">
      <h2>CPP (Critical Process Parameter)</h2>
      <form class="formulaire" @submit.prevent="declarerCPP">
        <label>
          Paramètre
          <select v-model="parametreCPP" required>
            <option value="">— choisir —</option>
            <option v-for="p in parameterStore.parametres" :key="p.id" :value="p.id">
              {{ p.nom }}
            </option>
          </select>
        </label>
        <label>
          Contexte
          <input v-model="contexteCPP" type="text" required placeholder="ex. Recette lot A" />
        </label>
        <label>
          Justification
          <textarea v-model="justificationCPP" rows="2" required />
        </label>
        <button type="submit">Déclarer le CPP</button>
      </form>
      <ul v-if="parameterStore.cppsActifs.length > 0" class="liste-cpp">
        <li v-for="cpp in parameterStore.cppsActifs" :key="cpp.id">
          <p>
            <strong>{{ libelleParametre(cpp.parameter_id) }}</strong> — {{ cpp.contexte }}
          </p>
          <input
            v-model="motifsDesactivationCPP[cpp.id]"
            type="text"
            placeholder="Motif de désactivation"
          />
          <button type="button" @click="desactiverCPP(cpp.id)">Désactiver</button>
        </li>
      </ul>
      <p v-else>Aucun CPP actif pour l'instant.</p>
    </section>

    <section class="bloc-cqa">
      <h2>CQA (Critical Quality Attribute)</h2>
      <form class="formulaire" @submit.prevent="declarerCQA">
        <label>
          Nom
          <input v-model="nomCQA" type="text" required placeholder="ex. Stérilité" />
        </label>
        <label>
          Description
          <textarea v-model="descriptionCQA" rows="2" />
        </label>
        <label>
          Contexte
          <input v-model="contexteCQA" type="text" required />
        </label>
        <label>
          Justification
          <textarea v-model="justificationCQA" rows="2" required />
        </label>
        <button type="submit">Déclarer le CQA</button>
      </form>
      <ul v-if="parameterStore.cqasActifs.length > 0" class="liste-cqa">
        <li v-for="cqa in parameterStore.cqasActifs" :key="cqa.id">
          <p>
            <strong>{{ cqa.nom }}</strong> — {{ cqa.contexte }}
          </p>
          <input
            v-model="motifsDesactivationCQA[cqa.id]"
            type="text"
            placeholder="Motif de désactivation"
          />
          <button type="button" @click="desactiverCQA(cqa.id)">Désactiver</button>
        </li>
      </ul>
      <p v-else>Aucun CQA actif pour l'instant.</p>
    </section>
  </main>
</template>

<style scoped>
.parametres-critiques {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 48rem;
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
select,
textarea {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
}

.liste-cpp li,
.liste-cqa li {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

button {
  cursor: pointer;
}
</style>

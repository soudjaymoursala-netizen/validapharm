<script setup lang="ts">
// Configuration client (FDS §2) — version minimale : connexion au dépôt
// GitHub dédié (URS-NF-044). Fournisseur IA / gabarit d'export /
// consentement télémétrie restent backlog (tâches #14/#13).
import { onMounted, reactive, ref } from 'vue'
import {
  useConnexionGitHubStore,
  type ResultatTestConnexion,
} from '../stores/useConnexionGitHubStore'

const store = useConnexionGitHubStore()
const brouillon = reactive({ owner: '', repo: '', branche: 'main', jeton: '' })
const resultatTest = ref<ResultatTestConnexion | undefined>(undefined)
const testEnCours = ref(false)

onMounted(async () => {
  await store.charger()
  if (store.connexion) {
    brouillon.owner = store.connexion.owner
    brouillon.repo = store.connexion.repo
    brouillon.branche = store.connexion.branche
    brouillon.jeton = store.connexion.jeton
  }
})

async function enregistrer(): Promise<void> {
  await store.enregistrer({ ...brouillon })
  resultatTest.value = undefined
}

async function effacer(): Promise<void> {
  await store.effacer()
  brouillon.owner = ''
  brouillon.repo = ''
  brouillon.branche = 'main'
  brouillon.jeton = ''
  resultatTest.value = undefined
}

async function testerConnexion(): Promise<void> {
  testEnCours.value = true
  try {
    resultatTest.value = await store.testerConnexion()
  } finally {
    testEnCours.value = false
  }
}
</script>

<template>
  <main class="configuration-client">
    <RouterLink :to="{ name: 'tableau-de-bord' }">&larr; Tableau de bord</RouterLink>
    <h1>Configuration client</h1>

    <section class="bloc-github">
      <h2>Dépôt GitHub dédié</h2>
      <p class="rappel">
        Utilisez un jeton d'accès personnel (PAT) à portée strictement restreinte à ce seul dépôt —
        jamais un jeton donnant accès à l'ensemble de votre compte GitHub (URS-NF-044bis).
      </p>

      <form class="formulaire" @submit.prevent="enregistrer">
        <label>
          Propriétaire (owner)
          <input v-model="brouillon.owner" type="text" required placeholder="ex. acme-corp" />
        </label>
        <label>
          Dépôt
          <input v-model="brouillon.repo" type="text" required placeholder="ex. validapharm-data" />
        </label>
        <label>
          Branche
          <input v-model="brouillon.branche" type="text" placeholder="main" />
        </label>
        <label>
          Jeton d'accès personnel
          <input v-model="brouillon.jeton" type="password" required autocomplete="off" />
        </label>
        <div class="actions">
          <button type="button" @click="effacer">Effacer</button>
          <button type="submit">Enregistrer</button>
        </div>
      </form>

      <div class="test-connexion">
        <button type="button" :disabled="!store.connexion || testEnCours" @click="testerConnexion">
          {{ testEnCours ? 'Test en cours…' : 'Tester la connexion' }}
        </button>
        <p v-if="resultatTest?.ok === true" class="test-succes">
          Connexion réussie — branche « {{ brouillon.branche || 'main' }} » au commit
          {{ resultatTest.shaBranche.slice(0, 7) }}.
        </p>
        <p v-else-if="resultatTest?.ok === false" class="test-echec" role="alert">
          Échec de connexion : {{ resultatTest.message }}
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.configuration-client {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 32rem;
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

.formulaire label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
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
  background-color: var(--vp-bordure);
  cursor: not-allowed;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.test-connexion {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.test-succes {
  color: var(--vp-statut-qualifie);
}

.test-echec {
  color: var(--vp-statut-requalification-en-retard);
}
</style>

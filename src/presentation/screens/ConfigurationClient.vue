<script setup lang="ts">
// Configuration client — connexion au dépôt GitHub dédié
// + relais IA, tous deux globaux à
// l'installation (un seul dépôt/relais, pas un par client — contrairement
// au fournisseur IA/qualification de fiabilité, qui sont par client et se
// configurent sur l'écran Configuration IA d'un client, GestionClients.vue).
import { onMounted, reactive, ref, type Ref } from 'vue'
import {
  useConnexionGitHubStore,
  type ResultatTestConnexion,
} from '../stores/useConnexionGitHubStore'
import { useConnexionAuthentificationStore } from '../stores/useConnexionAuthentificationStore'
import { useConnexionRelaisIAStore } from '../stores/useConnexionRelaisIAStore'

const store = useConnexionGitHubStore()
const brouillon = reactive({ owner: '', repo: '', branche: 'main', jeton: '' })
const resultatTest = ref<ResultatTestConnexion | undefined>(undefined)
const testEnCours = ref(false)
const vientDEnregistrer = ref(false)

const relaisStore = useConnexionRelaisIAStore()
const brouillonRelais = reactive({ relayUrl: '', jeton: '' })
const vientDEnregistrerRelais = ref(false)

// Worker d'authentification — volontairement séparé du relais IA
// ci-dessous : sans jeton fixe (le jeton de session s'obtient dynamiquement
// via /auth/login), et accessible AVANT toute connexion (cet écran entier
// est exclu de la garde de routeur globale, `router/index.ts`) puisque
// l'utilisateur doit pouvoir indiquer où se connecter avant de se connecter.
const authentificationStore = useConnexionAuthentificationStore()
const brouillonAuthentification = reactive({ relayUrl: '' })
const vientDEnregistrerAuthentification = ref(false)

const DUREE_AFFICHAGE_CONFIRMATION_MS = 3000

function signalerEnregistrement(indicateur: Ref<boolean>): void {
  indicateur.value = true
  setTimeout(() => {
    indicateur.value = false
  }, DUREE_AFFICHAGE_CONFIRMATION_MS)
}

onMounted(async () => {
  await store.charger()
  if (store.connexion) {
    brouillon.owner = store.connexion.owner
    brouillon.repo = store.connexion.repo
    brouillon.branche = store.connexion.branche
    brouillon.jeton = store.connexion.jeton
  }

  await relaisStore.charger()
  if (relaisStore.connexion) {
    brouillonRelais.relayUrl = relaisStore.connexion.relayUrl
    brouillonRelais.jeton = relaisStore.connexion.jeton
  }

  await authentificationStore.charger()
  if (authentificationStore.connexion) {
    brouillonAuthentification.relayUrl = authentificationStore.connexion.relayUrl
  }
})

async function enregistrer(): Promise<void> {
  await store.enregistrer({ ...brouillon })
  resultatTest.value = undefined
  signalerEnregistrement(vientDEnregistrer)
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

async function enregistrerRelais(): Promise<void> {
  await relaisStore.enregistrer({ ...brouillonRelais })
  signalerEnregistrement(vientDEnregistrerRelais)
}

async function effacerRelais(): Promise<void> {
  await relaisStore.effacer()
  brouillonRelais.relayUrl = ''
  brouillonRelais.jeton = ''
}

async function enregistrerAuthentification(): Promise<void> {
  await authentificationStore.enregistrer({ ...brouillonAuthentification })
  signalerEnregistrement(vientDEnregistrerAuthentification)
}
</script>

<template>
  <main class="configuration-client">
    <RouterLink :to="{ name: 'tableau-de-bord' }" class="lien-retour">Tableau de bord</RouterLink>
    <h1>Configuration client</h1>

    <section class="bloc-github">
      <h2>Dépôt GitHub dédié</h2>
      <p class="rappel">
        Utilisez un jeton d'accès personnel (PAT) à portée strictement restreinte à ce seul dépôt —
        jamais un jeton donnant accès à l'ensemble de votre compte GitHub.
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
        <p v-if="vientDEnregistrer" class="confirmation-enregistrement" role="status">
          ✓ Enregistré.
        </p>
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

    <section class="bloc-relais-ia">
      <h2>Relais IA</h2>
      <p class="rappel">
        Le navigateur ne contacte jamais un fournisseur d'IA directement : toutes les requêtes
        passent par ce relais serverless unique, qui détient la clé du fournisseur configuré côté
        serveur.
      </p>

      <form class="formulaire" @submit.prevent="enregistrerRelais">
        <label>
          URL du relais
          <input
            v-model="brouillonRelais.relayUrl"
            type="url"
            required
            placeholder="https://relais.exemple.workers.dev"
          />
        </label>
        <label>
          Jeton d'accès
          <input v-model="brouillonRelais.jeton" type="password" required autocomplete="off" />
        </label>
        <div class="actions">
          <button type="button" @click="effacerRelais">Effacer</button>
          <button type="submit">Enregistrer</button>
        </div>
        <p v-if="vientDEnregistrerRelais" class="confirmation-enregistrement" role="status">
          ✓ Enregistré.
        </p>
      </form>
    </section>

    <section class="bloc-authentification">
      <h2>Authentification (comptes réels)</h2>
      <p class="rappel">
        Worker Cloudflare + base D1 dédiés aux comptes/rôles/clients de l'organisation — remplace le
        verrou local par une vraie session. Aucun jeton fixe à saisir ici : la session s'obtient en
        se connectant sur l'écran « Se connecter ».
      </p>

      <form class="formulaire" @submit.prevent="enregistrerAuthentification">
        <label>
          URL du Worker d'authentification
          <input
            v-model="brouillonAuthentification.relayUrl"
            type="url"
            required
            placeholder="https://auth.exemple.workers.dev"
          />
        </label>
        <div class="actions">
          <button type="submit">Enregistrer</button>
        </div>
        <p
          v-if="vientDEnregistrerAuthentification"
          class="confirmation-enregistrement"
          role="status"
        >
          ✓ Enregistré.
        </p>
      </form>
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
  color: var(--vp-marque-bouton-texte);
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

.confirmation-enregistrement {
  color: var(--vp-statut-qualifie);
  font-weight: var(--vp-poids-medium);
  align-self: flex-start;
}
</style>

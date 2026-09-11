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
import { useAuthStore } from '../stores/useAuthStore'
import {
  useConnexionAuthentificationStore,
  type ResultatTestConnexionAuthentification,
} from '../stores/useConnexionAuthentificationStore'
import {
  useConnexionRelaisIAStore,
  type ResultatTestConnexionRelaisIA,
} from '../stores/useConnexionRelaisIAStore'

const authStore = useAuthStore()

const store = useConnexionGitHubStore()
const brouillon = reactive({ owner: '', repo: '', branche: 'main', jeton: '' })
const resultatTest = ref<ResultatTestConnexion | undefined>(undefined)
const testEnCours = ref(false)
const vientDEnregistrer = ref(false)
const erreurEnregistrement = ref<string | null>(null)

const relaisStore = useConnexionRelaisIAStore()
const brouillonRelais = reactive({ relayUrl: '', jeton: '' })
const vientDEnregistrerRelais = ref(false)
const erreurEnregistrementRelais = ref<string | null>(null)
const resultatTestRelais = ref<ResultatTestConnexionRelaisIA | undefined>(undefined)
const testRelaisEnCours = ref(false)

/** Réservé à un admin côté Worker (paramètre partagé par toute l'installation) — jamais un message technique brut pour ce cas attendu. */
function messageErreurParametreInstallation(erreur: string): string {
  return erreur === 'non_autorise'
    ? "Réservé à un administrateur (paramètre partagé par toute l'installation)."
    : `Échec de l'enregistrement : ${erreur}`
}

// Worker d'authentification — volontairement séparé du relais IA
// ci-dessous : sans jeton fixe (le jeton de session s'obtient dynamiquement
// via /auth/login), et accessible AVANT toute connexion (cet écran entier
// est exclu de la garde de routeur globale, `router/index.ts`) puisque
// l'utilisateur doit pouvoir indiquer où se connecter avant de se connecter.
const authentificationStore = useConnexionAuthentificationStore()
const brouillonAuthentification = reactive({ relayUrl: '' })
const vientDEnregistrerAuthentification = ref(false)
const resultatTestAuthentification = ref<ResultatTestConnexionAuthentification | undefined>(
  undefined,
)
const testAuthentificationEnCours = ref(false)

const DUREE_AFFICHAGE_CONFIRMATION_MS = 3000

function signalerEnregistrement(indicateur: Ref<boolean>): void {
  indicateur.value = true
  setTimeout(() => {
    indicateur.value = false
  }, DUREE_AFFICHAGE_CONFIRMATION_MS)
}

onMounted(async () => {
  // Cet écran est délibérément exclu de la garde de routeur globale
  // (accessible avant toute connexion, pour indiquer où se connecter) —
  // ce qui veut aussi dire que `router.beforeEach` n'y appelle jamais
  // `authStore.charger()`. Sans cet appel explicite, une arrivée directe
  // sur `/configuration` (lien, rechargement de page...) laisse
  // `authStore.jeton` non restauré depuis IndexedDB, alors qu'une vraie
  // session existe : le dépôt GitHub/Relais IA (désormais des paramètres
  // Worker/D1, voir `useConnexionGitHubStore`) échouait alors à charger
  // avec `relais_non_configure`, constaté en test — jamais un vrai défaut
  // de configuration.
  if (!authStore.sessionInitialisee) await authStore.charger()

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
  erreurEnregistrement.value = null
  const resultat = await store.enregistrer({ ...brouillon })
  if (!resultat.ok) {
    erreurEnregistrement.value = messageErreurParametreInstallation(resultat.erreur)
    return
  }
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
  erreurEnregistrementRelais.value = null
  const resultat = await relaisStore.enregistrer({ ...brouillonRelais })
  if (!resultat.ok) {
    erreurEnregistrementRelais.value = messageErreurParametreInstallation(resultat.erreur)
    return
  }
  resultatTestRelais.value = undefined
  signalerEnregistrement(vientDEnregistrerRelais)
}

async function effacerRelais(): Promise<void> {
  await relaisStore.effacer()
  brouillonRelais.relayUrl = ''
  brouillonRelais.jeton = ''
  resultatTestRelais.value = undefined
}

async function testerConnexionRelais(): Promise<void> {
  testRelaisEnCours.value = true
  try {
    resultatTestRelais.value = await relaisStore.testerConnexion()
  } finally {
    testRelaisEnCours.value = false
  }
}

async function enregistrerAuthentification(): Promise<void> {
  await authentificationStore.enregistrer({ ...brouillonAuthentification })
  resultatTestAuthentification.value = undefined
  signalerEnregistrement(vientDEnregistrerAuthentification)
}

async function testerConnexionAuthentification(): Promise<void> {
  testAuthentificationEnCours.value = true
  try {
    resultatTestAuthentification.value = await authentificationStore.testerConnexion()
  } finally {
    testAuthentificationEnCours.value = false
  }
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
        <p v-if="erreurEnregistrement" class="erreur-enregistrement" role="alert">
          {{ erreurEnregistrement }}
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
        <p v-if="erreurEnregistrementRelais" class="erreur-enregistrement" role="alert">
          {{ erreurEnregistrementRelais }}
        </p>
      </form>

      <div class="test-connexion">
        <button
          type="button"
          :disabled="!relaisStore.connexion || testRelaisEnCours"
          @click="testerConnexionRelais"
        >
          {{ testRelaisEnCours ? 'Test en cours…' : 'Tester la connexion' }}
        </button>
        <p v-if="resultatTestRelais?.ok === true" class="test-succes">
          Connexion réussie — relais joignable, jeton valide.
        </p>
        <p v-else-if="resultatTestRelais?.ok === false" class="test-echec" role="alert">
          Échec de connexion : {{ resultatTestRelais.message }}
        </p>
      </div>
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

      <div class="test-connexion">
        <button
          type="button"
          :disabled="!authentificationStore.connexion || testAuthentificationEnCours"
          @click="testerConnexionAuthentification"
        >
          {{ testAuthentificationEnCours ? 'Test en cours…' : 'Tester la connexion' }}
        </button>
        <p v-if="resultatTestAuthentification?.ok === true" class="test-succes">
          Connexion réussie — Worker d'authentification joignable.
        </p>
        <p v-else-if="resultatTestAuthentification?.ok === false" class="test-echec" role="alert">
          Échec de connexion : {{ resultatTestAuthentification.message }}
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

.erreur-enregistrement {
  color: var(--vp-statut-requalification-en-retard);
  font-weight: var(--vp-poids-medium);
  align-self: flex-start;
  margin: 0;
}
</style>

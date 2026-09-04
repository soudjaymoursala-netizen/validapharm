<script setup lang="ts">
// Configuration du miroir Drive par client (SDS §5bis) — dossier Drive
// dédié + jeton, isolés par client_id. Déclenchement manuel uniquement
// dans cet incrément ("Sauvegarder maintenant", URS-NF-011) ; le
// déclenchement automatique par heuristique de fin de session reste
// backlog (voir useMiroirDriveStore.ts).
import { computed, onMounted, reactive, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import {
  useConnexionDriveStore,
  type ResultatTestConnexionDrive,
} from '../stores/useConnexionDriveStore'
import { useMiroirDriveStore, type ResultatMiroir } from '../stores/useMiroirDriveStore'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const connexionStore = useConnexionDriveStore()
const miroirStore = useMiroirDriveStore()

const nomClient = ref<string | null>(null)
const brouillon = reactive({ dossierId: '', jeton: '' })
const resultatTest = ref<ResultatTestConnexionDrive | undefined>(undefined)
const testEnCours = ref(false)
const resultatMiroir = ref<ResultatMiroir | undefined>(undefined)
const dernierMiroirReussi = ref<string | null>(null)

const messageMiroir = computed(() => {
  if (resultatMiroir.value === undefined) return null
  if (resultatMiroir.value.ok) {
    return { type: 'succes', texte: `${resultatMiroir.value.nbFichiers} fichier(s) miroité(s).` }
  }
  return { type: 'erreur', texte: resultatMiroir.value.message }
})

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null

  await connexionStore.charger(props.clientId)
  if (connexionStore.connexion) {
    brouillon.dossierId = connexionStore.connexion.dossierId
    brouillon.jeton = connexionStore.connexion.jeton
  }
  dernierMiroirReussi.value = await miroirStore.obtenirDernierMiroirReussi(props.clientId)
})

async function enregistrer(): Promise<void> {
  await connexionStore.enregistrer(props.clientId, { ...brouillon })
  resultatTest.value = undefined
}

async function effacer(): Promise<void> {
  await connexionStore.effacer(props.clientId)
  brouillon.dossierId = ''
  brouillon.jeton = ''
  resultatTest.value = undefined
}

async function testerConnexion(): Promise<void> {
  testEnCours.value = true
  try {
    resultatTest.value = await connexionStore.testerConnexion()
  } finally {
    testEnCours.value = false
  }
}

async function sauvegarderMaintenant(): Promise<void> {
  resultatMiroir.value = await miroirStore.miroirVersDrive(props.clientId)
  if (resultatMiroir.value.ok) {
    dernierMiroirReussi.value = await miroirStore.obtenirDernierMiroirReussi(props.clientId)
  }
}
</script>

<template>
  <main class="configuration-drive">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Miroir Drive — {{ nomClient ?? props.clientId }}</h1>

    <section class="bloc-drive">
      <h2>Dossier Google Drive dédié</h2>
      <p class="rappel">
        Utilisez un jeton d'accès dédié à ce seul dossier — jamais un jeton donnant accès à
        l'ensemble du compte Google Drive de l'utilisateur.
      </p>

      <form class="formulaire" @submit.prevent="enregistrer">
        <label>
          Identifiant du dossier Drive
          <input v-model="brouillon.dossierId" type="text" required placeholder="ex. 1a2B3c…" />
        </label>
        <label>
          Jeton d'accès
          <input v-model="brouillon.jeton" type="password" required autocomplete="off" />
        </label>
        <div class="actions">
          <button type="button" @click="effacer">Effacer</button>
          <button type="submit">Enregistrer</button>
        </div>
      </form>

      <div class="test-connexion">
        <button
          type="button"
          :disabled="!connexionStore.connexion || testEnCours"
          @click="testerConnexion"
        >
          {{ testEnCours ? 'Test en cours…' : 'Tester la connexion' }}
        </button>
        <p v-if="resultatTest?.ok === true" class="test-succes">
          Connexion réussie — dossier « {{ resultatTest.nomDossier }} ».
        </p>
        <p v-else-if="resultatTest?.ok === false" class="test-echec" role="alert">
          Échec de connexion : {{ resultatTest.message }}
        </p>
      </div>
    </section>

    <section class="bloc-miroir">
      <h2>Sauvegarde miroir</h2>
      <p class="avertissement" role="alert">
        Le miroir Drive n'est jamais une source de vérité et n'est jamais fusionné : chaque
        sauvegarde <strong>écrase</strong> le contenu du dossier Drive avec l'état actuel de GitHub.
        Toute modification faite manuellement dans ce dossier Drive sera perdue à la prochaine
        sauvegarde.
      </p>
      <button
        type="button"
        :disabled="!connexionStore.connexion || miroirStore.miroirEnCours"
        @click="sauvegarderMaintenant"
      >
        {{ miroirStore.miroirEnCours ? 'Sauvegarde en cours…' : 'Sauvegarder maintenant' }}
      </button>
      <p
        v-if="messageMiroir"
        :class="['message-miroir', `message-miroir--${messageMiroir.type}`]"
        :role="messageMiroir.type === 'succes' ? undefined : 'alert'"
      >
        {{ messageMiroir.texte }}
      </p>
      <p class="dernier-miroir">
        Dernier miroir réussi :
        {{ dernierMiroirReussi ? new Date(dernierMiroirReussi).toLocaleString() : 'jamais' }}
      </p>
    </section>
  </main>
</template>

<style scoped>
.configuration-drive {
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
  margin-top: 0.75rem;
}

.test-succes {
  color: var(--vp-statut-qualifie);
}

.test-echec {
  color: var(--vp-statut-requalification-en-retard);
}

.bloc-miroir {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.avertissement {
  color: var(--vp-statut-requalification-en-retard);
  margin: 0;
}

.message-miroir {
  margin: 0;
}

.message-miroir--succes {
  color: var(--vp-statut-qualifie);
}

.message-miroir--erreur {
  color: var(--vp-statut-requalification-en-retard);
}

.dernier-miroir {
  color: var(--vp-texte-secondaire);
  margin: 0;
}
</style>

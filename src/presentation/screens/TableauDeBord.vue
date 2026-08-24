<script setup lang="ts">
// Tableau de bord / Vue portefeuille (FDS §2) — version minimale de cet
// incrément : liste des projets + création (URS-F-070 à 073 pour la
// version complète avec statuts agrégés/alertes, backlog).
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Langue } from '../../logique-metier/domaine/types'
import { useProjectsStore, type NouveauProjetInput } from '../stores/useProjectsStore'
import {
  useSynchronisationStore,
  type ResultatRecuperation,
  type ResultatSynchronisation,
} from '../stores/useSynchronisationStore'

const projetsStore = useProjectsStore()
const syncStore = useSynchronisationStore()
const router = useRouter()
const formulaireOuvert = ref(false)
const dernierResultatSync = ref<ResultatSynchronisation | ResultatRecuperation | undefined>(
  undefined,
)

const messageSync = computed(() => {
  if (dernierResultatSync.value === undefined) return null
  if (dernierResultatSync.value.ok) {
    return {
      type: 'succes',
      texte: `${dernierResultatSync.value.nbFichiers} fichier(s) synchronisé(s).`,
    }
  }
  if ('conflit' in dernierResultatSync.value && dernierResultatSync.value.conflit) {
    return {
      type: 'conflit',
      texte:
        "Conflit détecté : la branche distante a changé depuis la dernière synchronisation. Vos modifications locales n'ont PAS été écrasées ni envoyées — utilisez « Récupérer depuis GitHub » pour voir l'état distant avant de réessayer.",
    }
  }
  return {
    type: 'erreur',
    texte: 'message' in dernierResultatSync.value ? dernierResultatSync.value.message : 'Erreur.',
  }
})

const brouillon = reactive<NouveauProjetInput>({
  name: '',
  context: '',
  scope_in: '',
  scope_out: '',
  deadline: null,
  language_default: 'fr' as Langue,
  client_id: null,
})

onMounted(() => {
  void projetsStore.chargerProjets()
})

async function creerProjet(): Promise<void> {
  if (brouillon.name.trim().length === 0) return
  const projet = await projetsStore.creerProjet({ ...brouillon })
  formulaireOuvert.value = false
  brouillon.name = ''
  brouillon.context = ''
  brouillon.scope_in = ''
  brouillon.scope_out = ''
  await router.push({ name: 'fiche-projet', params: { projectId: projet.id } })
}

async function synchroniser(): Promise<void> {
  dernierResultatSync.value = await syncStore.synchroniser()
}

async function recupererDepuisGitHub(): Promise<void> {
  dernierResultatSync.value = await syncStore.recupererDepuisGitHub()
  await projetsStore.chargerProjets()
}
</script>

<template>
  <main class="tableau-de-bord">
    <header>
      <h1>Tableau de bord</h1>
      <div class="actions-entete">
        <RouterLink :to="{ name: 'configuration-client' }">Configuration</RouterLink>
        <button type="button" @click="formulaireOuvert = true">Nouveau projet</button>
      </div>
    </header>

    <section class="synchronisation">
      <div class="actions-sync">
        <button type="button" :disabled="syncStore.synchronisationEnCours" @click="synchroniser">
          {{ syncStore.synchronisationEnCours ? 'Synchronisation…' : 'Synchroniser vers GitHub' }}
        </button>
        <button
          type="button"
          :disabled="syncStore.synchronisationEnCours"
          @click="recupererDepuisGitHub"
        >
          Récupérer depuis GitHub
        </button>
      </div>
      <p
        v-if="messageSync"
        :class="['message-sync', `message-sync--${messageSync.type}`]"
        :role="messageSync.type === 'succes' ? undefined : 'alert'"
      >
        {{ messageSync.texte }}
      </p>
    </section>

    <form v-if="formulaireOuvert" class="formulaire-projet" @submit.prevent="creerProjet">
      <label>
        Nom du projet
        <input v-model="brouillon.name" type="text" required autofocus />
      </label>
      <label>
        Contexte
        <textarea v-model="brouillon.context" />
      </label>
      <label>
        Portée — inclus
        <textarea v-model="brouillon.scope_in" />
      </label>
      <label>
        Portée — exclus
        <textarea v-model="brouillon.scope_out" />
      </label>
      <div class="actions">
        <button type="button" @click="formulaireOuvert = false">Annuler</button>
        <button type="submit">Créer le projet</button>
      </div>
    </form>

    <p v-if="!projetsStore.enChargement && projetsStore.projects.length === 0" class="etat-vide">
      Aucun projet pour l'instant — créez le premier avec le bouton ci-dessus.
    </p>

    <ul v-else class="liste-projets">
      <li v-for="projet in projetsStore.projects" :key="projet.id">
        <RouterLink :to="{ name: 'fiche-projet', params: { projectId: projet.id } }">
          {{ projet.name }}
        </RouterLink>
        <span class="meta">{{ projet.sections.length }} section(s)</span>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.tableau-de-bord {
  padding: 2rem;
  font-family: var(--vp-police);
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.actions-entete {
  display: flex;
  align-items: center;
  gap: 1rem;
}

button {
  background-color: var(--vp-marque);
  color: white;
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color var(--vp-transition);
}

button:hover {
  background-color: var(--vp-marque-survol);
}

.synchronisation {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.actions-sync {
  display: flex;
  gap: 0.5rem;
}

.message-sync {
  margin: 0;
}

.message-sync--succes {
  color: var(--vp-statut-qualifie);
}

.message-sync--conflit {
  color: var(--vp-statut-requalification-en-retard);
}

.message-sync--erreur {
  color: var(--vp-statut-requalification-en-retard);
}

.formulaire-projet {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  margin-bottom: 1.5rem;
  max-width: 32rem;
}

.formulaire-projet label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.liste-projets {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-projets li {
  display: flex;
  justify-content: space-between;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
}

.meta {
  color: var(--vp-texte-secondaire);
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

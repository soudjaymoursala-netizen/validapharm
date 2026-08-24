<script setup lang="ts">
// Tableau de bord / Vue portefeuille (FDS §2) — version minimale de cet
// incrément : liste des projets + création (URS-F-070 à 073 pour la
// version complète avec statuts agrégés/alertes, backlog).
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Langue } from '../../logique-metier/domaine/types'
import { useProjectsStore, type NouveauProjetInput } from '../stores/useProjectsStore'

const projetsStore = useProjectsStore()
const router = useRouter()
const formulaireOuvert = ref(false)

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

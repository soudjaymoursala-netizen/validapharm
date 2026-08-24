<script setup lang="ts">
// Fiche Projet (FDS §2) — contexte/portée, sections liées, ajout de
// section depuis le catalogue (URS-F-000 à 000nonies). Version minimale
// de cet incrément : la vue de traçabilité (graphe des liens) et le
// chargement de documents restent backlog (tâche #12).
import { computed, onMounted, ref } from 'vue'
import type { Project, TemplateType } from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useSectionsStore } from '../stores/useSectionsStore'

const props = defineProps<{ projectId: string }>()

const projetsStore = useProjectsStore()
const sectionsStore = useSectionsStore()
const projet = ref<Project | undefined>(undefined)
const formulaireOuvert = ref(false)
const nouveauTitre = ref('')
const nouveauTemplateType = ref<TemplateType>('contexte_procede')

// Catalogue restreint à ce qui est réellement exploitable par la machine à
// états et les garde-fous de cet incrément (URS §10, catalogue complet en
// backlog — tâche #12).
const CATALOGUE_DISPONIBLE: readonly TemplateType[] = [
  'contexte_procede',
  'urs',
  'dq',
  'fat',
  'sat',
  'iq',
  'oq',
  'pq',
  'validation_procede',
  'plan_metrologie',
  'plan_maintenance',
]

const sections = computed(() => sectionsStore.sectionsParProjet[props.projectId] ?? [])

onMounted(async () => {
  projet.value = await projetsStore.obtenirProjet(props.projectId)
  await sectionsStore.chargerSectionsDuProjet(props.projectId)
})

async function ajouterSection(): Promise<void> {
  if (nouveauTitre.value.trim().length === 0) return
  await sectionsStore.creerSection({
    project_id: props.projectId,
    template_type: nouveauTemplateType.value,
    language: projet.value?.language_default ?? 'fr',
    titre: nouveauTitre.value,
    owner_id: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
  })
  formulaireOuvert.value = false
  nouveauTitre.value = ''
}
</script>

<template>
  <main v-if="projet" class="fiche-projet">
    <RouterLink :to="{ name: 'tableau-de-bord' }"> &larr; Tableau de bord </RouterLink>
    <h1>{{ projet.name }}</h1>
    <section class="contexte">
      <p><strong>Contexte :</strong> {{ projet.context || '—' }}</p>
      <p><strong>Portée incluse :</strong> {{ projet.scope_in || '—' }}</p>
      <p><strong>Portée exclue :</strong> {{ projet.scope_out || '—' }}</p>
    </section>

    <section class="sections">
      <header>
        <h2>Sections</h2>
        <button type="button" @click="formulaireOuvert = true">Ajouter une section</button>
      </header>

      <form v-if="formulaireOuvert" class="formulaire-section" @submit.prevent="ajouterSection">
        <label>
          Titre
          <input v-model="nouveauTitre" type="text" required autofocus />
        </label>
        <label>
          Gabarit
          <select v-model="nouveauTemplateType">
            <option v-for="type in CATALOGUE_DISPONIBLE" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </label>
        <div class="actions">
          <button type="button" @click="formulaireOuvert = false">Annuler</button>
          <button type="submit">Créer la section</button>
        </div>
      </form>

      <p v-if="sections.length === 0" class="etat-vide">Aucune section pour l'instant.</p>
      <ul v-else class="liste-sections">
        <li v-for="section in sections" :key="section.id">
          <RouterLink
            :to="{
              name: 'editeur-section',
              params: { projectId: props.projectId, sectionId: section.id },
            }"
          >
            {{ section.meta.titre }}
          </RouterLink>
          <span class="meta">{{ section.template_type }} — {{ section.status }}</span>
        </li>
      </ul>
    </section>
  </main>
  <p v-else>Chargement…</p>
</template>

<style scoped>
.fiche-projet {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.contexte p {
  margin: 0.25rem 0;
}

.sections header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

button {
  background-color: var(--vp-marque);
  color: white;
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.formulaire-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  max-width: 24rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.liste-sections {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-sections li {
  display: flex;
  justify-content: space-between;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
}

.meta {
  color: var(--vp-texte-secondaire);
}
</style>

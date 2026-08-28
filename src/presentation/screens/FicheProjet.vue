<script setup lang="ts">
// Fiche Projet (FDS §2) — contexte/portée, sections liées, ajout de
// section depuis le catalogue (URS-F-000 à 000nonies). Version minimale
// de cet incrément : la vue de traçabilité (graphe des liens) et le
// chargement de documents restent backlog (tâche #12).
import { computed, onMounted, ref } from 'vue'
import { detecterEcartsStructurels } from '../../logique-metier/analyse-projet/detecterEcartsStructurels'
import type { Project, TemplateType } from '../../logique-metier/domaine/types'
import { analyserImportJSON } from '../../logique-metier/export/analyserImportJSON'
import { libelleStatut } from '../i18n/messages'
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
const erreurImport = ref<string | null>(null)

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

/**
 * Analyse structurelle du dossier (§4.8, Phase 34, URS-F-082/083) —
 * déterministe, jamais un appel IA. Recalculée à chaque changement de
 * sections/liens plutôt que mise en cache, le volume de sections d'un
 * projet restant modeste (cohérent avec le reste de l'écran).
 */
const ecartsStructurels = computed(() =>
  detecterEcartsStructurels(sections.value, projet.value?.links ?? []),
)

function titreSection(sectionId: string): string {
  return sections.value.find((s) => s.id === sectionId)?.meta.titre ?? sectionId
}

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

/**
 * Import JSON (FS §4.3, URS-F-021 : "réutilisable pour sauvegarde
 * manuelle ou transfert entre postes") — crée toujours une section
 * nouvelle dans ce projet, jamais un écrasement.
 */
async function importerFichier(evenement: Event): Promise<void> {
  erreurImport.value = null
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return

  const texte = await fichier.text()
  const resultat = analyserImportJSON(texte)
  ;(evenement.target as HTMLInputElement).value = ''

  if (!resultat.ok) {
    erreurImport.value = resultat.motif
    return
  }

  await sectionsStore.importerSection(
    props.projectId,
    resultat.donnees,
    IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
  )
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
        <div class="actions-entete">
          <label class="bouton-fichier">
            Importer une section (JSON)
            <input type="file" accept="application/json" @change="importerFichier" />
          </label>
          <button type="button" @click="formulaireOuvert = true">Ajouter une section</button>
        </div>
      </header>
      <p v-if="erreurImport" class="erreur-import" role="alert">{{ erreurImport }}</p>

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
          <span class="meta">
            {{ section.template_type }} — {{ libelleStatut(section.status, section.language) }}
          </span>
        </li>
      </ul>
    </section>

    <section v-if="ecartsStructurels.length > 0" class="analyse-structurelle">
      <h2>Analyse structurelle du dossier (§4.8)</h2>
      <p class="rappel">
        Constats déterministes, jamais un verdict de conformité — à vérifier par l'utilisateur
        (URS-F-083).
      </p>
      <ul class="liste-ecarts">
        <li v-for="ecart in ecartsStructurels" :key="ecart.sectionId">
          <RouterLink
            :to="{
              name: 'editeur-section',
              params: { projectId: props.projectId, sectionId: ecart.sectionId },
            }"
          >
            {{ titreSection(ecart.sectionId) }}
          </RouterLink>
          <p>{{ ecart.message }}</p>
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

.analyse-structurelle {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.analyse-structurelle .rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
  margin: 0;
}

.liste-ecarts {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-ecarts li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.9rem;
}

.liste-ecarts p {
  margin: 0.25rem 0 0;
  color: var(--vp-texte-secondaire);
}

.actions-entete {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bouton-fichier {
  position: relative;
  overflow: hidden;
  background-color: var(--vp-marque);
  color: white;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1em;
}

.bouton-fichier input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.erreur-import {
  color: var(--vp-statut-requalification-en-retard);
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

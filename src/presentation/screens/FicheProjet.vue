<script setup lang="ts">
// Fiche Projet (FDS §2) — contexte/portée, sections liées, ajout de
// section depuis le catalogue (URS-F-000 à 000nonies). Version minimale
// de cet incrément : la vue de traçabilité (graphe des liens) et le
// chargement de documents restent backlog (tâche #12).
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { detecterEcartsStructurels } from '../../logique-metier/analyse-projet/detecterEcartsStructurels'
import type { Project, TemplateType } from '../../logique-metier/domaine/types'
import { analyserImportJSON } from '../../logique-metier/export/analyserImportJSON'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import ModaleConfirmationArchivage from '../composants/ModaleConfirmationArchivage.vue'
import PastilleStatutSection from '../composants/PastilleStatutSection.vue'
import PipelineQualification from '../composants/PipelineQualification.vue'
import IconeSvg from '../composants/IconeSvg.vue'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useSectionsStore } from '../stores/useSectionsStore'

const props = defineProps<{ projectId: string }>()

const router = useRouter()
const projetsStore = useProjectsStore()
const sectionsStore = useSectionsStore()
const projet = ref<Project | undefined>(undefined)
const formulaireOuvert = ref(false)
const nouveauTitre = ref('')
const nouveauTemplateType = ref<TemplateType>('contexte_procede')
const erreurImport = ref<string | null>(null)
const modaleArchivageOuverte = ref(false)

async function confirmerArchivage(identiteDeclaree: string): Promise<void> {
  await projetsStore.archiverProjet(props.projectId, identiteDeclaree)
  modaleArchivageOuverte.value = false
  await router.push({ name: 'tableau-de-bord' })
}

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

/** Pré-remplit et ouvre le formulaire depuis un clic sur une étape non démarrée du pipeline. */
function demarrerEtape(templateType: TemplateType): void {
  nouveauTemplateType.value = templateType
  formulaireOuvert.value = true
}

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
    <RouterLink class="lien-retour" :to="{ name: 'tableau-de-bord' }">
      <IconeSvg nom="chevron-droit" :taille="14" class="lien-retour__icone" />
      Tableau de bord
    </RouterLink>
    <header class="entete-projet">
      <div>
        <h1>{{ projet.name }}</h1>
        <p v-if="projet.deadline" class="entete-projet__echeance">
          <IconeSvg nom="horloge" :taille="14" />
          Échéance : {{ projet.deadline }}
        </p>
      </div>
      <button type="button" class="bouton-archiver" @click="modaleArchivageOuverte = true">
        <IconeSvg nom="archive" :taille="15" />
        Archiver ce projet
      </button>
    </header>

    <section class="carte contexte">
      <h2 class="carte__titre-discret">Contexte</h2>
      <dl>
        <dt>Contexte</dt>
        <dd>{{ projet.context || '—' }}</dd>
        <dt>Portée incluse</dt>
        <dd>{{ projet.scope_in || '—' }}</dd>
        <dt>Portée exclue</dt>
        <dd>{{ projet.scope_out || '—' }}</dd>
      </dl>
    </section>

    <section class="carte pipeline">
      <h2 class="carte__titre-discret">Progression du dossier de qualification</h2>
      <PipelineQualification
        :sections="sections"
        :langue="projet.language_default"
        :project-id="props.projectId"
        @demarrer-etape="demarrerEtape"
      />
    </section>

    <section class="carte sections">
      <header>
        <h2>Sections</h2>
        <div class="actions-entete">
          <label class="bouton-fichier">
            <IconeSvg nom="dossier" :taille="15" />
            Importer une section (JSON)
            <input type="file" accept="application/json" @change="importerFichier" />
          </label>
          <button type="button" class="bouton-principal" @click="formulaireOuvert = true">
            <IconeSvg nom="plus" :taille="15" />
            Ajouter une section
          </button>
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
          <button type="button" class="bouton-secondaire" @click="formulaireOuvert = false">
            Annuler
          </button>
          <button type="submit" class="bouton-principal">Créer la section</button>
        </div>
      </form>

      <p v-if="sections.length === 0" class="etat-vide">Aucune section pour l'instant.</p>
      <ul v-else class="liste-sections">
        <li v-for="section in sections" :key="section.id">
          <RouterLink
            class="liste-sections__lien"
            :to="{
              name: 'editeur-section',
              params: { projectId: props.projectId, sectionId: section.id },
            }"
          >
            <span class="liste-sections__titre">{{ section.meta.titre }}</span>
            <span class="liste-sections__gabarit">{{ section.template_type }}</span>
          </RouterLink>
          <PastilleStatutSection :statut="section.status" :langue="section.language" />
        </li>
      </ul>
    </section>

    <section v-if="ecartsStructurels.length > 0" class="carte analyse-structurelle">
      <h2 class="carte__titre-discret">Analyse structurelle du dossier (§4.8)</h2>
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

    <ModaleConfirmationArchivage
      v-if="modaleArchivageOuverte"
      :nom="projet.name"
      @confirme="confirmerArchivage"
      @annule="modaleArchivageOuverte = false"
    />
  </main>
  <p v-else>Chargement…</p>
</template>

<style scoped>
.fiche-projet {
  padding: 2.5rem;
  max-width: 60rem;
  margin: 0 auto;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.lien-retour {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: var(--vp-texte-secondaire);
  text-decoration: none;
  font-size: 0.85rem;
  width: fit-content;
}

.lien-retour:hover {
  color: var(--vp-marque);
}

.lien-retour__icone {
  transform: rotate(180deg);
}

.entete-projet {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.entete-projet h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: var(--vp-poids-bold);
}

.entete-projet__echeance {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.4rem 0 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.85rem;
}

.carte {
  background-color: var(--vp-fond-page);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  box-shadow: var(--vp-ombre-sm);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.carte__titre-discret {
  margin: 0;
  font-size: 0.78rem;
  font-weight: var(--vp-poids-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-texte-secondaire);
}

.contexte dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.4rem 1.5rem;
  margin: 0;
}

.contexte dt {
  color: var(--vp-texte-secondaire);
  font-size: 0.85rem;
}

.contexte dd {
  margin: 0;
}

.sections header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.sections h2 {
  margin: 0;
  font-size: 1.1rem;
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
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  position: relative;
  overflow: hidden;
  background-color: var(--vp-fond-carte);
  color: var(--vp-texte-principal);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: var(--vp-poids-medium);
  transition: var(--vp-transition);
}

.bouton-fichier:hover {
  border-color: var(--vp-marque);
  color: var(--vp-marque);
}

.bouton-fichier input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.erreur-import {
  color: var(--vp-danger);
}

button {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.bouton-principal {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background-color: var(--vp-marque);
  color: white;
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  font-weight: var(--vp-poids-medium);
  transition: var(--vp-transition);
}

.bouton-principal:hover {
  background-color: var(--vp-marque-survol);
}

.bouton-secondaire {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  color: var(--vp-texte-secondaire);
}

.bouton-archiver {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background-color: var(--vp-danger-fond-leger);
  color: var(--vp-danger);
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
  font-weight: var(--vp-poids-medium);
  flex-shrink: 0;
  transition: var(--vp-transition);
}

.bouton-archiver:hover {
  background-color: var(--vp-danger);
  color: white;
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

.formulaire-section label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.formulaire-section input,
.formulaire-section select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem;
  font-family: inherit;
  color: var(--vp-texte-principal);
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
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
  transition: var(--vp-transition);
}

.liste-sections li:hover {
  border-color: var(--vp-marque);
  box-shadow: var(--vp-ombre-sm);
}

.liste-sections__lien {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.liste-sections__titre {
  font-weight: var(--vp-poids-medium);
  color: var(--vp-texte-principal);
}

.liste-sections__gabarit {
  font-size: 0.78rem;
  color: var(--vp-texte-secondaire);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
  font-size: 0.9rem;
}
</style>

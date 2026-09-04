<script setup lang="ts">
// Fiche Projet (FDS §2) — contexte/portée, sections liées, ajout de
// section depuis le catalogue (URS-F-000 à 000nonies). Version minimale
// de cet incrément : la vue de traçabilité (graphe des liens) reste
// backlog (tâche #12). Section "Documents" (URS-F-000quater, §4.9)
// ajoutée v20 — comblait un écart Must documenté (le seul chargement de
// fichier existant était le besoin ponctuel §4.1bis de génération de
// brouillon, pas un écran générique de bibliothèque de documents).
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { detecterEcartsStructurels } from '../../logique-metier/analyse-projet/detecterEcartsStructurels'
import type { Project, TemplateType } from '../../logique-metier/domaine/types'
import { analyserImportJSON } from '../../logique-metier/export/analyserImportJSON'
import { peutModifierProjet } from '../../logique-metier/permissions/permissionsProjet'
import ModaleConfirmationArchivage from '../composants/ModaleConfirmationArchivage.vue'
import PastilleStatutSection from '../composants/PastilleStatutSection.vue'
import PipelineQualification from '../composants/PipelineQualification.vue'
import IconeSvg from '../composants/IconeSvg.vue'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useSectionsStore } from '../stores/useSectionsStore'
import { useProjectDocumentsStore } from '../stores/useProjectDocumentsStore'

const props = defineProps<{ projectId: string }>()

const router = useRouter()
const projetsStore = useProjectsStore()
const sectionsStore = useSectionsStore()
const documentsStore = useProjectDocumentsStore()
const projet = ref<Project | undefined>(undefined)
const formulaireOuvert = ref(false)
const nouveauTitre = ref('')
const nouveauTemplateType = ref<TemplateType>('contexte_procede')
const erreurImport = ref<string | null>(null)
const modaleArchivageOuverte = ref(false)
const erreurImportDocument = ref<string | null>(null)
const nouvelUtilisateurPartage = ref('')
const nouveauNiveauPartage = ref<'lecture' | 'édition'>('lecture')

/**
 * Garde d'affichage du partage de projet (Phase 37, TD-044) — convention
 * UX, jamais une frontière de sécurité réelle (voir `permissionsProjet.ts`).
 * `true` tant que le projet n'est pas encore chargé, pour ne jamais
 * masquer les contrôles pendant le chargement initial.
 */
const peutModifier = computed(() =>
  projet.value ? peutModifierProjet(projet.value, projetsStore.identiteCourante) : true,
)

async function ajouterPartage(): Promise<void> {
  const userId = nouvelUtilisateurPartage.value.trim()
  if (userId.length === 0) return
  const resultat = await projetsStore.partagerProjet(
    props.projectId,
    userId,
    nouveauNiveauPartage.value,
  )
  if (!('erreur' in resultat)) projet.value = resultat
  nouvelUtilisateurPartage.value = ''
}

async function retirerPartage(userId: string): Promise<void> {
  const resultat = await projetsStore.retirerPartage(props.projectId, userId)
  if (!('erreur' in resultat)) projet.value = resultat
}

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
  await projetsStore.resoudreIdentiteCourante()
  await sectionsStore.chargerSectionsDuProjet(props.projectId)
  await documentsStore.charger(props.projectId)
})

/**
 * Import d'un document de référence sous n'importe quel format (URS-F-000quater,
 * §4.9) — aucune restriction de type ni de taille fabriquée ici : le seul
 * garde-fou exigé est l'étiquetage automatique "référence de travail, non
 * maître" (porté par le store, jamais contournable depuis cet écran).
 */
async function importerDocument(evenement: Event): Promise<void> {
  erreurImportDocument.value = null
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return
  ;(evenement.target as HTMLInputElement).value = ''

  try {
    await documentsStore.importerDocument(props.projectId, fichier, projetsStore.identiteCourante)
  } catch {
    erreurImportDocument.value = 'Échec du chargement du document — réessayez.'
  }
}

/** Retélécharge le fichier tel que chargé — jamais une reconstruction à partir du texte extrait. */
function telechargerDocument(document: { filename: string; content: Blob | null }): void {
  if (!document.content) return
  const url = URL.createObjectURL(document.content)
  const lien = window.document.createElement('a')
  lien.href = url
  lien.download = document.filename
  lien.click()
  URL.revokeObjectURL(url)
}

/** Pré-remplit et ouvre le formulaire depuis un clic sur une étape non démarrée du pipeline. */
function demarrerEtape(templateType: TemplateType): void {
  nouveauTemplateType.value = templateType
  formulaireOuvert.value = true
}

/**
 * `depuisDocument` : après création, navigue directement vers l'éditeur
 * en pointant sur le panneau "Génération de brouillon par adaptation"
 * (§4.1bis) déjà construit — jamais un nouveau moteur de génération,
 * seulement un raccourci de découverte vers une capacité existante.
 */
async function ajouterSection(depuisDocument = false): Promise<void> {
  if (nouveauTitre.value.trim().length === 0) return
  const section = await sectionsStore.creerSection({
    project_id: props.projectId,
    template_type: nouveauTemplateType.value,
    language: projet.value?.language_default ?? 'fr',
    titre: nouveauTitre.value,
    owner_id: projetsStore.identiteCourante,
  })
  formulaireOuvert.value = false
  nouveauTitre.value = ''
  if (depuisDocument) {
    await router.push({
      name: 'editeur-section',
      params: { projectId: props.projectId, sectionId: section.id },
      query: { demarrage: 'adaptation' },
    })
  }
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
    projetsStore.identiteCourante,
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
      <button
        v-if="peutModifier"
        type="button"
        class="bouton-archiver"
        @click="modaleArchivageOuverte = true"
      >
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

    <section class="carte partage">
      <h2 class="carte__titre-discret">Partage (Phase 37)</h2>
      <p class="rappel">
        Lecture toujours ouverte à tous. Seuls le créateur et les personnes partagées en édition
        peuvent modifier ce projet — une convention d'affichage, pas une frontière de sécurité
        réelle (l'accès au dépôt Git reste au niveau du client).
      </p>
      <p class="meta-proprietaire">Créé par : {{ projet.owner_id }}</p>
      <ul v-if="projet.shared_with.length > 0" class="liste-partages">
        <li v-for="partage in projet.shared_with" :key="partage.user_id">
          {{ partage.user_id }} — {{ partage.access_level }}
          <button
            v-if="peutModifier"
            type="button"
            class="bouton-texte-danger"
            @click="retirerPartage(partage.user_id)"
          >
            Retirer
          </button>
        </li>
      </ul>
      <p v-else class="etat-vide">Pas encore partagé avec personne d'autre.</p>
      <form v-if="peutModifier" class="formulaire-partage" @submit.prevent="ajouterPartage">
        <input
          v-model="nouvelUtilisateurPartage"
          type="email"
          placeholder="email@exemple.com"
          required
        />
        <select v-model="nouveauNiveauPartage">
          <option value="lecture">lecture</option>
          <option value="édition">édition</option>
        </select>
        <button type="submit" class="bouton-secondaire">Partager</button>
      </form>
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
        <div v-if="peutModifier" class="actions-entete">
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
        <p v-else class="meta-lecture-seule">
          Lecture seule — vous n'êtes ni créateur ni partagé en édition.
        </p>
      </header>
      <p v-if="erreurImport" class="erreur-import" role="alert">{{ erreurImport }}</p>

      <form
        v-if="formulaireOuvert && peutModifier"
        class="formulaire-section"
        @submit.prevent="ajouterSection(false)"
      >
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
        <p class="rappel-choix">
          « Vierge » démarre d'un modèle vide. « À partir d'un document » vous amène directement au
          panneau qui adapte un protocole/exemple existant au contexte de ce projet (§4.1bis).
        </p>
        <div class="actions">
          <button type="button" class="bouton-secondaire" @click="formulaireOuvert = false">
            Annuler
          </button>
          <button type="button" class="bouton-secondaire" @click="ajouterSection(true)">
            À partir d'un document
          </button>
          <button type="submit" class="bouton-principal">Créer la section vierge</button>
        </div>
      </form>

      <div v-if="sections.length === 0 && peutModifier" class="guide-demarrage">
        <p class="guide-demarrage__titre">Comment voulez-vous démarrer ce dossier ?</p>
        <div class="guide-demarrage__options">
          <button type="button" class="guide-demarrage__option" @click="formulaireOuvert = true">
            <IconeSvg nom="plus" :taille="18" />
            <span>
              <strong>Construire manuellement</strong>
              <small>Choisir un gabarit et rédiger la section depuis un modèle vierge.</small>
            </span>
          </button>
          <label class="guide-demarrage__option">
            <IconeSvg nom="dossier" :taille="18" />
            <span>
              <strong>Importer une section (JSON)</strong>
              <small>Reprendre un export existant — répétez l'opération pour chaque section.</small>
            </span>
            <input type="file" accept="application/json" @change="importerFichier" />
          </label>
        </div>
      </div>
      <p v-else-if="sections.length === 0" class="etat-vide">Aucune section pour l'instant.</p>
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

    <section class="carte documents">
      <header>
        <div>
          <h2>Documents</h2>
          <p class="rappel">
            Fichiers de référence (documentation fournisseur, manuels, SOP…) sous n'importe quel
            format — toujours des références de travail, jamais des documents maîtres du QMS
            (URS-F-000quater).
          </p>
        </div>
        <label v-if="peutModifier" class="bouton-fichier">
          <IconeSvg nom="dossier" :taille="15" />
          Importer un document
          <input type="file" @change="importerDocument" />
        </label>
      </header>
      <p v-if="erreurImportDocument" class="erreur-import" role="alert">
        {{ erreurImportDocument }}
      </p>
      <p v-if="documentsStore.documents.length === 0" class="etat-vide">
        Aucun document chargé pour l'instant.
      </p>
      <ul v-else class="liste-documents">
        <li v-for="document in documentsStore.documents" :key="document.id">
          <span class="liste-documents__icone" aria-hidden="true">
            <IconeSvg nom="dossier" :taille="16" />
          </span>
          <span class="liste-documents__texte">
            <span class="liste-documents__nom">{{ document.filename }}</span>
            <span class="liste-documents__meta">
              Référence de travail — non maître · chargé le
              {{ document.uploaded_at.slice(0, 10) }} par {{ document.uploaded_by }}
            </span>
          </span>
          <div class="liste-documents__actions">
            <button
              type="button"
              class="bouton-secondaire"
              :disabled="!document.content"
              @click="telechargerDocument(document)"
            >
              Télécharger
            </button>
            <button
              type="button"
              class="bouton-texte-danger"
              @click="documentsStore.supprimerDocument(document.id)"
            >
              Supprimer
            </button>
          </div>
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
  background-color: var(--vp-fond-carte);
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
  color: var(--vp-marque-bouton-texte);
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

.rappel-choix {
  margin: -0.25rem 0 0;
  font-size: 0.78rem;
  color: var(--vp-texte-secondaire);
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

.meta-proprietaire,
.meta-lecture-seule {
  color: var(--vp-texte-secondaire);
  font-size: 0.85rem;
}

.liste-partages {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.liste-partages li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0;
}

.formulaire-partage {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.formulaire-partage input {
  flex: 1;
}

.guide-demarrage__titre {
  margin: 0 0 0.75rem;
  font-weight: var(--vp-poids-medium);
  color: var(--vp-texte-principal);
}

.guide-demarrage__options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.guide-demarrage__option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.9rem 1rem;
  border: 1px dashed var(--vp-bordure-forte);
  border-radius: var(--vp-rayon);
  background-color: var(--vp-fond-carte);
  color: var(--vp-texte-principal);
  text-align: left;
  cursor: pointer;
  transition: var(--vp-transition);
}

.guide-demarrage__option:hover {
  border-color: var(--vp-marque);
  border-style: solid;
  background-color: var(--vp-marque-fond-leger);
}

.guide-demarrage__option strong {
  display: block;
  font-size: 0.9rem;
}

.guide-demarrage__option small {
  display: block;
  margin-top: 0.15rem;
  color: var(--vp-texte-secondaire);
  font-size: 0.78rem;
  line-height: 1.4;
}

.guide-demarrage__option input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.documents header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.documents h2 {
  margin: 0;
  font-size: 1.1rem;
}

.documents .rappel {
  margin: 0.35rem 0 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.82rem;
  max-width: 32rem;
}

.liste-documents {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-documents li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.65rem 0.9rem;
}

.liste-documents__icone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  flex-shrink: 0;
  border-radius: var(--vp-rayon-sm);
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

.liste-documents__texte {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.liste-documents__nom {
  font-weight: var(--vp-poids-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.liste-documents__meta {
  font-size: 0.76rem;
  color: var(--vp-texte-secondaire);
}

.liste-documents__actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.bouton-texte-danger {
  background: none;
  border: none;
  color: var(--vp-danger);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.5rem 0.6rem;
}

.bouton-texte-danger:hover {
  text-decoration: underline;
}
</style>

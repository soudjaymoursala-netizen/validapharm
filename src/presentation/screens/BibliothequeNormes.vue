<script setup lang="ts">
// Bibliothèque de normes — documents réellement importés
// (téléversement direct, GitHub, Google Drive) : globale à l'installation,
// consultable par l'assistant contextuel de section
// (`construireObjectifAssistantSection`). L'ancienne liste de noms de
// normes agrégée depuis le catalogue de gabarits (sans contenu réel,
// jamais consultable) a été retirée à la demande de l'utilisateur.
import { computed, onMounted, reactive, ref } from 'vue'
import type { EntreeArborescence } from '../../connecteurs/github/GitHubConnector'
import type { FichierDrive } from '../../connecteurs/drive/DriveReaderConnector'
import type { CategorieDocumentNormatif } from '../../logique-metier/domaine/types'
import { useAuthStore } from '../stores/useAuthStore'
import {
  useNormativeDocumentsStore,
  type ResultatConnexionDriveNormes,
} from '../stores/useNormativeDocumentsStore'

const authStore = useAuthStore()
const documentsStore = useNormativeDocumentsStore()

const LIBELLES_CATEGORIE: Record<CategorieDocumentNormatif, string> = {
  iso: 'ISO',
  eudralex: 'EudraLex',
  pics: 'PIC/S',
  astm: 'ASTM',
  ispe: 'ISPE',
  gmp: 'GMP',
  cqv: 'CQV',
  csv: 'CSV',
  autre: 'Autre',
}

const filtreCategorie = ref<CategorieDocumentNormatif | 'toutes'>('toutes')
const documentsFiltres = computed(() =>
  filtreCategorie.value === 'toutes'
    ? documentsStore.documents
    : documentsStore.documents.filter((d) => d.category === filtreCategorie.value),
)

function actorCourant(): string {
  return authStore.utilisateur?.email ?? 'utilisateur-local-phase1'
}

// --- Téléversement direct ---
const categorieTeleversement = ref<CategorieDocumentNormatif>('autre')
const enImportTeleversement = ref(false)
const progressionTeleversement = ref<{ fait: number; total: number } | null>(null)
const erreurTeleversement = ref<string | null>(null)

/**
 * Accepte plusieurs fichiers à la fois (`multiple` sur l'input) — une
 * bibliothèque réelle se peuple par dizaines de documents, jamais un à
 * la fois. Chaque fichier est importé séquentiellement (jamais en
 * parallèle : `documents.value` est mutée par chaque import, un import
 * parallèle risquerait une écriture perdue) sous la même catégorie
 * choisie une fois pour tout le lot ; un fichier en échec n'interrompt
 * pas les suivants — les erreurs sont accumulées puis affichées ensemble.
 */
async function importerFichier(evenement: Event): Promise<void> {
  const fichiers = Array.from((evenement.target as HTMLInputElement).files ?? [])
  if (fichiers.length === 0) return
  erreurTeleversement.value = null
  enImportTeleversement.value = true
  progressionTeleversement.value = { fait: 0, total: fichiers.length }
  const erreurs: string[] = []
  try {
    for (const fichier of fichiers) {
      try {
        await documentsStore.importerDepuisFichier(
          fichier,
          categorieTeleversement.value,
          actorCourant(),
        )
      } catch (e) {
        erreurs.push(`${fichier.name} : ${e instanceof Error ? e.message : 'erreur inconnue'}`)
      } finally {
        progressionTeleversement.value = {
          fait: (progressionTeleversement.value?.fait ?? 0) + 1,
          total: fichiers.length,
        }
      }
    }
    if (erreurs.length > 0) erreurTeleversement.value = erreurs.join(' · ')
  } finally {
    enImportTeleversement.value = false
    progressionTeleversement.value = null
    ;(evenement.target as HTMLInputElement).value = ''
  }
}

// --- GitHub ---
const categorieGitHub = ref<CategorieDocumentNormatif>('autre')
const prefixeGitHub = ref('')
const fichiersGitHub = ref<EntreeArborescence[]>([])
const enListeGitHub = ref(false)
const erreurGitHub = ref<string | null>(null)

async function listerGitHub(): Promise<void> {
  erreurGitHub.value = null
  enListeGitHub.value = true
  try {
    fichiersGitHub.value = await documentsStore.listerFichiersGitHub(prefixeGitHub.value)
  } catch (e) {
    erreurGitHub.value = e instanceof Error ? e.message : 'Erreur inconnue.'
    fichiersGitHub.value = []
  } finally {
    enListeGitHub.value = false
  }
}

async function importerDepuisGitHub(chemin: string): Promise<void> {
  erreurGitHub.value = null
  try {
    await documentsStore.importerDepuisGitHub(chemin, categorieGitHub.value, actorCourant())
  } catch (e) {
    erreurGitHub.value = e instanceof Error ? e.message : 'Erreur inconnue.'
  }
}

// --- Google Drive ---
const brouillonDrive = reactive({ dossierId: '', jeton: '' })
const categorieDrive = ref<CategorieDocumentNormatif>('autre')
const resultatTestDrive = ref<ResultatConnexionDriveNormes | undefined>(undefined)
const testDriveEnCours = ref(false)
const fichiersDrive = ref<FichierDrive[]>([])
const enListeDrive = ref(false)
const erreurDrive = ref<string | null>(null)
const enImportDriveTout = ref(false)
const progressionDriveTout = ref<{ fait: number; total: number } | null>(null)

async function enregistrerConnexionDrive(): Promise<void> {
  erreurDrive.value = null
  const resultat = await documentsStore.configurerConnexionDriveLectureNormes(
    brouillonDrive.dossierId,
    brouillonDrive.jeton,
  )
  if (!resultat.ok) {
    erreurDrive.value =
      resultat.erreur === 'non_autorise'
        ? 'Réservé à un administrateur (paramètre global à toute l’installation).'
        : `Échec de l'enregistrement : ${resultat.erreur}`
    return
  }
  resultatTestDrive.value = undefined
}

async function testerConnexionDrive(): Promise<void> {
  testDriveEnCours.value = true
  try {
    resultatTestDrive.value = await documentsStore.testerConnexionDriveLectureNormes()
  } finally {
    testDriveEnCours.value = false
  }
}

async function listerDrive(): Promise<void> {
  erreurDrive.value = null
  enListeDrive.value = true
  try {
    fichiersDrive.value = await documentsStore.listerFichiersDrive()
  } catch (e) {
    erreurDrive.value = e instanceof Error ? e.message : 'Erreur inconnue.'
    fichiersDrive.value = []
  } finally {
    enListeDrive.value = false
  }
}

async function importerDepuisDrive(fichier: FichierDrive): Promise<void> {
  erreurDrive.value = null
  try {
    await documentsStore.importerDepuisDrive(fichier, categorieDrive.value, actorCourant())
  } catch (e) {
    erreurDrive.value = e instanceof Error ? e.message : 'Erreur inconnue.'
  }
}

/**
 * Importe en un seul geste tous les fichiers listés du dossier Drive
 * courant, sous la catégorie choisie — un dossier Drive réel se peuple par
 * dizaines/centaines de documents (ex. un dossier "ASTM" complet), jamais
 * un import fichier par fichier dans ce cas. Séquentiel (jamais en
 * parallèle, même raison que `importerFichier`) ; un fichier en échec
 * n'interrompt pas les suivants — les erreurs sont accumulées puis
 * affichées ensemble.
 */
async function importerToutDrive(): Promise<void> {
  if (fichiersDrive.value.length === 0) return
  erreurDrive.value = null
  enImportDriveTout.value = true
  progressionDriveTout.value = { fait: 0, total: fichiersDrive.value.length }
  const erreurs: string[] = []
  try {
    for (const fichier of fichiersDrive.value) {
      try {
        await documentsStore.importerDepuisDrive(fichier, categorieDrive.value, actorCourant())
      } catch (e) {
        erreurs.push(`${fichier.nom} : ${e instanceof Error ? e.message : 'erreur inconnue'}`)
      } finally {
        progressionDriveTout.value = {
          fait: (progressionDriveTout.value?.fait ?? 0) + 1,
          total: fichiersDrive.value.length,
        }
      }
    }
    if (erreurs.length > 0) erreurDrive.value = erreurs.join(' · ')
  } finally {
    enImportDriveTout.value = false
    progressionDriveTout.value = null
  }
}

const erreurTelechargement = ref<string | null>(null)

/**
 * Retélécharge le fichier tel qu'importé (récupéré à la demande depuis le
 * Worker — jamais préchargé avec la liste, voir `has_binary_content`),
 * jamais une reconstruction à partir du texte extrait (même patron que
 * `FicheProjet.vue`).
 */
async function telechargerDocument(document: {
  id: string
  filename: string
  has_binary_content: boolean
}): Promise<void> {
  if (!document.has_binary_content) return
  erreurTelechargement.value = null
  try {
    const contenu = await documentsStore.telechargerContenu(document.id)
    const url = URL.createObjectURL(contenu)
    const lien = window.document.createElement('a')
    lien.href = url
    lien.download = document.filename
    lien.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    erreurTelechargement.value = e instanceof Error ? e.message : 'Erreur inconnue.'
  }
}

/**
 * Ouvre le texte extrait dans un nouvel onglet — seul recours pour un
 * document importé depuis GitHub/Drive sans octets bruts conservés
 * (`content: null`, seul `extracted_text` existe). Jamais utilisé si le
 * fichier d'origine est disponible (`telechargerDocument` le préfère).
 */
function voirTexteExtrait(document: { titre: string; extracted_text: string }): void {
  const blob = new Blob([document.extracted_text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

onMounted(async () => {
  await documentsStore.charger()
})
</script>

<template>
  <main class="bibliotheque-normes">
    <RouterLink :to="{ name: 'tableau-de-bord' }" class="lien-retour">Tableau de bord</RouterLink>
    <h1>Bibliothèque de normes</h1>

    <h2>Documents normatifs importés</h2>
    <p class="rappel">
      Normes/guidelines/méthodes propres à votre organisation, importées ici et consultables par
      l'assistant contextuel de section.
    </p>

    <section class="bloc-import">
      <h3>Ajouter des documents</h3>
      <div class="formulaire-import">
        <label>
          Catégorie
          <select v-model="categorieTeleversement">
            <option v-for="(libelle, valeur) in LIBELLES_CATEGORIE" :key="valeur" :value="valeur">
              {{ libelle }}
            </option>
          </select>
        </label>
        <label>
          Fichier(s) (.docx, .pdf, .txt, .md — plusieurs à la fois)
          <input type="file" multiple :disabled="enImportTeleversement" @change="importerFichier" />
        </label>
      </div>
      <p v-if="progressionTeleversement" class="rappel">
        Import {{ progressionTeleversement.fait }} / {{ progressionTeleversement.total }}…
      </p>
      <p v-if="erreurTeleversement" class="erreur" role="alert">{{ erreurTeleversement }}</p>
    </section>

    <section class="bloc-import">
      <h3>Depuis le dépôt GitHub dédié</h3>
      <p class="rappel">
        Utilise la connexion GitHub déjà configurée (Configuration client) — seuls les fichiers
        <code>.md</code>/<code>.txt</code> sont importables ici, un fichier binaire lu par cette
        voie serait corrompu.
      </p>
      <div class="formulaire-import">
        <label>
          Catégorie
          <select v-model="categorieGitHub">
            <option v-for="(libelle, valeur) in LIBELLES_CATEGORIE" :key="valeur" :value="valeur">
              {{ libelle }}
            </option>
          </select>
        </label>
        <label>
          Préfixe de chemin
          <input v-model="prefixeGitHub" type="text" placeholder="ex. normes/" />
        </label>
        <button type="button" :disabled="enListeGitHub" @click="listerGitHub">
          {{ enListeGitHub ? 'Chargement…' : 'Lister' }}
        </button>
      </div>
      <p v-if="erreurGitHub" class="erreur" role="alert">{{ erreurGitHub }}</p>
      <details v-if="fichiersGitHub.length > 0" class="liste-repliable">
        <summary>{{ fichiersGitHub.length }} fichier(s) trouvé(s) — cliquer pour afficher</summary>
        <ul class="liste-fichiers-externes">
          <li v-for="entree in fichiersGitHub" :key="entree.sha">
            <span>{{ entree.chemin }}</span>
            <button type="button" @click="importerDepuisGitHub(entree.chemin)">Importer</button>
          </li>
        </ul>
      </details>
    </section>

    <section class="bloc-import">
      <h3>Depuis Google Drive</h3>
      <p class="rappel">
        Configuration dédiée à la bibliothèque de normes — distincte du miroir Drive par client.
      </p>
      <form class="formulaire-import" @submit.prevent="enregistrerConnexionDrive">
        <label>
          Identifiant du dossier Drive
          <input v-model="brouillonDrive.dossierId" type="text" required />
        </label>
        <label>
          Jeton d'accès
          <input v-model="brouillonDrive.jeton" type="password" required autocomplete="off" />
        </label>
        <div class="actions">
          <button type="submit">Enregistrer</button>
          <button type="button" :disabled="testDriveEnCours" @click="testerConnexionDrive">
            {{ testDriveEnCours ? 'Test en cours…' : 'Tester la connexion' }}
          </button>
        </div>
      </form>
      <p v-if="resultatTestDrive?.ok === true" class="test-succes">
        Connexion réussie — {{ resultatTestDrive.nbFichiers }} fichier(s) trouvé(s).
      </p>
      <p v-else-if="resultatTestDrive?.ok === false" class="test-echec" role="alert">
        Échec de connexion : {{ resultatTestDrive.message }}
      </p>

      <div class="formulaire-import">
        <label>
          Catégorie
          <select v-model="categorieDrive">
            <option v-for="(libelle, valeur) in LIBELLES_CATEGORIE" :key="valeur" :value="valeur">
              {{ libelle }}
            </option>
          </select>
        </label>
        <button type="button" :disabled="enListeDrive" @click="listerDrive">
          {{ enListeDrive ? 'Chargement…' : 'Lister les fichiers' }}
        </button>
      </div>
      <p v-if="erreurDrive" class="erreur" role="alert">{{ erreurDrive }}</p>
      <div v-if="fichiersDrive.length > 0" class="actions">
        <button type="button" :disabled="enImportDriveTout" @click="importerToutDrive">
          {{ enImportDriveTout ? 'Import en cours…' : `Tout importer (${fichiersDrive.length})` }}
        </button>
      </div>
      <p v-if="progressionDriveTout" class="rappel">
        Import {{ progressionDriveTout.fait }} / {{ progressionDriveTout.total }}…
      </p>
      <details v-if="fichiersDrive.length > 0" class="liste-repliable">
        <summary>{{ fichiersDrive.length }} fichier(s) trouvé(s) — cliquer pour afficher</summary>
        <ul class="liste-fichiers-externes">
          <li v-for="fichier in fichiersDrive" :key="fichier.id">
            <span>{{ fichier.nom }}</span>
            <button
              type="button"
              :disabled="enImportDriveTout"
              @click="importerDepuisDrive(fichier)"
            >
              Importer
            </button>
          </li>
        </ul>
      </details>
    </section>

    <section class="bloc-documents">
      <h3>Documents importés</h3>
      <label class="champ-filtre">
        Filtrer par catégorie
        <select v-model="filtreCategorie">
          <option value="toutes">Toutes</option>
          <option v-for="(libelle, valeur) in LIBELLES_CATEGORIE" :key="valeur" :value="valeur">
            {{ libelle }}
          </option>
        </select>
      </label>
      <p v-if="documentsFiltres.length === 0" class="etat-vide">Aucun document importé.</p>
      <details v-else class="liste-repliable">
        <summary>{{ documentsFiltres.length }} document(s) — cliquer pour afficher</summary>
        <ul class="liste-documents">
          <li v-for="document in documentsFiltres" :key="document.id">
            <div>
              <strong>{{ document.titre }}</strong>
              <span class="meta">
                — {{ LIBELLES_CATEGORIE[document.category] }} · source : {{ document.source }}
              </span>
            </div>
            <div class="actions-document">
              <button type="button" @click="voirTexteExtrait(document)">Consulter</button>
              <button
                v-if="document.has_binary_content"
                type="button"
                @click="telechargerDocument(document)"
              >
                Télécharger
              </button>
              <button type="button" @click="documentsStore.supprimerDocument(document.id)">
                Supprimer
              </button>
            </div>
          </li>
        </ul>
      </details>
      <p v-if="erreurTelechargement" class="erreur" role="alert">{{ erreurTelechargement }}</p>
    </section>
  </main>
</template>

<style scoped>
.bibliotheque-normes {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.champ-filtre {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.liste-documents,
.liste-fichiers-externes {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-repliable > summary {
  cursor: pointer;
  font-weight: 600;
  padding: 0.4rem 0;
}

.liste-repliable > ul {
  margin-top: 0.5rem;
  max-height: 24rem;
  overflow-y: auto;
}

.liste-documents li,
.liste-fichiers-externes li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.bloc-import,
.bloc-documents {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.formulaire-import {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}

.formulaire-import label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.formulaire-import input,
.formulaire-import select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

.actions,
.actions-document {
  display: flex;
  gap: 0.5rem;
}

.erreur {
  color: var(--vp-danger);
}

.test-succes {
  color: var(--vp-succes);
}

.test-echec {
  color: var(--vp-danger);
}
</style>

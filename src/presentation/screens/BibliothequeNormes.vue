<script setup lang="ts">
// Bibliothèque de normes — agrégation déterministe des
// normes/référentiels déjà portés par chaque gabarit du catalogue
// (inchangé), complétée par une bibliothèque de documents réellement
// importés (téléversement direct, GitHub, Google Drive) : globale à
// l'installation, consultable par l'assistant contextuel de section
// (`construireObjectifAssistantSection`).
import { computed, onMounted, reactive, ref } from 'vue'
import type { EntreeArborescence } from '../../connecteurs/github/GitHubConnector'
import type { FichierDrive } from '../../connecteurs/drive/DriveReaderConnector'
import { rechercherNormes } from '../../logique-metier/bibliotheque-normes/rechercherNormes'
import type { CategorieDocumentNormatif } from '../../logique-metier/domaine/types'
import { useAuthStore } from '../stores/useAuthStore'
import {
  useNormativeDocumentsStore,
  type ResultatConnexionDriveNormes,
} from '../stores/useNormativeDocumentsStore'

const authStore = useAuthStore()
const documentsStore = useNormativeDocumentsStore()

const motCle = ref('')
const resultats = computed(() => rechercherNormes(motCle.value))

const LIBELLES_CATEGORIE: Record<CategorieDocumentNormatif, string> = {
  norme: 'Norme',
  guideline: 'Guideline',
  methode: 'Méthode',
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
const categorieTeleversement = ref<CategorieDocumentNormatif>('norme')
const enImportTeleversement = ref(false)
const erreurTeleversement = ref<string | null>(null)

async function importerFichier(evenement: Event): Promise<void> {
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return
  erreurTeleversement.value = null
  enImportTeleversement.value = true
  try {
    await documentsStore.importerDepuisFichier(
      fichier,
      categorieTeleversement.value,
      actorCourant(),
    )
  } catch (e) {
    erreurTeleversement.value =
      e instanceof Error ? e.message : 'Erreur inconnue lors du téléversement.'
  } finally {
    enImportTeleversement.value = false
    ;(evenement.target as HTMLInputElement).value = ''
  }
}

// --- GitHub ---
const categorieGitHub = ref<CategorieDocumentNormatif>('norme')
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
const categorieDrive = ref<CategorieDocumentNormatif>('norme')
const resultatTestDrive = ref<ResultatConnexionDriveNormes | undefined>(undefined)
const testDriveEnCours = ref(false)
const fichiersDrive = ref<FichierDrive[]>([])
const enListeDrive = ref(false)
const erreurDrive = ref<string | null>(null)

async function enregistrerConnexionDrive(): Promise<void> {
  await documentsStore.configurerConnexionDriveLectureNormes(
    brouillonDrive.dossierId,
    brouillonDrive.jeton,
  )
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

onMounted(async () => {
  await documentsStore.charger()
})
</script>

<template>
  <main class="bibliotheque-normes">
    <RouterLink :to="{ name: 'tableau-de-bord' }" class="lien-retour">Tableau de bord</RouterLink>
    <h1>Bibliothèque de normes</h1>
    <p class="rappel">
      Normes et référentiels cités par les gabarits du catalogue — recherche par mot-clé.
    </p>

    <label class="champ-recherche">
      Rechercher une norme
      <input v-model="motCle" type="text" placeholder="ex. EudraLex, ICH Q9, ASTM" />
    </label>

    <p v-if="resultats.length === 0" class="etat-vide">Aucune norme ne correspond à ce mot-clé.</p>
    <ul v-else class="liste-normes">
      <li v-for="entree in resultats" :key="entree.norme">
        <strong>{{ entree.norme }}</strong>
        <span class="gabarits"> — cité par : {{ entree.gabarits.join(', ') }}</span>
      </li>
    </ul>

    <hr />

    <h2>Documents normatifs importés</h2>
    <p class="rappel">
      Normes/guidelines/méthodes propres à votre organisation, importées ici et consultables par
      l'assistant contextuel de section.
    </p>

    <section class="bloc-import">
      <h3>Téléversement direct</h3>
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
          Fichier (.docx, .pdf, .txt, .md)
          <input type="file" :disabled="enImportTeleversement" @change="importerFichier" />
        </label>
      </div>
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
      <ul v-if="fichiersGitHub.length > 0" class="liste-fichiers-externes">
        <li v-for="entree in fichiersGitHub" :key="entree.sha">
          <span>{{ entree.chemin }}</span>
          <button type="button" @click="importerDepuisGitHub(entree.chemin)">Importer</button>
        </li>
      </ul>
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
      <ul v-if="fichiersDrive.length > 0" class="liste-fichiers-externes">
        <li v-for="fichier in fichiersDrive" :key="fichier.id">
          <span>{{ fichier.nom }}</span>
          <button type="button" @click="importerDepuisDrive(fichier)">Importer</button>
        </li>
      </ul>
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
      <ul v-else class="liste-documents">
        <li v-for="document in documentsFiltres" :key="document.id">
          <div>
            <strong>{{ document.titre }}</strong>
            <span class="meta">
              — {{ LIBELLES_CATEGORIE[document.category] }} · source : {{ document.source }}
            </span>
          </div>
          <button type="button" @click="documentsStore.supprimerDocument(document.id)">
            Supprimer
          </button>
        </li>
      </ul>
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

.champ-recherche,
.champ-filtre {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.champ-recherche input {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.liste-normes,
.liste-documents,
.liste-fichiers-externes {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-normes li,
.liste-documents li,
.liste-fichiers-externes li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.9rem;
}

.liste-documents li,
.liste-fichiers-externes li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.gabarits,
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

.actions {
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

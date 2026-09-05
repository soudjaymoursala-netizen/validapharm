<script setup lang="ts">
// Tableau de bord / Vue portefeuille — version minimale de cet
// incrément : liste des projets + création (version complète avec
// statuts agrégés/alertes, backlog).
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Langue } from '../../logique-metier/domaine/types'
import { useClientsStore } from '../stores/useClientsStore'
import { useProjectsStore, type NouveauProjetInput } from '../stores/useProjectsStore'
import {
  useSynchronisationStore,
  type ResultatRecuperation,
  type ResultatSynchronisation,
} from '../stores/useSynchronisationStore'
import IconeSvg from '../composants/IconeSvg.vue'

const projetsStore = useProjectsStore()
const clientsStore = useClientsStore()
const syncStore = useSynchronisationStore()
const router = useRouter()
const route = useRoute()
const formulaireOuvert = ref(false)
const afficherArchives = ref(false)

/**
 * Filtrage optionnel par client (accès depuis la Fiche Client —
 * branche « Projets ») — `query.clientId`, jamais un paramètre de route
 * dédié : ce tableau de bord reste aussi la vue portefeuille globale
 * (accès direct depuis « Mon travail »), le filtre est une lentille
 * réversible sur les mêmes données, pas un écran séparé.
 */
const filtreClientId = computed(() =>
  typeof route.query.clientId === 'string' ? route.query.clientId : null,
)
const nomClientFiltre = computed(() =>
  filtreClientId.value ? (nomClient(filtreClientId.value) ?? filtreClientId.value) : null,
)
const projetsActifsAffiches = computed(() =>
  filtreClientId.value
    ? projetsStore.projetsActifs.filter((p) => p.client_id === filtreClientId.value)
    : projetsStore.projetsActifs,
)

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
        "Conflit détecté : la branche distante a changé depuis la dernière synchronisation. Vos modifications locales n'ont PAS été écrasées ni envoyées — ouvrez la résolution de conflit pour comparer champ par champ.",
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
  void clientsStore.chargerClients()
})

watch(
  filtreClientId,
  (clientId) => {
    if (clientId) brouillon.client_id = clientId
  },
  { immediate: true },
)

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

function nomClient(clientId: string | null): string | null {
  if (!clientId) return null
  return clientsStore.clients.find((c) => c.id === clientId)?.name ?? null
}
</script>

<template>
  <main class="tableau-de-bord">
    <header>
      <div>
        <h1>Tableau de bord</h1>
        <p class="sous-titre">{{ projetsActifsAffiches.length }} projet(s) actif(s)</p>
      </div>
      <div class="actions-entete">
        <RouterLink class="bouton-secondaire" :to="{ name: 'gestion-clients' }">
          <IconeSvg nom="utilisateur" :taille="15" />
          Clients
        </RouterLink>
        <RouterLink class="bouton-secondaire" :to="{ name: 'configuration-client' }">
          <IconeSvg nom="engrenage" :taille="15" />
          Configuration
        </RouterLink>
        <button type="button" class="bouton-principal" @click="formulaireOuvert = true">
          <IconeSvg nom="plus" :taille="15" />
          Nouveau projet
        </button>
      </div>
    </header>

    <section class="carte synchronisation">
      <div class="actions-sync">
        <button
          type="button"
          class="bouton-secondaire"
          :disabled="syncStore.synchronisationEnCours"
          @click="synchroniser"
        >
          <IconeSvg nom="nuage" :taille="15" />
          {{ syncStore.synchronisationEnCours ? 'Synchronisation…' : 'Synchroniser vers GitHub' }}
        </button>
        <button
          type="button"
          class="bouton-secondaire"
          :disabled="syncStore.synchronisationEnCours"
          @click="recupererDepuisGitHub"
        >
          <IconeSvg nom="nuage" :taille="15" />
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
      <RouterLink v-if="messageSync?.type === 'conflit'" :to="{ name: 'resolution-conflit' }">
        Résoudre le conflit
      </RouterLink>
    </section>

    <div v-if="filtreClientId" class="carte filtre-client">
      <span
        >Projets filtrés pour <strong>{{ nomClientFiltre }}</strong></span
      >
      <RouterLink :to="{ name: 'tableau-de-bord' }">Voir tous les projets</RouterLink>
    </div>

    <form v-if="formulaireOuvert" class="carte formulaire-projet" @submit.prevent="creerProjet">
      <label>
        Nom du projet
        <input v-model="brouillon.name" type="text" required autofocus />
      </label>
      <label>
        Client
        <select v-model="brouillon.client_id">
          <option :value="null">— aucun —</option>
          <option v-for="client in clientsStore.clients" :key="client.id" :value="client.id">
            {{ client.name }}
          </option>
        </select>
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
        <button type="button" class="bouton-secondaire" @click="formulaireOuvert = false">
          Annuler
        </button>
        <button type="submit" class="bouton-principal">Créer le projet</button>
      </div>
    </form>

    <div
      v-if="!projetsStore.enChargement && projetsActifsAffiches.length === 0"
      class="carte etat-vide"
    >
      <IconeSvg nom="dossier" :taille="28" />
      <p>
        {{
          filtreClientId
            ? 'Aucun projet actif pour ce client — créez-en un avec le bouton ci-dessus.'
            : "Aucun projet actif pour l'instant — créez le premier avec le bouton ci-dessus."
        }}
      </p>
    </div>

    <ul v-else class="liste-projets">
      <li v-for="projet in projetsActifsAffiches" :key="projet.id">
        <RouterLink
          class="liste-projets__lien"
          :to="{ name: 'fiche-projet', params: { projectId: projet.id } }"
        >
          <span class="liste-projets__icone" aria-hidden="true">
            <IconeSvg nom="dossier" :taille="18" />
          </span>
          <span class="liste-projets__texte">
            <span class="liste-projets__nom">{{ projet.name }}</span>
            <span v-if="nomClient(projet.client_id)" class="liste-projets__client">{{
              nomClient(projet.client_id)
            }}</span>
          </span>
          <span class="meta">{{ projet.sections.length }} section(s)</span>
          <IconeSvg nom="chevron-droit" :taille="16" class="liste-projets__fleche" />
        </RouterLink>
      </li>
    </ul>

    <section v-if="projetsStore.projetsArchives.length > 0" class="bloc-archives">
      <button type="button" class="lien-archives" @click="afficherArchives = !afficherArchives">
        {{ afficherArchives ? 'Masquer' : 'Afficher' }} les projets archivés ({{
          projetsStore.projetsArchives.length
        }})
      </button>
      <ul v-if="afficherArchives" class="liste-projets liste-projets--archives">
        <li v-for="projet in projetsStore.projetsArchives" :key="projet.id">
          {{ projet.name }}
          <span class="meta">archivé le {{ projet.archived_at }} par {{ projet.archived_by }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.tableau-de-bord {
  padding: 2.5rem;
  max-width: 60rem;
  margin: 0 auto;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

header h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: var(--vp-poids-bold);
}

.sous-titre {
  margin: 0.3rem 0 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.88rem;
}

.actions-entete {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

button {
  font-family: inherit;
  cursor: pointer;
}

.bouton-principal,
.bouton-secondaire {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: var(--vp-poids-medium);
  text-decoration: none;
  transition: var(--vp-transition);
  white-space: nowrap;
}

.bouton-principal {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
}

.bouton-principal:hover {
  background-color: var(--vp-marque-survol);
}

.bouton-secondaire {
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-principal);
  border: 1px solid var(--vp-bordure);
}

.bouton-secondaire:hover {
  border-color: var(--vp-marque);
  color: var(--vp-marque);
}

.bouton-secondaire:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.carte {
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  box-shadow: var(--vp-ombre-sm);
  padding: 1.25rem 1.5rem;
}

.synchronisation {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.filtre-client {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.88rem;
  color: var(--vp-texte-secondaire);
}

.filtre-client a {
  color: var(--vp-marque);
  text-decoration: none;
  font-weight: var(--vp-poids-medium);
  white-space: nowrap;
}

.filtre-client a:hover {
  text-decoration: underline;
}

.actions-sync {
  display: flex;
  gap: 0.5rem;
}

.message-sync {
  margin: 0;
}

.message-sync--succes {
  color: var(--vp-succes);
}

.message-sync--conflit,
.message-sync--erreur {
  color: var(--vp-danger);
}

.formulaire-projet {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 32rem;
}

.formulaire-projet label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.formulaire-projet input,
.formulaire-projet select,
.formulaire-projet textarea {
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

.liste-projets {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.liste-projets__lien {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  box-shadow: var(--vp-ombre-sm);
  padding: 0.9rem 1.2rem;
  text-decoration: none;
  color: inherit;
  transition: var(--vp-transition);
}

.liste-projets__lien:hover {
  border-color: var(--vp-marque);
  box-shadow: var(--vp-ombre-md);
}

.liste-projets__icone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  flex-shrink: 0;
  border-radius: var(--vp-rayon);
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

.liste-projets__texte {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.liste-projets__nom {
  font-weight: var(--vp-poids-semibold);
  color: var(--vp-texte-principal);
}

.liste-projets__client {
  font-size: 0.78rem;
  color: var(--vp-texte-secondaire);
}

.liste-projets__fleche {
  flex-shrink: 0;
  color: var(--vp-texte-secondaire);
}

.meta {
  flex-shrink: 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.82rem;
}

.etat-vide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  color: var(--vp-texte-secondaire);
  padding: 3rem 1.5rem;
  text-align: center;
}

.bloc-archives {
  margin-top: 0.5rem;
}

.lien-archives {
  background: none;
  color: var(--vp-marque);
  border: none;
  padding: 0;
  text-decoration: underline;
  font-size: 0.85rem;
}

.liste-projets--archives {
  margin-top: 0.75rem;
}

.liste-projets--archives li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.9rem;
  display: flex;
  justify-content: space-between;
  opacity: 0.75;
}
</style>

<script setup lang="ts">
// Mes clients (§4/§13 du prompt maître du 03/09/2026, Phase 40) — chaque
// client représente un site industriel pour lequel l'utilisateur travaille
// (nom, adresse, secteur, détails). Cliquer sur un client ouvre sa Fiche
// (`FicheClient.vue`), qui expose les 5 branches (Architecture, Process,
// Procédures, Templates & Formulaires, Projets) — cet écran ne liste donc
// plus directement les outils (avant Phase 40 : 8 liens par ligne), il ne
// fait que créer/archiver/désarchiver l'identité du client.
//
// Archivage (§4.31) : jamais une suppression physique (ALCOA+)
// — voir `ModaleConfirmationArchivage.vue` pour la double garde (nom
// retapé + vraie session, TD-046). Suppression **définitive** (admin
// uniquement, justification obligatoire) : voir `ModaleSuppressionDefinitive.vue`,
// nouvelle capacité Phase 39 (TD-046) — jamais pour un rôle non-admin.
import { onMounted, ref } from 'vue'
import ModaleConfirmationArchivage from '../composants/ModaleConfirmationArchivage.vue'
import ModaleSuppressionDefinitive from '../composants/ModaleSuppressionDefinitive.vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useClientsStore } from '../stores/useClientsStore'
import type { Client, SecteurClient } from '../../logique-metier/domaine/types'

const store = useClientsStore()
const authStore = useAuthStore()
const formulaireOuvert = ref(false)
const brouillon = ref({ name: '', adresse: '', secteur: '' as SecteurClient | '', details: '' })
const afficherArchives = ref(false)
const clientAArchiver = ref<Client | null>(null)
const clientASupprimer = ref<Client | null>(null)

const LIBELLES_SECTEUR: Record<SecteurClient, string> = {
  pharma: 'Pharma',
  dispositif_medical: 'Dispositif médical',
  autre: 'Autre',
}

onMounted(async () => {
  await store.chargerClients()
})

async function creerClient(): Promise<void> {
  if (brouillon.value.name.trim().length === 0) return
  await store.creerClient({
    name: brouillon.value.name.trim(),
    adresse: brouillon.value.adresse.trim() || null,
    secteur: brouillon.value.secteur || null,
    details: brouillon.value.details.trim() || null,
  })
  formulaireOuvert.value = false
  brouillon.value = { name: '', adresse: '', secteur: '', details: '' }
}

async function confirmerArchivage(): Promise<void> {
  if (!clientAArchiver.value) return
  await store.archiverClient(clientAArchiver.value.id)
  clientAArchiver.value = null
}

async function desarchiver(client: Client): Promise<void> {
  await store.desarchiverClient(client.id)
}

async function confirmerSuppressionDefinitive(justification: string): Promise<void> {
  if (!clientASupprimer.value) return
  await store.supprimerDefinitivement(clientASupprimer.value.id, justification)
  clientASupprimer.value = null
}
</script>

<template>
  <main class="gestion-clients">
    <header>
      <RouterLink :to="{ name: 'accueil' }" class="lien-retour">Accueil</RouterLink>
      <h1>Mes clients</h1>
      <button type="button" class="bouton-principal" @click="formulaireOuvert = true">
        Nouveau client
      </button>
    </header>

    <form v-if="formulaireOuvert" class="formulaire-client" @submit.prevent="creerClient">
      <label>
        Nom de l'entreprise
        <input v-model="brouillon.name" type="text" required autofocus />
      </label>
      <label>
        Adresse
        <input v-model="brouillon.adresse" type="text" />
      </label>
      <label>
        Secteur
        <select v-model="brouillon.secteur">
          <option value="">— non renseigné —</option>
          <option value="pharma">Pharma</option>
          <option value="dispositif_medical">Dispositif médical</option>
          <option value="autre">Autre</option>
        </select>
      </label>
      <label>
        Détails (produits fabriqués, contexte industriel…)
        <textarea v-model="brouillon.details" rows="2" />
      </label>
      <div class="actions">
        <button type="button" @click="formulaireOuvert = false">Annuler</button>
        <button type="submit" class="bouton-principal">Créer le client</button>
      </div>
    </form>

    <p v-if="!store.enChargement && store.clientsActifs.length === 0" class="etat-vide">
      Aucun client actif pour l'instant — créez le premier avec le bouton ci-dessus.
    </p>

    <ul v-else class="liste-clients">
      <li v-for="client in store.clientsActifs" :key="client.id">
        <RouterLink
          :to="{ name: 'fiche-client', params: { clientId: client.id } }"
          class="lien-client"
        >
          <span class="nom-client">{{ client.name }}</span>
          <span v-if="client.secteur" class="badge-secteur">{{
            LIBELLES_SECTEUR[client.secteur]
          }}</span>
        </RouterLink>
        <button type="button" class="bouton-archiver" @click="clientAArchiver = client">
          Archiver
        </button>
      </li>
    </ul>

    <section class="bloc-archives">
      <button type="button" class="lien-archives" @click="afficherArchives = !afficherArchives">
        {{ afficherArchives ? 'Masquer' : 'Afficher' }} les clients archivés ({{
          store.clientsArchives.length
        }})
      </button>
      <ul v-if="afficherArchives" class="liste-clients liste-clients--archives">
        <li v-for="client in store.clientsArchives" :key="client.id">
          {{ client.name }}
          <span class="meta">archivé le {{ client.archived_at }} par {{ client.archived_by }}</span>
          <div class="actions-archive">
            <button type="button" @click="desarchiver(client)">Désarchiver</button>
            <button
              v-if="authStore.estAdmin"
              type="button"
              class="bouton-danger"
              @click="clientASupprimer = client"
            >
              Supprimer définitivement
            </button>
          </div>
        </li>
      </ul>
    </section>

    <ModaleConfirmationArchivage
      v-if="clientAArchiver"
      :nom="clientAArchiver.name"
      @confirme="confirmerArchivage"
      @annule="clientAArchiver = null"
    />
    <ModaleSuppressionDefinitive
      v-if="clientASupprimer"
      :nom="clientASupprimer.name"
      @confirme="confirmerSuppressionDefinitive"
      @annule="clientASupprimer = null"
    />
  </main>
</template>

<style scoped>
.gestion-clients {
  padding: 2rem;
  font-family: var(--vp-police);
  max-width: 32rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

/* `.bouton-principal` seulement (jamais un `button` nu) : un `button`
   sans classe (Annuler, Désarchiver) doit rester une action neutre/
   secondaire — la base globale de `tokens.css` s'en charge — et non
   hériter par erreur de l'apparence d'une action primaire (Phase 41,
   bug trouvé pendant la vérification navigateur : « Annuler » avait
   exactement la même couleur que « Créer le client »). */
.bouton-principal {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: var(--vp-transition);
}

.bouton-principal:hover {
  background-color: var(--vp-marque-survol);
}

.formulaire-client {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.formulaire-client label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.formulaire-client input,
.formulaire-client select,
.formulaire-client textarea {
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

.liste-clients {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-clients li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lien-client {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-right: auto;
  color: var(--vp-texte-principal);
  text-decoration: none;
}

.lien-client:hover .nom-client {
  color: var(--vp-marque);
}

.nom-client {
  font-weight: var(--vp-poids-medium);
}

.badge-secteur {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

.bouton-archiver {
  background-color: var(--vp-danger);
  flex-shrink: 0;
}

.actions-archive {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}

.bouton-danger {
  background-color: transparent;
  color: var(--vp-danger);
  border: 1px solid var(--vp-danger);
}

.bloc-archives {
  margin-top: 1.5rem;
}

.lien-archives {
  background: none;
  color: var(--vp-marque);
  border: none;
  padding: 0;
  text-decoration: underline;
}

.liste-clients--archives {
  margin-top: 0.75rem;
}

.liste-clients--archives li {
  opacity: 0.75;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

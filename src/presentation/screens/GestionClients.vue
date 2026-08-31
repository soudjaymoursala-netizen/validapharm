<script setup lang="ts">
// Gestion des clients (FS §3 v12) — écran minimal : identité seule (nom).
// Prérequis pour isoler par client_id la configuration du miroir Drive
// (SDS §5bis/§7, tâche #25) et, plus tard, le fournisseur IA (tâche #14).
//
// Archivage (§4.31/URS-F-310, TD-033) : jamais une suppression physique
// (ALCOA+) — voir `ModaleConfirmationArchivage.vue` pour la double garde
// (nom retapé + mot de passe local, jamais une authentification).
import { onMounted, ref } from 'vue'
import ModaleConfirmationArchivage from '../composants/ModaleConfirmationArchivage.vue'
import { useClientsStore } from '../stores/useClientsStore'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import type { Client } from '../../logique-metier/domaine/types'

const store = useClientsStore()
const formulaireOuvert = ref(false)
const nom = ref('')
const afficherArchives = ref(false)
const clientAArchiver = ref<Client | null>(null)

onMounted(async () => {
  await store.chargerClients()
})

async function creerClient(): Promise<void> {
  if (nom.value.trim().length === 0) return
  await store.creerClient({ name: nom.value.trim() })
  formulaireOuvert.value = false
  nom.value = ''
}

async function confirmerArchivage(identiteDeclaree: string): Promise<void> {
  if (!clientAArchiver.value) return
  await store.archiverClient(clientAArchiver.value.id, identiteDeclaree)
  clientAArchiver.value = null
}

async function desarchiver(client: Client): Promise<void> {
  await store.desarchiverClient(client.id, IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1)
}
</script>

<template>
  <main class="gestion-clients">
    <header>
      <RouterLink :to="{ name: 'tableau-de-bord' }">&larr; Tableau de bord</RouterLink>
      <h1>Clients</h1>
      <button type="button" @click="formulaireOuvert = true">Nouveau client</button>
    </header>

    <form v-if="formulaireOuvert" class="formulaire-client" @submit.prevent="creerClient">
      <label>
        Nom du client
        <input v-model="nom" type="text" required autofocus />
      </label>
      <div class="actions">
        <button type="button" @click="formulaireOuvert = false">Annuler</button>
        <button type="submit">Créer le client</button>
      </div>
    </form>

    <p v-if="!store.enChargement && store.clientsActifs.length === 0" class="etat-vide">
      Aucun client actif pour l'instant — créez le premier avec le bouton ci-dessus.
    </p>

    <ul v-else class="liste-clients">
      <li v-for="client in store.clientsActifs" :key="client.id">
        {{ client.name }}
        <RouterLink :to="{ name: 'liste-missions', params: { clientId: client.id } }">
          Missions
        </RouterLink>
        <RouterLink :to="{ name: 'configuration-drive', params: { clientId: client.id } }">
          Drive
        </RouterLink>
        <RouterLink :to="{ name: 'configuration-ia', params: { clientId: client.id } }">
          IA
        </RouterLink>
        <RouterLink :to="{ name: 'panneau-chat', params: { clientId: client.id } }">
          Chat
        </RouterLink>
        <RouterLink :to="{ name: 'structure-systeme', params: { clientId: client.id } }">
          Structure Système
        </RouterLink>
        <RouterLink
          :to="{ name: 'assistant-strategie-qualification', params: { clientId: client.id } }"
        >
          Stratégie de qualification
        </RouterLink>
        <RouterLink :to="{ name: 'impact-assessment', params: { clientId: client.id } }">
          Impact Assessment
        </RouterLink>
        <RouterLink :to="{ name: 'csv-assessment', params: { clientId: client.id } }">
          Computer System Assessment
        </RouterLink>
        <RouterLink :to="{ name: 'revue-structure-procedure', params: { clientId: client.id } }">
          Procédures
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
          <button type="button" @click="desarchiver(client)">Désarchiver</button>
        </li>
      </ul>
    </section>

    <ModaleConfirmationArchivage
      v-if="clientAArchiver"
      :nom="clientAArchiver.name"
      @confirme="confirmerArchivage"
      @annule="clientAArchiver = null"
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

button {
  background-color: var(--vp-marque);
  color: white;
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
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

.liste-clients li > :first-child {
  margin-right: auto;
}

.bouton-archiver {
  background-color: var(--vp-couleur-erreur, #b00020);
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

<script setup lang="ts">
// Gestion des clients (FS §3 v12) — écran minimal : identité seule (nom).
// Prérequis pour isoler par client_id la configuration du miroir Drive
// (SDS §5bis/§7, tâche #25) et, plus tard, le fournisseur IA (tâche #14).
import { onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'

const store = useClientsStore()
const formulaireOuvert = ref(false)
const nom = ref('')

onMounted(async () => {
  await store.chargerClients()
})

async function creerClient(): Promise<void> {
  if (nom.value.trim().length === 0) return
  await store.creerClient({ name: nom.value.trim() })
  formulaireOuvert.value = false
  nom.value = ''
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

    <p v-if="!store.enChargement && store.clients.length === 0" class="etat-vide">
      Aucun client pour l'instant — créez le premier avec le bouton ci-dessus.
    </p>

    <ul v-else class="liste-clients">
      <!-- Lien vers la configuration Drive du client ajouté avec l'écran
           correspondant (backlog #25) — pas de route à cibler pour l'instant. -->
      <li v-for="client in store.clients" :key="client.id">
        {{ client.name }}
      </li>
    </ul>
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
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

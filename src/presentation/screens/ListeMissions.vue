<script setup lang="ts">
// Liste des Mission d'un client + création.
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '../stores/useClientsStore'
import { useMissionStore, type NouvelleMissionInput } from '../stores/useMissionStore'
import { useOrganizationStore } from '../stores/useOrganizationStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const missionStore = useMissionStore()
const organizationStore = useOrganizationStore()
const structureStore = useStructureSystemeStore()
const router = useRouter()

const formulaireOuvert = ref(false)
const brouillon = reactive({ titre: '', description: '', workspaceId: '', assetNodeId: '' })
const nomClient = ref<string | null>(null)

const workspacesClient = computed(() => organizationStore.workspacesOrganization(props.clientId))

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await Promise.all([
    missionStore.charger(props.clientId),
    organizationStore.charger(props.clientId),
    structureStore.charger(props.clientId),
  ])
})

async function creerMission(): Promise<void> {
  if (brouillon.titre.trim().length === 0) return
  const input: NouvelleMissionInput = {
    titre: brouillon.titre,
    description: brouillon.description,
    workspaceId: brouillon.workspaceId || null,
    assetNodeId: brouillon.assetNodeId || null,
  }
  const mission = await missionStore.creerMission(props.clientId, input)
  formulaireOuvert.value = false
  brouillon.titre = ''
  brouillon.description = ''
  brouillon.workspaceId = ''
  brouillon.assetNodeId = ''
  await router.push({
    name: 'mission-workspace',
    params: { clientId: props.clientId, missionId: mission.id },
  })
}
</script>

<template>
  <main class="liste-missions">
    <RouterLink
      class="lien-retour"
      :to="{ name: 'fiche-client', params: { clientId: props.clientId } }"
    >
      {{ nomClient ?? props.clientId }}
    </RouterLink>
    <header>
      <h1>Missions — {{ nomClient ?? props.clientId }}</h1>
      <button type="button" @click="formulaireOuvert = true">Nouvelle mission</button>
    </header>

    <form v-if="formulaireOuvert" class="formulaire-mission" @submit.prevent="creerMission">
      <label>
        Titre
        <input v-model="brouillon.titre" type="text" required autofocus />
      </label>
      <label>
        Description
        <textarea v-model="brouillon.description" />
      </label>
      <label>
        Site (optionnel)
        <select v-model="brouillon.workspaceId">
          <option value="">— aucun —</option>
          <option v-for="ws in workspacesClient" :key="ws.id" :value="ws.id">{{ ws.nom }}</option>
        </select>
      </label>
      <label>
        Actif ancré (optionnel)
        <select v-model="brouillon.assetNodeId">
          <option value="">— aucun —</option>
          <option v-for="noeud in structureStore.noeuds" :key="noeud.id" :value="noeud.id">
            {{ noeud.name }} ({{ noeud.code }})
          </option>
        </select>
      </label>
      <div class="actions-formulaire">
        <button type="submit">Créer</button>
        <button type="button" @click="formulaireOuvert = false">Annuler</button>
      </div>
    </form>

    <ul v-if="missionStore.missions.length > 0" class="liste">
      <li v-for="mission in missionStore.missions" :key="mission.id">
        <RouterLink
          :to="{ name: 'mission-workspace', params: { clientId, missionId: mission.id } }"
        >
          {{ mission.titre }}
        </RouterLink>
        <span class="statut">{{ mission.statut }}</span>
      </li>
    </ul>
    <p v-else>Aucune mission pour l'instant — créez la première avec le bouton ci-dessus.</p>
  </main>
</template>

<style scoped>
.liste-missions {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.formulaire-mission {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 480px;
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  background-color: var(--vp-fond-carte);
}

.actions-formulaire {
  display: flex;
  gap: 0.5rem;
}

.liste {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
}

.statut {
  font-size: 0.8rem;
  color: var(--vp-texte-secondaire);
}
</style>

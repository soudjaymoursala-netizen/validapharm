<script setup lang="ts">
// Écran Process/Fonction (§6 du prompt maître du 03/09/2026, Phase 40 —
// refonte du parcours) — comble un gap déjà documenté dans
// `docs/convergence/CONVERGENCE_PLAN.md` : `useProcessContextStore`
// (Phase 4) expose déjà `Process`/`FonctionActif`/association Fonction↔Actif,
// mais n'avait jamais eu d'écran de création, malgré son usage réel côté
// Content Plan/Context Engine.
import { onMounted, ref } from 'vue'
import type { TypeProcess } from '../../logique-metier/domaine/types'
import { useClientsStore } from '../stores/useClientsStore'
import { useProcessContextStore } from '../stores/useProcessContextStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'

defineOptions({ name: 'EcranProcess' })
const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const processStore = useProcessContextStore()
const structureStore = useStructureSystemeStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await processStore.charger(props.clientId)
  await structureStore.charger(props.clientId)
})

const LIBELLES_TYPE_PROCESS: Record<TypeProcess, string> = {
  manufacturing: 'Fabrication',
  packaging: 'Conditionnement',
  facility: 'Utilités / installations',
  digital: 'Digital',
  csv: 'CSV',
  document_workflow: 'Flux documentaire',
  business: 'Métier / affaires',
  ehs: 'EHS',
  logistics: 'Logistique',
  support: 'Support',
  other: 'Autre',
}
const TYPES_PROCESS = Object.keys(LIBELLES_TYPE_PROCESS) as TypeProcess[]

// --- Process ---
const nomProcess = ref('')
const descriptionProcess = ref('')
const typeProcess = ref<TypeProcess>('manufacturing')

async function creerProcess(): Promise<void> {
  if (nomProcess.value.trim().length === 0) return
  await processStore.creerProcess(props.clientId, {
    nom: nomProcess.value.trim(),
    description: descriptionProcess.value.trim(),
    type: typeProcess.value,
  })
  nomProcess.value = ''
  descriptionProcess.value = ''
  typeProcess.value = 'manufacturing'
}

// --- Fonctions ---
const nomFonction = ref('')
const descriptionFonction = ref('')

async function creerFonction(): Promise<void> {
  if (nomFonction.value.trim().length === 0) return
  await processStore.creerFonction(props.clientId, {
    nom: nomFonction.value.trim(),
    description: descriptionFonction.value.trim(),
  })
  nomFonction.value = ''
  descriptionFonction.value = ''
}

// --- Rattachement Fonction ↔ Process / Actif ---
const fonctionARattacher = ref('')
const processCibleRattachement = ref('')
const assetNodeCibleRattachement = ref('')

async function rattacherAProcess(): Promise<void> {
  if (!fonctionARattacher.value || !processCibleRattachement.value) return
  await processStore.associerFonctionAProcess(
    props.clientId,
    fonctionARattacher.value,
    processCibleRattachement.value,
  )
  processCibleRattachement.value = ''
}

async function rattacherAActif(): Promise<void> {
  if (!fonctionARattacher.value || !assetNodeCibleRattachement.value) return
  await processStore.associerFonctionAAssetNode(
    props.clientId,
    fonctionARattacher.value,
    assetNodeCibleRattachement.value,
  )
  assetNodeCibleRattachement.value = ''
}

function libelleProcess(processId: string): string {
  return processStore.processes.find((p) => p.id === processId)?.nom ?? processId
}
function libelleAssetNode(assetNodeId: string): string {
  const noeud = structureStore.noeuds.find((n) => n.id === assetNodeId)
  return noeud ? `${noeud.name} (${noeud.code})` : assetNodeId
}

function processusDeFonction(functionId: string): string[] {
  return processStore.associationsFonctionProcess
    .filter((a) => a.function_id === functionId)
    .map((a) => a.process_id)
}
function actifsDeFonction(functionId: string): string[] {
  return processStore.associationsFonctionAssetNode
    .filter((a) => a.function_id === functionId)
    .map((a) => a.asset_node_id)
}
</script>

<template>
  <main class="ecran-process">
    <RouterLink :to="{ name: 'fiche-client', params: { clientId: props.clientId } }">
      &larr; {{ nomClient ?? props.clientId }}
    </RouterLink>
    <h1>Process — {{ nomClient ?? props.clientId }}</h1>
    <p class="rappel">
      Un site peut définir autant de process que nécessaire. Une fonction peut être utilisée dans
      plusieurs process, et un même équipement peut porter plusieurs fonctions — jamais une relation
      1:1 imposée.
    </p>

    <section class="bloc-process">
      <h2>Process</h2>
      <form class="formulaire" @submit.prevent="creerProcess">
        <label>
          Nom
          <input v-model="nomProcess" type="text" required placeholder="ex. Compression" />
        </label>
        <label>
          Description
          <textarea v-model="descriptionProcess" rows="2" />
        </label>
        <label>
          Type
          <select v-model="typeProcess">
            <option v-for="type in TYPES_PROCESS" :key="type" :value="type">
              {{ LIBELLES_TYPE_PROCESS[type] }}
            </option>
          </select>
        </label>
        <button type="submit">Créer le process</button>
      </form>
      <ul v-if="processStore.processes.length > 0">
        <li v-for="p in processStore.processes" :key="p.id">
          <strong>{{ p.nom }}</strong>
          <span class="meta">({{ LIBELLES_TYPE_PROCESS[p.type] }})</span>
          <p v-if="p.description">{{ p.description }}</p>
        </li>
      </ul>
      <p v-else class="etat-vide">Aucun process pour l'instant.</p>
    </section>

    <section class="bloc-fonctions">
      <h2>Fonctions</h2>
      <p class="rappel">
        Ce qui doit être réalisé/protégé/fourni (production, mesure, contrôle, alarme, interlock…) —
        indépendant de l'implémentation physique/digitale, portée séparément par l'Architecture.
      </p>
      <form class="formulaire" @submit.prevent="creerFonction">
        <label>
          Nom
          <input
            v-model="nomFonction"
            type="text"
            required
            placeholder="ex. Régulation de température"
          />
        </label>
        <label>
          Description
          <textarea v-model="descriptionFonction" rows="2" />
        </label>
        <button type="submit">Créer la fonction</button>
      </form>

      <ul v-if="processStore.fonctions.length > 0" class="liste-fonctions">
        <li v-for="f in processStore.fonctions" :key="f.id">
          <strong>{{ f.nom }}</strong>
          <span v-if="processusDeFonction(f.id).length > 0" class="meta">
            — process : {{ processusDeFonction(f.id).map(libelleProcess).join(', ') }}
          </span>
          <span v-if="actifsDeFonction(f.id).length > 0" class="meta">
            — actifs : {{ actifsDeFonction(f.id).map(libelleAssetNode).join(', ') }}
          </span>
        </li>
      </ul>
      <p v-else class="etat-vide">Aucune fonction pour l'instant.</p>

      <div v-if="processStore.fonctions.length > 0" class="bloc-rattachement">
        <h3>Rattacher une fonction</h3>
        <div class="ligne-formulaire">
          <label>
            Fonction
            <select v-model="fonctionARattacher">
              <option value="">— choisir —</option>
              <option v-for="f in processStore.fonctions" :key="f.id" :value="f.id">
                {{ f.nom }}
              </option>
            </select>
          </label>
          <label>
            à un process
            <select v-model="processCibleRattachement" :disabled="!fonctionARattacher">
              <option value="">— choisir —</option>
              <option v-for="p in processStore.processes" :key="p.id" :value="p.id">
                {{ p.nom }}
              </option>
            </select>
          </label>
          <button type="button" :disabled="!processCibleRattachement" @click="rattacherAProcess">
            Rattacher au process
          </button>
        </div>
        <div class="ligne-formulaire">
          <label>
            à un actif (Structure Système)
            <select v-model="assetNodeCibleRattachement" :disabled="!fonctionARattacher">
              <option value="">— choisir —</option>
              <option v-for="n in structureStore.noeuds" :key="n.id" :value="n.id">
                {{ n.name }} ({{ n.code }})
              </option>
            </select>
          </label>
          <button type="button" :disabled="!assetNodeCibleRattachement" @click="rattacherAActif">
            Rattacher à l'actif
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.ecran-process {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 48rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
  margin: 0;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure, #ddd);
  padding: 1rem;
  border-radius: 0.5rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input[type='text'],
select,
textarea {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
}

ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

li {
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.4rem;
  padding: 0.6rem 0.8rem;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.bloc-rattachement {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-bordure, #ddd);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bloc-rattachement h3 {
  margin: 0;
  font-size: 0.95rem;
}

.ligne-formulaire {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

button {
  cursor: pointer;
}
</style>

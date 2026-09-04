<script setup lang="ts">
// Écran ContentPlan (Phase 9 de convergence architecturale, étendue Phase
// 28 — calcul de readiness) — gap trouvé en poursuivant l'inventaire de
// §5.31 CONTEXTE-REPRISE-SESSION.md : le domaine, la persistance et le
// store existaient sans aucun écran, aucun moyen visible de savoir si le
// dossier de livrables d'un actif est prêt à être gelé.
import { computed, onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useContentPlanStore } from '../stores/useContentPlanStore'
import { useProcessContextStore } from '../stores/useProcessContextStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { ErreurEcritureContentPlan } from '../stores/useContentPlanStore'
import type { TemplateType, TypeMethodProfileReference } from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const processStore = useProcessContextStore()
const contentPlanStore = useContentPlanStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await structureStore.charger(props.clientId)
  await processStore.charger(props.clientId)
  await contentPlanStore.charger(props.clientId)
})

const LIBELLES_TEMPLATE: Record<TemplateType, string> = {
  contexte_procede: 'Contexte procédé',
  urs: 'URS',
  dq: 'DQ',
  fat: 'FAT',
  sat: 'SAT',
  iq: 'IQ',
  oq: 'OQ',
  pq: 'PQ',
  validation_procede: 'Validation procédé',
  plan_metrologie: 'Plan de métrologie',
  plan_maintenance: 'Plan de maintenance',
}

const LIBELLES_READINESS: Record<string, string> = {
  pret: 'Prêt',
  besoin_information: "Besoin d'information",
  besoin_revue: 'Besoin de revue',
  bloque: 'Bloqué',
}

const LIBELLES_ERREUR: Record<ErreurEcritureContentPlan['erreur'], string> = {
  introuvable: 'Plan introuvable.',
  non_valide: 'Le plan doit être validé avant de pouvoir être gelé.',
  deja_gele: 'Ce plan est déjà gelé.',
  donnees_non_pretes: 'Les données ne sont pas encore prêtes (readiness ≠ prêt).',
}

// --- Création ---
const templateSelectionne = ref<TemplateType | ''>('')
const assetNodeSelectionne = ref('')
const processSelectionne = ref('')
const typeProfilMethode = ref<TypeMethodProfileReference | ''>('')
const referenceProfilMethode = ref('')
const noteContexte = ref('')

async function creerContentPlan(): Promise<void> {
  if (!templateSelectionne.value) return
  await contentPlanStore.creerContentPlan(props.clientId, {
    templateId: templateSelectionne.value,
    assetNodeId: assetNodeSelectionne.value || null,
    processId: processSelectionne.value || null,
    methodProfileId: referenceProfilMethode.value.trim() || null,
    methodProfileType: typeProfilMethode.value || null,
    contextSnapshot: { note: noteContexte.value.trim() },
  })
  templateSelectionne.value = ''
  assetNodeSelectionne.value = ''
  processSelectionne.value = ''
  typeProfilMethode.value = ''
  referenceProfilMethode.value = ''
  noteContexte.value = ''
}

// --- Actions sur un plan existant ---
const erreursParPlan = ref<Record<string, string>>({})

async function recalculer(contentPlanId: string): Promise<void> {
  const resultat = await contentPlanStore.recalculerReadiness(props.clientId, contentPlanId)
  erreursParPlan.value[contentPlanId] = 'erreur' in resultat ? LIBELLES_ERREUR[resultat.erreur] : ''
}

async function valider(contentPlanId: string): Promise<void> {
  const resultat = await contentPlanStore.validerContentPlan(props.clientId, contentPlanId)
  erreursParPlan.value[contentPlanId] = 'erreur' in resultat ? LIBELLES_ERREUR[resultat.erreur] : ''
}

async function geler(contentPlanId: string): Promise<void> {
  const resultat = await contentPlanStore.gelerContentPlan(props.clientId, contentPlanId)
  erreursParPlan.value[contentPlanId] = 'erreur' in resultat ? LIBELLES_ERREUR[resultat.erreur] : ''
}

function libelleAssetNode(assetNodeId: string | null): string {
  if (!assetNodeId) return '—'
  const noeud = structureStore.noeuds.find((n) => n.id === assetNodeId)
  return noeud ? `${noeud.name} (${noeud.code})` : assetNodeId
}

const plansTries = computed(() =>
  [...contentPlanStore.contentPlans].sort((a, b) => b.created_at.localeCompare(a.created_at)),
)
</script>

<template>
  <main class="content-plan">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Clients</RouterLink>
    <h1>Plans de livrable — {{ nomClient ?? props.clientId }}</h1>
    <p class="rappel">
      `readiness` est recalculé à la demande, jamais en tâche de fond. Un plan ne peut être gelé que
      s'il est déjà validé ET que ses données sont prêtes — jamais l'un sans l'autre.
    </p>

    <section class="bloc-creation">
      <h2>Nouveau plan</h2>
      <form class="formulaire" @submit.prevent="creerContentPlan">
        <label>
          Gabarit
          <select v-model="templateSelectionne" required>
            <option value="">— choisir —</option>
            <option v-for="(libelle, type) in LIBELLES_TEMPLATE" :key="type" :value="type">
              {{ libelle }}
            </option>
          </select>
        </label>
        <label>
          Nœud Structure Système (optionnel)
          <select v-model="assetNodeSelectionne">
            <option value="">— aucun —</option>
            <option v-for="noeud in structureStore.noeuds" :key="noeud.id" :value="noeud.id">
              {{ noeud.name }} ({{ noeud.code }})
            </option>
          </select>
        </label>
        <label>
          Procédé (optionnel)
          <select v-model="processSelectionne">
            <option value="">— aucun —</option>
            <option v-for="p in processStore.processes" :key="p.id" :value="p.id">
              {{ p.nom }}
            </option>
          </select>
        </label>
        <label>
          Type de profil de méthode (optionnel)
          <select v-model="typeProfilMethode">
            <option value="">— aucun —</option>
            <option value="acfc">ACFC</option>
            <option value="impact_assessment">Impact Assessment</option>
          </select>
        </label>
        <label v-if="typeProfilMethode">
          Référence du profil de méthode
          <input v-model="referenceProfilMethode" type="text" />
        </label>
        <label>
          Note de contexte (figée à la création, immutable)
          <textarea v-model="noteContexte" rows="2" />
        </label>
        <button type="submit">Créer le plan</button>
      </form>
    </section>

    <section class="bloc-plans">
      <h2>Plans existants</h2>
      <ul v-if="plansTries.length > 0" class="liste-plans">
        <li v-for="plan in plansTries" :key="plan.id" class="carte-plan">
          <p>
            <strong>{{ LIBELLES_TEMPLATE[plan.template_id] }}</strong> —
            {{ libelleAssetNode(plan.asset_node_id) }}
          </p>
          <p class="meta">
            Statut : <strong>{{ plan.statut }}</strong> — Readiness :
            <strong>{{ LIBELLES_READINESS[plan.readiness] }}</strong>
          </p>
          <p v-if="erreursParPlan[plan.id]" class="bandeau-erreur" role="alert">
            {{ erreursParPlan[plan.id] }}
          </p>
          <div class="actions">
            <button type="button" @click="recalculer(plan.id)">Recalculer readiness</button>
            <button v-if="plan.statut === 'brouillon'" type="button" @click="valider(plan.id)">
              Valider
            </button>
            <button v-if="plan.statut === 'valide'" type="button" @click="geler(plan.id)">
              Geler
            </button>
          </div>
        </li>
      </ul>
      <p v-else>Aucun plan pour l'instant.</p>
    </section>
  </main>
</template>

<style scoped>
.content-plan {
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

.carte-plan {
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

button {
  cursor: pointer;
}
</style>

<script setup lang="ts">
// Mission workspace (Phase 17, `docs/convergence/PHASE_17_MISSION_
// WORKSPACE_SPEC.md`) — expose visuellement Mission/Activity (Phase 13),
// ContextSnapshot (Phase 14) et le Reasoning Engine (Phase 15). Aucune
// section Assessment/Requirement/Test/Evidence directement rattachée à la
// Mission (voir spec §2 — appartient à `Strategy`, non construite).
// L'état de confiance est volontairement affiché avec un style dédié,
// jamais les jetons `--vp-statut-*` de `qualification_status` (TD-010 :
// ne jamais confondre les deux concepts, y compris visuellement).
import { computed, onMounted, reactive, ref } from 'vue'
import { construireNarratifContexte } from '../../logique-metier/contexte/narratifContexteSnapshot'
import type { EtatConfianceIA, Mission } from '../../logique-metier/domaine/types'
import { adaptateurAvecBascule, construireAdaptateursIA } from '../stores/construireAdaptateursIA'
import { useClientConfigStore } from '../stores/useClientConfigStore'
import { useConnexionRelaisIAStore } from '../stores/useConnexionRelaisIAStore'
import { useContextEngineStore } from '../stores/useContextEngineStore'
import { useMissionStore } from '../stores/useMissionStore'
import { NOMS_FOURNISSEURS } from '../stores/usePanneauChatStore'
import { useOrganizationStore } from '../stores/useOrganizationStore'
import { useProcessContextStore } from '../stores/useProcessContextStore'
import { useQualityEventStore } from '../stores/useQualityEventStore'
import { useReasoningEngineStore } from '../stores/useReasoningEngineStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'

const props = defineProps<{ clientId: string; missionId: string }>()

const missionStore = useMissionStore()
const contextStore = useContextEngineStore()
const reasoningStore = useReasoningEngineStore()
const qualityEventStore = useQualityEventStore()
const structureStore = useStructureSystemeStore()
const processContextStore = useProcessContextStore()
const organizationStore = useOrganizationStore()
const configStore = useClientConfigStore()
const relaisStore = useConnexionRelaisIAStore()

const nouvelleActivite = reactive({ titre: '', description: '' })
const dependanceSourceId = ref('')
const dependanceCibleId = ref('')
const qualityEventASsocierId = ref('')
const objectifRaisonnement = ref('')
const raisonnementEnCours = ref(false)
const erreurRaisonnement = ref<string | null>(null)

const mission = computed<Mission | undefined>(() =>
  missionStore.missions.find((m) => m.id === props.missionId),
)
const activites = computed(() => missionStore.activitesDeMission(props.missionId))
const associationsMission = computed(() =>
  missionStore.associationsQualityEvent.filter((a) => a.mission_id === props.missionId),
)
const dernierSnapshot = computed(() => {
  const snapshotsMission = contextStore.snapshots.filter(
    (s) =>
      s.workspace_id === mission.value?.workspace_id &&
      s.asset_node_id === mission.value?.asset_node_id,
  )
  return snapshotsMission.at(-1) ?? null
})
const elementsSnapshot = computed(() =>
  dernierSnapshot.value ? contextStore.elementsDuSnapshot(dernierSnapshot.value.id) : [],
)
/** Narratif OÙ/QUOI/COMMENT/POURQUOI-IMPACT (Phase 27, TD-025) — même fonction que celle consommée par le Reasoning Engine, jamais une seconde lecture divergente des mêmes éléments. */
const narratifContexte = computed(() =>
  construireNarratifContexte({
    items: elementsSnapshot.value,
    assetNodes: structureStore.noeuds,
    manufacturingContexts: processContextStore.manufacturingContexts,
    qualityEvents: qualityEventStore.evenements,
  }),
)
const invocationsMission = computed(() =>
  reasoningStore.requests
    .filter((r) => r.mission_id === props.missionId)
    .map((request) => ({
      request,
      response: reasoningStore.responses.find((r) => r.ai_request_id === request.id) ?? null,
    }))
    .reverse(),
)

const nomFournisseurActuel = computed(
  () => NOMS_FOURNISSEURS[configStore.config?.ai_provider ?? 'claude'] ?? 'Claude',
)

onMounted(async () => {
  await Promise.all([
    missionStore.charger(props.clientId),
    contextStore.charger(props.clientId),
    reasoningStore.charger(props.clientId),
    qualityEventStore.charger(props.clientId),
    structureStore.charger(props.clientId),
    processContextStore.charger(props.clientId),
    organizationStore.charger(),
    configStore.charger(props.clientId),
    relaisStore.charger(),
  ])
})

async function changerStatutMission(statut: Mission['statut']): Promise<void> {
  await missionStore.changerStatutMission(props.clientId, props.missionId, statut)
}

async function creerActivite(): Promise<void> {
  if (nouvelleActivite.titre.trim().length === 0) return
  await missionStore.creerActivity(props.clientId, {
    missionId: props.missionId,
    titre: nouvelleActivite.titre,
    description: nouvelleActivite.description,
  })
  nouvelleActivite.titre = ''
  nouvelleActivite.description = ''
}

async function changerStatutActivite(activityId: string, statut: string): Promise<void> {
  await missionStore.changerStatutActivity(
    props.clientId,
    activityId,
    statut as Parameters<typeof missionStore.changerStatutActivity>[2],
  )
}

async function ajouterDependance(): Promise<void> {
  if (!dependanceSourceId.value || !dependanceCibleId.value) return
  await missionStore.ajouterDependance(
    props.clientId,
    dependanceSourceId.value,
    dependanceCibleId.value,
  )
  dependanceSourceId.value = ''
  dependanceCibleId.value = ''
}

async function associerQualityEvent(): Promise<void> {
  if (!qualityEventASsocierId.value) return
  await missionStore.associerQualityEvent(
    props.clientId,
    props.missionId,
    qualityEventASsocierId.value,
  )
  qualityEventASsocierId.value = ''
}

async function assemblerContexte(): Promise<void> {
  if (!mission.value) return
  const arbreWorkspace = new Map(
    organizationStore.workspaces.map((w) => [
      w.id,
      { id: w.id, parent_workspace_id: w.parent_workspace_id },
    ]),
  )
  await contextStore.assemblerSnapshot(props.clientId, {
    workspaceId: mission.value.workspace_id,
    assetNodeId: mission.value.asset_node_id,
    arbreWorkspace,
    assetNodes: structureStore.noeuds,
    manufacturingContexts: processContextStore.manufacturingContexts,
    qualityEvents: qualityEventStore.evenements,
  })
}

async function raisonner(): Promise<void> {
  if (objectifRaisonnement.value.trim().length === 0) return
  raisonnementEnCours.value = true
  erreurRaisonnement.value = null
  try {
    const estFournisseurCloud = (configStore.config?.ai_provider ?? 'claude') !== 'local'
    const { principal, local } = construireAdaptateursIA({
      estFournisseurCloud,
      nomFournisseurActuel: nomFournisseurActuel.value,
      relayUrl: relaisStore.connexion?.relayUrl,
      jetonRelais: relaisStore.connexion?.jeton,
    })
    await reasoningStore.executerRaisonnement(props.clientId, {
      objectif: objectifRaisonnement.value,
      missionId: props.missionId,
      contextSnapshotId: dernierSnapshot.value?.id ?? null,
      fournisseur: adaptateurAvecBascule(principal, local),
      mode: 'chat_normatif',
    })
    objectifRaisonnement.value = ''
  } catch (e) {
    // Même discipline que `usePanneauChatStore` : toute erreur d'envoi
    // (relais/local injoignable, quota, réponse invalide) est montrée à
    // l'utilisateur, jamais un échec silencieux avec seule trace console.
    erreurRaisonnement.value =
      e instanceof Error ? e.message : 'Erreur inconnue lors du raisonnement.'
  } finally {
    raisonnementEnCours.value = false
  }
}

const LIBELLES_CONFIANCE: Record<EtatConfianceIA, string> = {
  connu: 'Connu (vérifié)',
  infere: 'Inféré',
  inconnu: 'Inconnu',
  conflit: 'Conflit',
  a_verifier: 'À vérifier',
}
</script>

<template>
  <main v-if="mission" class="mission-workspace">
    <header>
      <h1>{{ mission.titre }}</h1>
      <select
        :value="mission.statut"
        @change="
          changerStatutMission(($event.target as HTMLSelectElement).value as Mission['statut'])
        "
      >
        <option value="ouverte">Ouverte</option>
        <option value="en_cours">En cours</option>
        <option value="cloturee">Clôturée</option>
      </select>
    </header>
    <p>{{ mission.description }}</p>

    <section class="activites">
      <h2>Activités</h2>
      <form class="formulaire-inline" @submit.prevent="creerActivite">
        <input
          v-model="nouvelleActivite.titre"
          type="text"
          placeholder="Titre de l'activité"
          required
        />
        <input v-model="nouvelleActivite.description" type="text" placeholder="Description" />
        <button type="submit">Ajouter</button>
      </form>
      <ul>
        <li v-for="activite in activites" :key="activite.id">
          <span>{{ activite.titre }}</span>
          <select
            :value="activite.statut"
            @change="changerStatutActivite(activite.id, ($event.target as HTMLSelectElement).value)"
          >
            <option value="a_faire">À faire</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="bloquee">Bloquée</option>
          </select>
        </li>
      </ul>
      <form
        v-if="activites.length > 1"
        class="formulaire-inline"
        @submit.prevent="ajouterDependance"
      >
        <select v-model="dependanceSourceId" required>
          <option value="" disabled>Activité dépendante…</option>
          <option v-for="a in activites" :key="a.id" :value="a.id">{{ a.titre }}</option>
        </select>
        <span>dépend de</span>
        <select v-model="dependanceCibleId" required>
          <option value="" disabled>Activité requise…</option>
          <option v-for="a in activites" :key="a.id" :value="a.id">{{ a.titre }}</option>
        </select>
        <button type="submit">Lier</button>
      </form>
    </section>

    <section class="quality-events">
      <h2>Événements qualité associés</h2>
      <ul>
        <li v-for="association in associationsMission" :key="association.id">
          {{ association.quality_event_id }}
        </li>
      </ul>
      <form class="formulaire-inline" @submit.prevent="associerQualityEvent">
        <select v-model="qualityEventASsocierId" required>
          <option value="" disabled>Choisir un événement qualité…</option>
          <option
            v-for="evenement in qualityEventStore.evenements"
            :key="evenement.id"
            :value="evenement.id"
          >
            {{ evenement.titre }}
          </option>
        </select>
        <button type="submit">Associer</button>
      </form>
    </section>

    <section class="contexte">
      <h2>Contexte</h2>
      <button type="button" @click="assemblerContexte">Assembler le contexte</button>

      <template v-if="elementsSnapshot.length > 0">
        <div v-if="narratifContexte.ou.length > 0" class="facette-narratif">
          <h3>Où</h3>
          <ul>
            <li v-for="fait in narratifContexte.ou" :key="fait.id">{{ fait.texte }}</li>
          </ul>
        </div>
        <div v-if="narratifContexte.quoi.length > 0" class="facette-narratif">
          <h3>Quoi</h3>
          <ul>
            <li v-for="fait in narratifContexte.quoi" :key="fait.id">{{ fait.texte }}</li>
          </ul>
        </div>
        <div v-if="narratifContexte.comment.length > 0" class="facette-narratif">
          <h3>Comment</h3>
          <ul>
            <li v-for="fait in narratifContexte.comment" :key="fait.id">{{ fait.texte }}</li>
          </ul>
        </div>
        <div v-if="narratifContexte.pourquoiImpact.length > 0" class="facette-narratif">
          <h3>Pourquoi / Impact</h3>
          <ul>
            <li v-for="fait in narratifContexte.pourquoiImpact" :key="fait.id">{{ fait.texte }}</li>
          </ul>
        </div>
      </template>
      <p v-else-if="dernierSnapshot">Aucun élément de contexte résolu.</p>
    </section>

    <section class="raisonnement">
      <h2>Raisonnement</h2>
      <form class="formulaire-inline" @submit.prevent="raisonner">
        <input
          v-model="objectifRaisonnement"
          type="text"
          placeholder="Objectif du raisonnement"
          required
        />
        <button type="submit" :disabled="raisonnementEnCours">
          {{ raisonnementEnCours ? 'Raisonnement…' : 'Raisonner' }}
        </button>
      </form>
      <p v-if="erreurRaisonnement" class="bandeau-erreur" role="alert">{{ erreurRaisonnement }}</p>

      <div v-for="{ request, response } in invocationsMission" :key="request.id" class="invocation">
        <p class="objectif">{{ request.objectif }}</p>
        <template v-if="response">
          <p>{{ response.texte }}</p>
          <span :class="['badge-confiance', `badge-confiance--${response.etat_confiance}`]">
            {{ LIBELLES_CONFIANCE[response.etat_confiance] }}
          </span>
          <ul v-if="response.trace_appels_outils.length > 0" class="trace-outils">
            <li v-for="(trace, index) in response.trace_appels_outils" :key="index">
              {{ trace.outil }}
            </li>
          </ul>
        </template>
      </div>
    </section>
  </main>
  <p v-else>Mission introuvable.</p>
</template>

<style scoped>
.mission-workspace {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bandeau-erreur {
  color: var(--vp-statut-requalification-en-retard);
}

.formulaire-inline {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.facette-narratif {
  margin-top: 0.75rem;
}

.facette-narratif h3 {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-texte-secondaire);
}

section ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

section li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
}

.invocation {
  padding: 1rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  margin-bottom: 0.75rem;
}

.invocation .objectif {
  font-weight: 600;
}

/* Badge de confiance : style dédié, jamais les jetons --vp-statut-*
   de qualification_status (TD-010). */
.badge-confiance {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-confiance--connu {
  background-color: #dcfce7;
  color: #166534;
}

.badge-confiance--infere {
  background-color: #dbeafe;
  color: #1e40af;
}

.badge-confiance--inconnu {
  background-color: #f3f4f6;
  color: #374151;
}

.badge-confiance--conflit {
  background-color: #fee2e2;
  color: #991b1b;
}

.badge-confiance--a_verifier {
  background-color: #fef3c7;
  color: #92400e;
}

.trace-outils {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--vp-texte-secondaire);
}
</style>

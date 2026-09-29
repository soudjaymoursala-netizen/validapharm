<script setup lang="ts">
// Mission workspace — expose visuellement Mission/Activity,
// ContextSnapshot et le Reasoning Engine. Aucune
// section Assessment/Requirement/Test/Evidence directement rattachée à la
// Mission (voir spec §2 — appartient à `Strategy`, non construite).
// L'état de confiance est volontairement affiché avec un style dédié,
// jamais les jetons `--vp-statut-*` de `qualification_status` —
// ne jamais confondre les deux concepts, y compris visuellement.
import { computed, onMounted, reactive, ref } from 'vue'
import { construireNarratifContexte } from '../../logique-metier/contexte/narratifContexteSnapshot'
import type { EtatConfianceIA, Mission } from '../../logique-metier/domaine/types'
import { adaptateurAvecBascule, construireAdaptateursIA } from '../stores/construireAdaptateursIA'
import { useClientConfigStore } from '../stores/useClientConfigStore'
import { useClientsStore } from '../stores/useClientsStore'
import { useConnexionRelaisIAStore } from '../stores/useConnexionRelaisIAStore'
import { useContextEngineStore } from '../stores/useContextEngineStore'
import { useMissionStore } from '../stores/useMissionStore'
import { libelleFournisseurAffiche } from '../stores/usePanneauChatStore'
import { useProcessContextStore } from '../stores/useProcessContextStore'
import { useQualityEventStore } from '../stores/useQualityEventStore'
import { useReasoningEngineStore } from '../stores/useReasoningEngineStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import { useEnvoiUnique } from '../composables/useEnvoiUnique'

const props = defineProps<{ clientId: string; missionId: string }>()

const missionStore = useMissionStore()
const clientsStore = useClientsStore()
const contextStore = useContextEngineStore()
const reasoningStore = useReasoningEngineStore()
const qualityEventStore = useQualityEventStore()
const structureStore = useStructureSystemeStore()
const processContextStore = useProcessContextStore()
const configStore = useClientConfigStore()
const relaisStore = useConnexionRelaisIAStore()

// Un seul envoi à la fois (audit d'intégrité M2 : deux clics créaient deux
// enregistrements) et refus du serveur affichés (M1).
const { enCours: envoiEnCours, executer } = useEnvoiUnique()
const erreurEnvoi = ref<string | null>(null)

async function envoyer(action: () => Promise<unknown>): Promise<void> {
  erreurEnvoi.value = null
  try {
    await executer(action)
  } catch (e) {
    erreurEnvoi.value = e instanceof Error ? e.message : String(e)
  }
}

const nouvelleActivite = reactive({ titre: '', description: '' })
const dependanceSourceId = ref('')
const dependanceCibleId = ref('')
const qualityEventASsocierId = ref('')
const objectifRaisonnement = ref('')
const raisonnementEnCours = ref(false)
const erreurRaisonnement = ref<string | null>(null)
const nomClient = ref<string | null>(null)
const erreurStatut = ref<string | null>(null)

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
/** Narratif OÙ/QUOI/COMMENT/POURQUOI-IMPACT — même fonction que celle consommée par le Reasoning Engine, jamais une seconde lecture divergente des mêmes éléments. */
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

const nomFournisseurActuel = computed(() =>
  libelleFournisseurAffiche(configStore.config?.ai_provider ?? 'openai'),
)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await Promise.all([
    missionStore.charger(props.clientId),
    contextStore.charger(props.clientId),
    reasoningStore.charger(props.clientId),
    qualityEventStore.charger(props.clientId),
    structureStore.charger(props.clientId),
    processContextStore.charger(props.clientId),
    configStore.charger(props.clientId),
    relaisStore.charger(),
  ])
})

// --- Statut de la mission (décision du 29/09/2026) ---
// Clôturer malgré des activités non terminées, ou rouvrir une mission
// clôturée : possible, avec un motif tracé. Une mission clôturée est en
// lecture seule.
const estCloturee = computed(() => mission.value?.statut === 'cloturee')
const demandeMotifMission = ref<{
  statut: Mission['statut']
  activitesOuvertes: { id: string; titre: string; statut: string }[]
} | null>(null)
const motifMission = ref('')

async function changerStatutMission(statut: Mission['statut']): Promise<void> {
  erreurStatut.value = null
  if (estCloturee.value && statut !== 'cloturee') {
    // Réouverture : motif demandé d'emblée.
    demandeMotifMission.value = { statut, activitesOuvertes: [] }
    return
  }
  await envoyer(async () => {
    const resultat = await missionStore.changerStatutMission(
      props.clientId,
      props.missionId,
      statut,
    )
    if ('erreur' in resultat) {
      demandeMotifMission.value = { statut, activitesOuvertes: resultat.activitesOuvertes }
    }
  })
}

async function confirmerStatutMission(): Promise<void> {
  const demande = demandeMotifMission.value
  if (!demande) return
  if (motifMission.value.trim().length === 0) {
    erreurStatut.value = 'Indiquez le motif : il sera conservé dans l’historique de la mission.'
    return
  }
  erreurStatut.value = null
  await envoyer(async () => {
    const resultat = await missionStore.changerStatutMission(
      props.clientId,
      props.missionId,
      demande.statut,
      motifMission.value.trim(),
    )
    if (!('erreur' in resultat)) {
      demandeMotifMission.value = null
      motifMission.value = ''
    }
  })
}

// --- Activités : prérequis non terminés ---
const demandeMotifActivite = ref<{
  activityId: string
  prerequis: { id: string; titre: string; statut: string }[]
} | null>(null)
const motifActivite = ref('')

/** Prérequis d'une activité encore non terminés (badge « bloquée par »). */
function prerequisOuverts(activityId: string): string[] {
  return missionStore
    .dependancesDe(activityId)
    .map((d) => missionStore.activities.find((a) => a.id === d.activity_cible_id))
    .filter((a) => a !== undefined && a.statut !== 'terminee')
    .map((a) => a?.titre ?? '')
}

async function confirmerStatutActivite(): Promise<void> {
  const demande = demandeMotifActivite.value
  if (!demande) return
  if (motifActivite.value.trim().length === 0) {
    erreurStatut.value = 'Indiquez le motif : il sera conservé dans l’historique de l’activité.'
    return
  }
  erreurStatut.value = null
  await envoyer(async () => {
    const resultat = await missionStore.changerStatutActivity(
      props.clientId,
      demande.activityId,
      'terminee',
      motifActivite.value.trim(),
    )
    if (!('erreur' in resultat)) {
      demandeMotifActivite.value = null
      motifActivite.value = ''
    }
  })
}

async function retirerDependance(dependencyId: string): Promise<void> {
  await envoyer(() => missionStore.retirerDependance(props.clientId, dependencyId))
}

async function creerActivite(...args: Parameters<typeof creerActiviteSansGarde>): Promise<void> {
  await envoyer(() => creerActiviteSansGarde(...args))
}

async function creerActiviteSansGarde(): Promise<void> {
  if (nouvelleActivite.titre.trim().length === 0) return
  await missionStore.creerActivity(props.clientId, {
    missionId: props.missionId,
    titre: nouvelleActivite.titre,
    description: nouvelleActivite.description,
  })
  nouvelleActivite.titre = ''
  nouvelleActivite.description = ''
}

async function changerStatutActivite(
  ...args: Parameters<typeof changerStatutActiviteSansGarde>
): Promise<void> {
  await envoyer(() => changerStatutActiviteSansGarde(...args))
}

async function changerStatutActiviteSansGarde(activityId: string, statut: string): Promise<void> {
  erreurStatut.value = null
  const resultat = await missionStore.changerStatutActivity(
    props.clientId,
    activityId,
    statut as Parameters<typeof missionStore.changerStatutActivity>[2],
  )
  if ('erreur' in resultat) {
    demandeMotifActivite.value = { activityId, prerequis: resultat.prerequis }
  }
}

const erreurDependance = ref<string | null>(null)

async function ajouterDependance(
  ...args: Parameters<typeof ajouterDependanceSansGarde>
): Promise<void> {
  await envoyer(() => ajouterDependanceSansGarde(...args))
}

async function ajouterDependanceSansGarde(): Promise<void> {
  if (!dependanceSourceId.value || !dependanceCibleId.value) return
  erreurDependance.value = null
  const resultat = await missionStore.ajouterDependance(
    props.clientId,
    dependanceSourceId.value,
    dependanceCibleId.value,
  )
  if (!resultat.ok) {
    erreurDependance.value =
      resultat.raison === 'auto_dependance'
        ? 'Une activité ne peut pas dépendre d’elle-même.'
        : 'Refusé : l’activité requise dépend déjà (directement ou non) de l’activité dépendante — l’ordre serait contradictoire.'
    return
  }
  dependanceSourceId.value = ''
  dependanceCibleId.value = ''
}

function titreActivite(id: string): string {
  return missionStore.activities.find((a) => a.id === id)?.titre ?? id
}

function titreQualityEvent(id: string): string {
  return qualityEventStore.evenements.find((e) => e.id === id)?.titre ?? id
}

async function associerQualityEvent(
  ...args: Parameters<typeof associerQualityEventSansGarde>
): Promise<void> {
  await envoyer(() => associerQualityEventSansGarde(...args))
}

async function associerQualityEventSansGarde(): Promise<void> {
  if (!qualityEventASsocierId.value) return
  await missionStore.associerQualityEvent(
    props.clientId,
    props.missionId,
    qualityEventASsocierId.value,
  )
  qualityEventASsocierId.value = ''
}

async function assemblerContexte(
  ...args: Parameters<typeof assemblerContexteSansGarde>
): Promise<void> {
  await envoyer(() => assemblerContexteSansGarde(...args))
}

async function assemblerContexteSansGarde(): Promise<void> {
  if (!mission.value) return
  await contextStore.assemblerSnapshot(props.clientId, {
    workspaceId: mission.value.workspace_id,
    assetNodeId: mission.value.asset_node_id,
  })
}

async function raisonner(...args: Parameters<typeof raisonnerSansGarde>): Promise<void> {
  await envoyer(() => raisonnerSansGarde(...args))
}

async function raisonnerSansGarde(): Promise<void> {
  if (objectifRaisonnement.value.trim().length === 0) return
  raisonnementEnCours.value = true
  erreurRaisonnement.value = null
  try {
    const estFournisseurCloud = (configStore.config?.ai_provider ?? 'claude') !== 'local'
    const { principal, local } = construireAdaptateursIA({
      estFournisseurCloud,
      nomFournisseurActuel: nomFournisseurActuel.value,
      ...relaisStore.accesRelais(),
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
    <RouterLink
      :to="{ name: 'liste-missions', params: { clientId: props.clientId } }"
      class="lien-retour"
    >
      Missions
    </RouterLink>
    <header>
      <h1>{{ mission.titre }} — {{ nomClient ?? props.clientId }}</h1>
      <p v-if="erreurEnvoi" class="bandeau-erreur" role="alert">{{ erreurEnvoi }}</p>
      <select
        :key="`statut-${mission.statut}-${demandeMotifMission ? 'motif' : ''}`"
        :value="mission.statut"
        aria-label="Statut de la mission"
        :disabled="envoiEnCours"
        @change="
          changerStatutMission(($event.target as HTMLSelectElement).value as Mission['statut'])
        "
      >
        <option value="ouverte">Ouverte</option>
        <option value="en_cours">En cours</option>
        <option value="cloturee">Clôturée</option>
      </select>
    </header>
    <p v-if="erreurStatut" class="bandeau-erreur" role="alert">{{ erreurStatut }}</p>
    <section v-if="demandeMotifMission" class="demande-motif" aria-labelledby="titre-motif-mission">
      <h2 id="titre-motif-mission">
        {{
          demandeMotifMission.statut === 'cloturee'
            ? 'Clôturer malgré des activités non terminées'
            : 'Rouvrir la mission'
        }}
      </h2>
      <ul v-if="demandeMotifMission.activitesOuvertes.length > 0">
        <li v-for="a in demandeMotifMission.activitesOuvertes" :key="a.id">{{ a.titre }}</li>
      </ul>
      <label>
        Motif (obligatoire, conservé dans l'historique)
        <textarea v-model="motifMission" rows="2" required />
      </label>
      <div class="actions-motif">
        <button type="button" @click="demandeMotifMission = null">Annuler</button>
        <button type="button" :disabled="envoiEnCours" @click="confirmerStatutMission">
          Confirmer
        </button>
      </div>
    </section>
    <p v-if="estCloturee" class="rappel-lecture-seule" role="status">
      Mission clôturée : lecture seule. Pour la modifier, rouvrez-la (un motif sera demandé).
    </p>
    <p>{{ mission.description }}</p>

    <section class="activites">
      <h2>Activités</h2>
      <form v-if="!estCloturee" class="formulaire-inline" @submit.prevent="creerActivite">
        <input
          v-model="nouvelleActivite.titre"
          type="text"
          placeholder="Titre de l'activité"
          aria-label="Titre de la nouvelle activité"
          required
        />
        <input
          v-model="nouvelleActivite.description"
          type="text"
          placeholder="Description"
          aria-label="Description de la nouvelle activité"
        />
        <button type="submit" :disabled="envoiEnCours">Ajouter</button>
      </form>
      <ul>
        <li v-for="activite in activites" :key="activite.id">
          <span>
            {{ activite.titre }}
            <span
              v-if="activite.statut !== 'terminee' && prerequisOuverts(activite.id).length > 0"
              class="badge-bloquee"
            >
              Bloquée par {{ prerequisOuverts(activite.id).join(', ') }}
            </span>
            <span v-if="missionStore.dependancesDe(activite.id).length > 0" class="meta">
              — dépend de :
              <template v-for="d in missionStore.dependancesDe(activite.id)" :key="d.id">
                {{ titreActivite(d.activity_cible_id) }}
                <button
                  v-if="!estCloturee"
                  type="button"
                  class="bouton-lien"
                  :aria-label="`Retirer la dépendance de « ${activite.titre} » envers « ${titreActivite(d.activity_cible_id)} »`"
                  :disabled="envoiEnCours"
                  @click="retirerDependance(d.id)"
                >
                  retirer
                </button>
              </template>
            </span>
          </span>
          <select
            :key="`${activite.id}-${activite.statut}-${demandeMotifActivite?.activityId === activite.id}`"
            :value="activite.statut"
            :aria-label="`Statut de l'activité « ${activite.titre} »`"
            :disabled="estCloturee || envoiEnCours"
            @change="changerStatutActivite(activite.id, ($event.target as HTMLSelectElement).value)"
          >
            <option value="a_faire">À faire</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminée</option>
            <option value="bloquee">Bloquée</option>
          </select>
        </li>
      </ul>
      <section
        v-if="demandeMotifActivite"
        class="demande-motif"
        aria-labelledby="titre-motif-activite"
      >
        <h3 id="titre-motif-activite">Terminer malgré des prérequis non terminés</h3>
        <ul>
          <li v-for="a in demandeMotifActivite.prerequis" :key="a.id">{{ a.titre }}</li>
        </ul>
        <label>
          Motif (obligatoire, conservé dans l'historique)
          <textarea v-model="motifActivite" rows="2" required />
        </label>
        <div class="actions-motif">
          <button type="button" @click="demandeMotifActivite = null">Annuler</button>
          <button type="button" :disabled="envoiEnCours" @click="confirmerStatutActivite">
            Confirmer
          </button>
        </div>
      </section>
      <form
        v-if="activites.length > 1 && !estCloturee"
        class="formulaire-inline"
        @submit.prevent="ajouterDependance"
      >
        <select v-model="dependanceSourceId" aria-label="Activité dépendante" required>
          <option value="" disabled>Activité dépendante…</option>
          <option v-for="a in activites" :key="a.id" :value="a.id">{{ a.titre }}</option>
        </select>
        <span>dépend de</span>
        <select v-model="dependanceCibleId" aria-label="Activité requise" required>
          <option value="" disabled>Activité requise…</option>
          <option v-for="a in activites" :key="a.id" :value="a.id">{{ a.titre }}</option>
        </select>
        <button type="submit" :disabled="envoiEnCours">Lier</button>
      </form>
      <p v-if="erreurDependance" class="bandeau-erreur" role="alert">{{ erreurDependance }}</p>
    </section>

    <section class="quality-events">
      <h2>Événements qualité associés</h2>
      <ul>
        <li v-for="association in associationsMission" :key="association.id">
          {{ titreQualityEvent(association.quality_event_id) }}
        </li>
      </ul>
      <form v-if="!estCloturee" class="formulaire-inline" @submit.prevent="associerQualityEvent">
        <select v-model="qualityEventASsocierId" aria-label="Événement qualité à associer" required>
          <option value="" disabled>Choisir un événement qualité…</option>
          <option
            v-for="evenement in qualityEventStore.evenements"
            :key="evenement.id"
            :value="evenement.id"
          >
            {{ evenement.titre }}
          </option>
        </select>
        <button type="submit" :disabled="envoiEnCours">Associer</button>
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
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
  align-items: center;
}

/* Audit UX exécution #10 : la fiche débordait à 375 px (612 px de large). */
@media (max-width: 600px) {
  .mission-workspace {
    padding: 1rem;
  }

  section li {
    flex-wrap: wrap;
    gap: 0.4rem;
  }
}

.bandeau-erreur {
  color: var(--vp-danger);
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.formulaire-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.demande-motif {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--vp-attention);
  border-radius: var(--vp-rayon);
}

.demande-motif label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.actions-motif {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.rappel-lecture-seule {
  color: var(--vp-texte-secondaire);
  font-style: italic;
}

.badge-bloquee {
  margin-left: 0.4rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background-color: var(--vp-attention-fond-leger, transparent);
  color: var(--vp-attention);
  border: 1px solid var(--vp-attention);
}

.bouton-lien {
  background: none;
  border: none;
  padding: 0 0.2rem;
  color: var(--vp-marque);
  text-decoration: underline;
  cursor: pointer;
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
   de qualification_status. */
.badge-confiance {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-confiance--connu {
  background-color: var(--vp-succes-fond-leger);
  color: var(--vp-succes);
}

.badge-confiance--infere {
  background-color: var(--vp-info-fond-leger);
  color: var(--vp-info);
}

.badge-confiance--inconnu {
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-secondaire);
}

.badge-confiance--conflit {
  background-color: var(--vp-danger-fond-leger);
  color: var(--vp-danger);
}

.badge-confiance--a_verifier {
  background-color: var(--vp-attention-fond-leger);
  color: var(--vp-attention);
}

.trace-outils {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--vp-texte-secondaire);
}
</style>

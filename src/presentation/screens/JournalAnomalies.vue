<script setup lang="ts">
// Journal d'anomalies (FDS §3.7) — écran manquant trouvé le
// 31/08/2026 : le type de domaine `QualityEvent` (famille Change
// Control/Deviation/CAPA/Investigation/Audit finding/Revue périodique),
// sa table Dexie et son store (`useQualityEventStore.ts`, Phase 5 de
// convergence) existaient déjà en entier, cross-référencement compris
// (Deviation → Investigation → CAPA) — seul un écran autonome manquait,
// `MissionWorkspace.vue` n'exposant ces événements que dans le contexte
// d'une Mission précise. La FDS §12 affirmait à tort qu'« aucun type de
// domaine n'existe » — écart documentaire de traçabilité, pas un écart
// fonctionnel réel ; corrigé ici dans la FDS en même temps que l'écran.
import { computed, onMounted, reactive, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useQualityEventStore } from '../stores/useQualityEventStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type {
  OrigineQualityEvent,
  QualityEvent,
  TypeQualityEvent,
} from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const evenementsStore = useQualityEventStore()
const structureStore = useStructureSystemeStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await Promise.all([
    evenementsStore.charger(props.clientId),
    structureStore.charger(props.clientId),
  ])
})

const LIBELLES_TYPE: Record<TypeQualityEvent, string> = {
  change_control: 'Change Control',
  deviation: 'Déviation / anomalie',
  capa: 'CAPA',
  investigation: 'Investigation',
  audit_finding: "Constat d'audit",
  periodic_review: 'Revue périodique',
}
const LIBELLES_ORIGINE: Record<OrigineQualityEvent, string> = {
  interne: 'Interne',
  externe: 'Externe',
  mixte: 'Mixte',
}
const LIBELLES_STATUT: Record<QualityEvent['statut'], string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  cloture: 'Clôturé',
}

const brouillon = reactive({
  type: '' as TypeQualityEvent | '',
  titre: '',
  description: '',
  origine: 'interne' as OrigineQualityEvent,
  assetNodeId: '',
  referenceExterneSysteme: '',
  referenceExterneIdentifiant: '',
})
const filtreType = ref<TypeQualityEvent | ''>('')
const filtreStatut = ref<QualityEvent['statut'] | ''>('')
const evenementSourcePourReference = reactive<Record<string, string>>({})

const formulaireComplet = computed(() => brouillon.type !== '' && brouillon.titre.trim().length > 0)

async function creerEvenement(): Promise<void> {
  if (!formulaireComplet.value || !brouillon.type) return
  await evenementsStore.creerEvenement(props.clientId, {
    type: brouillon.type,
    titre: brouillon.titre.trim(),
    description: brouillon.description.trim(),
    origine: brouillon.origine,
    referenceExterne:
      brouillon.referenceExterneSysteme.trim().length > 0
        ? {
            systeme: brouillon.referenceExterneSysteme.trim(),
            identifiant: brouillon.referenceExterneIdentifiant.trim(),
          }
        : null,
    assetNodeId: brouillon.assetNodeId || null,
    processId: null,
    manufacturingContextId: null,
  })
  brouillon.type = ''
  brouillon.titre = ''
  brouillon.description = ''
  brouillon.origine = 'interne'
  brouillon.assetNodeId = ''
  brouillon.referenceExterneSysteme = ''
  brouillon.referenceExterneIdentifiant = ''
}

const evenementsFiltres = computed(() =>
  evenementsStore.evenements
    .filter((e) => !filtreType.value || e.type === filtreType.value)
    .filter((e) => !filtreStatut.value || e.statut === filtreStatut.value)
    .sort((a, b) => b.created_at.localeCompare(a.created_at)),
)

async function creerReference(cibleId: string): Promise<void> {
  const sourceId = evenementSourcePourReference[cibleId]
  if (!sourceId) return
  await evenementsStore.referencerEvenement(props.clientId, sourceId, cibleId)
  evenementSourcePourReference[cibleId] = ''
}

function nomNoeud(id: string | null): string {
  if (!id) return '—'
  return structureStore.noeuds.find((n) => n.id === id)?.name ?? id
}

function titreEvenement(id: string): string {
  return evenementsStore.evenements.find((e) => e.id === id)?.titre ?? id
}
</script>

<template>
  <main class="journal-anomalies">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Journal d'anomalies — {{ nomClient ?? props.clientId }}</h1>
    <p class="bandeau-disclaimer">
      Change Control, Déviation, CAPA, Investigation, Constat d'audit, Revue périodique. Un
      événement externe référencé n'est jamais un verrou sur un autre module (DEC-002/DEC-055).
    </p>

    <form class="formulaire" @submit.prevent="creerEvenement">
      <label>
        Type
        <select v-model="brouillon.type" required>
          <option value="" disabled>— choisir —</option>
          <option v-for="(libelle, type) in LIBELLES_TYPE" :key="type" :value="type">
            {{ libelle }}
          </option>
        </select>
      </label>
      <label>
        Titre
        <input v-model="brouillon.titre" type="text" required />
      </label>
      <label>
        Description
        <textarea v-model="brouillon.description" rows="3"></textarea>
      </label>
      <label>
        Origine
        <select v-model="brouillon.origine">
          <option v-for="(libelle, origine) in LIBELLES_ORIGINE" :key="origine" :value="origine">
            {{ libelle }}
          </option>
        </select>
      </label>
      <label>
        Nœud Structure Système (optionnel)
        <select v-model="brouillon.assetNodeId">
          <option value="">— aucun —</option>
          <option v-for="n in structureStore.noeuds" :key="n.id" :value="n.id">
            {{ n.name }} ({{ n.code }})
          </option>
        </select>
      </label>
      <label>
        Référence externe — système (optionnel)
        <input
          v-model="brouillon.referenceExterneSysteme"
          type="text"
          placeholder="ex. QMS client"
        />
      </label>
      <label v-if="brouillon.referenceExterneSysteme">
        Référence externe — identifiant
        <input v-model="brouillon.referenceExterneIdentifiant" type="text" />
      </label>
      <div class="actions">
        <button type="submit" :disabled="!formulaireComplet">Créer l'événement</button>
      </div>
    </form>

    <section class="bloc-filtres">
      <label>
        Filtrer par type
        <select v-model="filtreType">
          <option value="">— tous —</option>
          <option v-for="(libelle, type) in LIBELLES_TYPE" :key="type" :value="type">
            {{ libelle }}
          </option>
        </select>
      </label>
      <label>
        Filtrer par statut
        <select v-model="filtreStatut">
          <option value="">— tous —</option>
          <option v-for="(libelle, statut) in LIBELLES_STATUT" :key="statut" :value="statut">
            {{ libelle }}
          </option>
        </select>
      </label>
    </section>

    <ul class="liste-evenements">
      <li v-for="e in evenementsFiltres" :key="e.id">
        <div class="ligne-evenement">
          <strong>{{ e.titre }}</strong>
          <span class="meta">({{ LIBELLES_TYPE[e.type] }})</span>
          <span :class="['statut', e.statut]">{{ LIBELLES_STATUT[e.statut] }}</span>
        </div>
        <p v-if="e.description" class="description">{{ e.description }}</p>
        <p class="meta">
          Origine : {{ LIBELLES_ORIGINE[e.origine] }} · Actif : {{ nomNoeud(e.asset_node_id) }}
          <span v-if="e.reference_externe">
            · Réf. externe : {{ e.reference_externe.systeme }} /
            {{ e.reference_externe.identifiant }}
          </span>
        </p>
        <ul v-if="evenementsStore.referencesDepuis(e.id).length > 0" class="liste-references">
          <li v-for="r in evenementsStore.referencesDepuis(e.id)" :key="r.id">
            → {{ titreEvenement(r.quality_event_cible_id) }}
          </li>
        </ul>
        <div class="actions-evenement">
          <select
            v-model="e.statut"
            @change="evenementsStore.changerStatut(props.clientId, e.id, e.statut)"
          >
            <option v-for="(libelle, statut) in LIBELLES_STATUT" :key="statut" :value="statut">
              {{ libelle }}
            </option>
          </select>
          <select v-model="evenementSourcePourReference[e.id]">
            <option value="">— référencer depuis —</option>
            <option
              v-for="autre in evenementsStore.evenements.filter((a) => a.id !== e.id)"
              :key="autre.id"
              :value="autre.id"
            >
              {{ autre.titre }}
            </option>
          </select>
          <button type="button" @click="creerReference(e.id)">Référencer</button>
        </div>
      </li>
    </ul>
    <p v-if="evenementsFiltres.length === 0" class="etat-vide">Aucun événement pour l'instant.</p>
  </main>
</template>

<style scoped>
.journal-anomalies {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 44rem;
}

.bandeau-disclaimer {
  font-style: italic;
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.formulaire label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input,
select,
textarea {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

button {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.bloc-filtres {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.bloc-filtres label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9em;
}

.liste-evenements {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.liste-evenements li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ligne-evenement {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.description {
  margin: 0;
}

.statut {
  font-size: 0.8em;
  font-weight: 600;
  border-radius: var(--vp-rayon);
  padding: 0.1rem 0.5rem;
}

.statut.ouvert {
  color: var(--vp-statut-requalification-en-retard);
}

.statut.en_cours {
  color: var(--vp-marque);
}

.statut.cloture {
  color: var(--vp-texte-secondaire);
}

.liste-references {
  list-style: none;
  padding-left: 1rem;
  font-size: 0.85em;
  color: var(--vp-texte-secondaire);
}

.actions-evenement {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

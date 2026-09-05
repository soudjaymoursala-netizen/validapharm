<script setup lang="ts">
// Chaîne de définition Requirement → TestObjective → TestCandidate → Test
// + Couverture — écran manquant
// trouvé en simulant un vrai parcours de qualification de bout en bout
// (§5.31 CONTEXTE-REPRISE-SESSION.md) : le domaine, la persistance et le
// store existaient depuis le 25/08/2026 sans jamais avoir d'écran, rendant
// impossible de transformer une exigence URS en scénario de test formel.
import { computed, onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import { useTestDefinitionStore } from '../stores/useTestDefinitionStore'
import type { StatutTestCandidate } from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const testStore = useTestDefinitionStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await structureStore.charger(props.clientId)
  await testStore.charger(props.clientId)
})

const LIBELLES_STATUT_CANDIDATE: Record<StatutTestCandidate, string> = {
  propose: 'Proposé',
  besoin_information: "Besoin d'information",
  besoin_revue: 'Besoin de revue',
  accepte: 'Accepté',
  rejete: 'Rejeté',
  doublon: 'Doublon',
  remplace: 'Remplacé',
}

// --- Exigences ---
const refRequirement = ref('')
const titreRequirement = ref('')
const descriptionRequirement = ref('')
const assetNodeRequirement = ref('')

async function creerRequirement(): Promise<void> {
  if (refRequirement.value.trim().length === 0 || titreRequirement.value.trim().length === 0) return
  await testStore.creerRequirement(props.clientId, {
    reference: refRequirement.value.trim(),
    titre: titreRequirement.value.trim(),
    description: descriptionRequirement.value.trim(),
    assetNodeId: assetNodeRequirement.value || null,
    processId: null,
  })
  refRequirement.value = ''
  titreRequirement.value = ''
  descriptionRequirement.value = ''
  assetNodeRequirement.value = ''
}

function libelleRequirement(requirementId: string): string {
  const r = testStore.requirements.find((r) => r.id === requirementId)
  return r ? `${r.reference} — ${r.titre}` : requirementId
}

// --- Couverture des risques (Test Design Engine) ---
// Rapport recalculé à l'affichage, jamais persisté (même discipline que
// `testsCouvrantRequirement`) — un risque `action_requise` sans candidat
// de test actif est signalé explicitement, jamais silencieux.
function couvertureRisques(requirementId: string) {
  return testStore.couvertureRisquesRequirement(requirementId)
}

// --- Objectifs de test ---
const requirementSelectionne = ref('')
const titreObjectif = ref('')
const descriptionObjectif = ref('')

async function creerObjectif(): Promise<void> {
  if (!requirementSelectionne.value || titreObjectif.value.trim().length === 0) return
  await testStore.creerTestObjective(props.clientId, {
    requirementId: requirementSelectionne.value,
    titre: titreObjectif.value.trim(),
    description: descriptionObjectif.value.trim(),
  })
  titreObjectif.value = ''
  descriptionObjectif.value = ''
}

function libelleObjectif(testObjectiveId: string): string {
  const o = testStore.testObjectives.find((o) => o.id === testObjectiveId)
  return o ? o.titre : testObjectiveId
}

// --- Génération de candidats depuis les risques ---
const messageGenerationParObjectif = ref<Record<string, string>>({})

async function genererDepuisRisques(testObjectiveId: string): Promise<void> {
  const resultat = await testStore.genererCandidatsRisquesPourObjectif(
    props.clientId,
    testObjectiveId,
  )
  messageGenerationParObjectif.value[testObjectiveId] = resultat.ok
    ? resultat.nombreCrees > 0
      ? `${resultat.nombreCrees} candidat(s) proposé(s) depuis l'analyse de risque.`
      : "Aucun nouveau risque à couvrir (déjà couverts, ou aucun risque 'action requise' sur le nœud de cette exigence)."
    : 'Exigence introuvable pour cet objectif.'
}

// --- Candidats de test ---
const objectifSelectionne = ref('')
const titreCandidat = ref('')
const descriptionCandidat = ref('')
const motifsParCandidat = ref<Record<string, string>>({})

async function creerCandidat(): Promise<void> {
  if (!objectifSelectionne.value || titreCandidat.value.trim().length === 0) return
  await testStore.creerTestCandidate(props.clientId, {
    testObjectiveId: objectifSelectionne.value,
    titre: titreCandidat.value.trim(),
    description: descriptionCandidat.value.trim(),
  })
  titreCandidat.value = ''
  descriptionCandidat.value = ''
}

async function accepter(candidatId: string): Promise<void> {
  await testStore.accepterTestCandidate(props.clientId, candidatId)
}

async function rejeter(candidatId: string): Promise<void> {
  const motif = motifsParCandidat.value[candidatId]?.trim()
  if (!motif) return
  await testStore.rejeterTestCandidate(props.clientId, candidatId, motif)
}

async function besoinInformation(candidatId: string): Promise<void> {
  const motif = motifsParCandidat.value[candidatId]?.trim()
  if (!motif) return
  await testStore.marquerBesoinInformation(props.clientId, candidatId, motif)
}

const candidatsAcceptes = computed(() =>
  testStore.testCandidates.filter((c) => c.statut === 'accepte'),
)

// --- Tests (création à partir d'un candidat accepté) ---
const candidatSelectionne = ref('')
const titreTest = ref('')
const descriptionTest = ref('')
const etapesBrouillon = ref<Array<{ action: string; resultatAttendu: string }>>([
  { action: '', resultatAttendu: '' },
])
const erreurCreationTest = ref<string | null>(null)

function ajouterEtape(): void {
  etapesBrouillon.value.push({ action: '', resultatAttendu: '' })
}
function retirerEtape(index: number): void {
  if (etapesBrouillon.value.length > 1) etapesBrouillon.value.splice(index, 1)
}

async function creerTest(): Promise<void> {
  erreurCreationTest.value = null
  if (!candidatSelectionne.value || titreTest.value.trim().length === 0) return
  const etapes = etapesBrouillon.value
    .filter((e) => e.action.trim().length > 0)
    .map((e) => ({ action: e.action.trim(), resultatAttendu: e.resultatAttendu.trim() }))
  if (etapes.length === 0) return
  const resultat = await testStore.creerTestDepuisCandidat(
    props.clientId,
    candidatSelectionne.value,
    {
      titre: titreTest.value.trim(),
      description: descriptionTest.value.trim(),
      etapes,
    },
  )
  if ('erreur' in resultat) {
    erreurCreationTest.value =
      resultat.erreur === 'candidat_non_accepte'
        ? 'Ce candidat doit être accepté avant de pouvoir créer un test.'
        : 'Candidat introuvable.'
    return
  }
  titreTest.value = ''
  descriptionTest.value = ''
  etapesBrouillon.value = [{ action: '', resultatAttendu: '' }]
}

async function approuverTest(testId: string): Promise<void> {
  await testStore.approuverTest(props.clientId, testId)
}

// --- Couverture ---
const requirementCouverture = ref('')
const testCouverture = ref('')
const testsApprouves = computed(() => testStore.tests.filter((t) => t.statut === 'approuve'))

async function declarerCouverture(): Promise<void> {
  if (!requirementCouverture.value || !testCouverture.value) return
  await testStore.declarerCouverture(
    props.clientId,
    requirementCouverture.value,
    testCouverture.value,
  )
  requirementCouverture.value = ''
  testCouverture.value = ''
}
</script>

<template>
  <main class="definition-tests">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Clients</RouterLink>
    <h1>Exigences et tests — {{ nomClient ?? props.clientId }}</h1>
    <p class="rappel">
      Chaîne de définition Requirement → Objectif de test → Candidat → Test, avec couverture
      explicite — jamais déduite automatiquement.
    </p>

    <section class="bloc-requirements">
      <h2>Exigences</h2>
      <form class="formulaire" @submit.prevent="creerRequirement">
        <label>
          Référence
          <input v-model="refRequirement" type="text" required placeholder="ex. URS-001" />
        </label>
        <label>
          Titre
          <input v-model="titreRequirement" type="text" required />
        </label>
        <label>
          Description
          <textarea v-model="descriptionRequirement" rows="2" />
        </label>
        <label>
          Nœud Structure Système (optionnel)
          <select v-model="assetNodeRequirement">
            <option value="">— aucun —</option>
            <option v-for="noeud in structureStore.noeuds" :key="noeud.id" :value="noeud.id">
              {{ noeud.name }} ({{ noeud.code }})
            </option>
          </select>
        </label>
        <button type="submit">Créer l'exigence</button>
      </form>
      <ul v-if="testStore.requirements.length > 0">
        <li v-for="r in testStore.requirements" :key="r.id">
          <strong>{{ r.reference }}</strong> — {{ r.titre }}
          <ul v-if="couvertureRisques(r.id).length > 0" class="liste-couverture-risques">
            <li
              v-for="risque in couvertureRisques(r.id)"
              :key="risque.risk_assessment_id"
              :class="risque.statut === 'non_couvert' ? 'risque-non-couvert' : 'risque-couvert'"
            >
              {{ risque.statut === 'non_couvert' ? '⚠' : '✓' }} {{ risque.mode_defaillance }} —
              {{ risque.statut === 'non_couvert' ? 'non couvert par un test' : 'couvert' }}
            </li>
          </ul>
        </li>
      </ul>
      <p v-else>Aucune exigence pour l'instant.</p>
    </section>

    <section class="bloc-objectifs">
      <h2>Objectifs de test</h2>
      <form class="formulaire" @submit.prevent="creerObjectif">
        <label>
          Exigence
          <select v-model="requirementSelectionne" required>
            <option value="">— choisir —</option>
            <option v-for="r in testStore.requirements" :key="r.id" :value="r.id">
              {{ r.reference }} — {{ r.titre }}
            </option>
          </select>
        </label>
        <label>
          Titre de l'objectif
          <input v-model="titreObjectif" type="text" required />
        </label>
        <label>
          Description
          <textarea v-model="descriptionObjectif" rows="2" />
        </label>
        <button type="submit">Ajouter l'objectif</button>
      </form>
      <ul v-if="testStore.testObjectives.length > 0">
        <li v-for="o in testStore.testObjectives" :key="o.id">
          {{ o.titre }} <span class="meta">({{ libelleRequirement(o.requirement_id) }})</span>
          <button type="button" class="bouton-secondaire" @click="genererDepuisRisques(o.id)">
            Proposer des candidats depuis les risques
          </button>
          <p v-if="messageGenerationParObjectif[o.id]" class="message-generation">
            {{ messageGenerationParObjectif[o.id] }}
          </p>
        </li>
      </ul>
      <p v-else>Aucun objectif pour l'instant.</p>
    </section>

    <section class="bloc-candidats">
      <h2>Candidats de test</h2>
      <form class="formulaire" @submit.prevent="creerCandidat">
        <label>
          Objectif de test
          <select v-model="objectifSelectionne" required>
            <option value="">— choisir —</option>
            <option v-for="o in testStore.testObjectives" :key="o.id" :value="o.id">
              {{ o.titre }}
            </option>
          </select>
        </label>
        <label>
          Titre du candidat
          <input v-model="titreCandidat" type="text" required />
        </label>
        <label>
          Description
          <textarea v-model="descriptionCandidat" rows="2" />
        </label>
        <button type="submit">Proposer le candidat</button>
      </form>
      <ul v-if="testStore.testCandidates.length > 0" class="liste-candidats">
        <li v-for="c in testStore.testCandidates" :key="c.id">
          <p>
            {{ c.titre }} <span class="meta">({{ libelleObjectif(c.test_objective_id) }})</span> —
            <strong>{{ LIBELLES_STATUT_CANDIDATE[c.statut] }}</strong>
            <span v-if="c.risk_assessment_id" class="badge-origine-risque"
              >proposé depuis l'analyse de risque</span
            >
          </p>
          <template
            v-if="
              c.statut === 'propose' ||
              c.statut === 'besoin_information' ||
              c.statut === 'besoin_revue'
            "
          >
            <button type="button" @click="accepter(c.id)">Accepter</button>
            <input
              v-model="motifsParCandidat[c.id]"
              type="text"
              placeholder="Motif (rejet / besoin d'information)"
            />
            <button type="button" @click="rejeter(c.id)">Rejeter</button>
            <button type="button" @click="besoinInformation(c.id)">Besoin d'information</button>
          </template>
        </li>
      </ul>
      <p v-else>Aucun candidat pour l'instant.</p>
    </section>

    <section class="bloc-tests">
      <h2>Tests</h2>
      <form class="formulaire" @submit.prevent="creerTest">
        <label>
          Candidat accepté
          <select v-model="candidatSelectionne" required>
            <option value="">— choisir —</option>
            <option v-for="c in candidatsAcceptes" :key="c.id" :value="c.id">{{ c.titre }}</option>
          </select>
        </label>
        <label>
          Titre du test
          <input v-model="titreTest" type="text" required />
        </label>
        <label>
          Description
          <textarea v-model="descriptionTest" rows="2" />
        </label>
        <fieldset class="etapes">
          <legend>Étapes</legend>
          <div v-for="(etape, index) in etapesBrouillon" :key="index" class="ligne-etape">
            <input v-model="etape.action" type="text" placeholder="Action" />
            <input v-model="etape.resultatAttendu" type="text" placeholder="Résultat attendu" />
            <button type="button" @click="retirerEtape(index)">Retirer</button>
          </div>
          <button type="button" @click="ajouterEtape">+ Ajouter une étape</button>
        </fieldset>
        <p v-if="erreurCreationTest" class="bandeau-erreur" role="alert">
          {{ erreurCreationTest }}
        </p>
        <button type="submit">Créer le test</button>
      </form>
      <ul v-if="testStore.tests.length > 0" class="liste-tests">
        <li v-for="t in testStore.tests" :key="t.id">
          {{ t.titre }} —
          <strong>{{ t.statut === 'approuve' ? 'Approuvé' : 'Brouillon' }}</strong> ({{
            t.etapes.length
          }}
          étape(s))
          <button v-if="t.statut === 'brouillon'" type="button" @click="approuverTest(t.id)">
            Approuver
          </button>
        </li>
      </ul>
      <p v-else>Aucun test pour l'instant.</p>
    </section>

    <section class="bloc-couverture">
      <h2>Couverture (traçabilité)</h2>
      <form class="formulaire" @submit.prevent="declarerCouverture">
        <label>
          Exigence
          <select v-model="requirementCouverture" required>
            <option value="">— choisir —</option>
            <option v-for="r in testStore.requirements" :key="r.id" :value="r.id">
              {{ r.reference }} — {{ r.titre }}
            </option>
          </select>
        </label>
        <label>
          Test approuvé
          <select v-model="testCouverture" required>
            <option value="">— choisir —</option>
            <option v-for="t in testsApprouves" :key="t.id" :value="t.id">{{ t.titre }}</option>
          </select>
        </label>
        <button type="submit">Déclarer la couverture</button>
      </form>
      <ul v-if="testStore.couvertures.length > 0">
        <li v-for="c in testStore.couvertures" :key="c.id">
          {{ libelleRequirement(c.requirement_id) }} couvert par «
          {{ testStore.tests.find((t) => t.id === c.test_id)?.titre ?? c.test_id }} »
        </li>
      </ul>
      <p v-else>Aucune couverture déclarée.</p>
    </section>
  </main>
</template>

<style scoped>
.definition-tests {
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

.etapes {
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.25rem;
  padding: 0.75rem;
}

.ligne-etape {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.liste-candidats li,
.liste-tests li {
  margin-bottom: 0.5rem;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

button {
  cursor: pointer;
}

.liste-couverture-risques {
  list-style: none;
  padding-left: 1rem;
  margin: 0.25rem 0 0;
  font-size: 0.85em;
}

.risque-non-couvert {
  color: var(--vp-danger);
}

.risque-couvert {
  color: var(--vp-texte-secondaire);
}

.bouton-secondaire {
  margin-left: 0.5rem;
  font-size: 0.85em;
}

.message-generation {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
  margin: 0.25rem 0 0;
}

.badge-origine-risque {
  color: var(--vp-marque, #5b3df5);
  font-size: 0.8em;
  font-style: italic;
  margin-left: 0.4rem;
}
</style>

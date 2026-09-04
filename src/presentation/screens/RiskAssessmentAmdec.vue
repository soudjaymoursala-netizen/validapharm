<script setup lang="ts">
// Écran Risk Assessment / AMDEC autonome (Phase 29 de convergence
// architecturale, TD-027) — gap trouvé en poursuivant l'inventaire de
// §5.31 CONTEXTE-REPRISE-SESSION.md : le domaine, la persistance et le
// store existaient sans aucun écran ; seul le petit tableau S×O×D intégré
// au gabarit DQ était utilisable, pas la vraie méthodologie AMDEC
// versionnée par client.
import { computed, onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useParameterStore } from '../stores/useParameterStore'
import { useRiskAssessmentStore } from '../stores/useRiskAssessmentStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { OrigineMethodeRiskAssessment } from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const parameterStore = useParameterStore()
const riskStore = useRiskAssessmentStore()

const nomClient = ref<string | null>(null)
const formulaireConfigOuvert = ref(false)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await structureStore.charger(props.clientId)
  await parameterStore.charger(props.clientId)
  await riskStore.charger(props.clientId)
  if (!riskStore.profilActif) formulaireConfigOuvert.value = true
})

const LIBELLES_VERDICT: Record<string, string> = {
  acceptable: 'Acceptable',
  action_requise: 'Action requise',
}

// --- Configuration du profil (échelle S×O×D + seuil) ---
const echelleMin = ref(1)
const echelleMax = ref(5)
const seuilAction = ref(50)
const source = ref('')
const origin = ref<OrigineMethodeRiskAssessment>('defini_utilisateur')

async function enregistrerNouvelleVersion(): Promise<void> {
  if (source.value.trim().length === 0) return
  await riskStore.creerNouvelleVersion(props.clientId, {
    echelleMin: echelleMin.value,
    echelleMax: echelleMax.value,
    seuilAction: seuilAction.value,
    source: source.value.trim(),
    origin: origin.value,
  })
  source.value = ''
  formulaireConfigOuvert.value = false
}

// --- Nouvelle ligne AMDEC ---
const assetNodeSelectionne = ref('')
const parameterSelectionne = ref('')
const etapeProcessus = ref('')
const modeDefaillance = ref('')
const effetDefaillance = ref('')
const causePotentielle = ref('')
const controleActuel = ref('')
const severiteInitiale = ref<number | null>(null)
const occurrenceInitiale = ref<number | null>(null)
const detectabiliteInitiale = ref<number | null>(null)
const erreurCreation = ref<string | null>(null)

async function creerEvaluation(): Promise<void> {
  erreurCreation.value = null
  if (etapeProcessus.value.trim().length === 0 || modeDefaillance.value.trim().length === 0) return
  const resultat = await riskStore.creerEvaluation(props.clientId, {
    assetNodeId: assetNodeSelectionne.value || null,
    parameterId: parameterSelectionne.value || null,
    etapeProcessus: etapeProcessus.value.trim(),
    modeDefaillance: modeDefaillance.value.trim(),
    effetDefaillance: effetDefaillance.value.trim(),
    causePotentielle: causePotentielle.value.trim(),
    controleActuel: controleActuel.value.trim(),
    severiteInitiale: severiteInitiale.value,
    occurrenceInitiale: occurrenceInitiale.value,
    detectabiliteInitiale: detectabiliteInitiale.value,
  })
  if ('erreur' in resultat) {
    erreurCreation.value = 'Aucun profil de méthode configuré.'
    return
  }
  assetNodeSelectionne.value = ''
  parameterSelectionne.value = ''
  etapeProcessus.value = ''
  modeDefaillance.value = ''
  effetDefaillance.value = ''
  causePotentielle.value = ''
  controleActuel.value = ''
  severiteInitiale.value = null
  occurrenceInitiale.value = null
  detectabiliteInitiale.value = null
}

// --- Action résiduelle ---
const recommandationBrouillon = ref<Record<string, string>>({})
const responsableBrouillon = ref<Record<string, string>>({})
const severiteResiduelleBrouillon = ref<Record<string, number | null>>({})
const occurrenceResiduelleBrouillon = ref<Record<string, number | null>>({})
const detectabiliteResiduelleBrouillon = ref<Record<string, number | null>>({})

async function enregistrerAction(riskAssessmentId: string): Promise<void> {
  await riskStore.enregistrerActionResiduelle(props.clientId, riskAssessmentId, {
    recommandation: recommandationBrouillon.value[riskAssessmentId]?.trim() || null,
    responsable: responsableBrouillon.value[riskAssessmentId]?.trim() || null,
    dateCible: null,
    actionsMenees: null,
    severiteResiduelle: severiteResiduelleBrouillon.value[riskAssessmentId] ?? null,
    occurrenceResiduelle: occurrenceResiduelleBrouillon.value[riskAssessmentId] ?? null,
    detectabiliteResiduelle: detectabiliteResiduelleBrouillon.value[riskAssessmentId] ?? null,
  })
}

function libelleAssetNode(assetNodeId: string | null): string {
  if (!assetNodeId) return '—'
  const noeud = structureStore.noeuds.find((n) => n.id === assetNodeId)
  return noeud ? `${noeud.name} (${noeud.code})` : assetNodeId
}

const evaluationsTriees = computed(() =>
  [...riskStore.evaluations].sort((a, b) => b.created_at.localeCompare(a.created_at)),
)
</script>

<template>
  <main class="risk-assessment">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Risk Assessment / AMDEC — {{ nomClient ?? props.clientId }}</h1>
    <p class="rappel">
      L'IPR est calculé mais jamais autoritatif à lui seul — le verdict reste une aide à la
      décision, cohérent avec la méthodologie AMDEC du client (ICH Q9).
    </p>

    <section v-if="!riskStore.profilActif || formulaireConfigOuvert" class="bloc-config">
      <h2>Configuration du profil de méthode</h2>
      <p v-if="!riskStore.profilActif" class="rappel" role="alert">
        Aucun profil AMDEC n'est configuré pour ce client. Renseignez l'échelle réelle S×O×D et le
        seuil d'action de la méthodologie du client.
      </p>
      <form class="formulaire" @submit.prevent="enregistrerNouvelleVersion">
        <label>
          Source
          <input v-model="source" type="text" required placeholder="ex. Processus_AMDEC.xlsx" />
        </label>
        <label>
          Origine
          <select v-model="origin">
            <option value="procedure_client">Procédure client</option>
            <option value="defini_utilisateur">Défini avec l'utilisateur</option>
            <option value="baseline_validapharm">Baseline ValidaPharm</option>
          </select>
        </label>
        <label>
          Échelle minimale
          <input v-model.number="echelleMin" type="number" required />
        </label>
        <label>
          Échelle maximale
          <input v-model.number="echelleMax" type="number" required />
        </label>
        <label>
          Seuil d'action (IPR)
          <input v-model.number="seuilAction" type="number" required />
        </label>
        <div class="actions">
          <button
            v-if="riskStore.profilActif"
            type="button"
            @click="formulaireConfigOuvert = false"
          >
            Annuler
          </button>
          <button type="submit">Enregistrer cette version</button>
        </div>
      </form>
    </section>

    <template v-else>
      <section class="bloc-nouvelle-ligne">
        <h2>
          Nouvelle ligne AMDEC — {{ riskStore.profilActif.source }} ({{
            riskStore.profilActif.version
          }})
        </h2>
        <button type="button" class="lien-config" @click="formulaireConfigOuvert = true">
          Configurer une nouvelle version du profil
        </button>
        <form class="formulaire" @submit.prevent="creerEvaluation">
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
            Paramètre (optionnel)
            <select v-model="parameterSelectionne">
              <option value="">— aucun —</option>
              <option v-for="p in parameterStore.parametres" :key="p.id" :value="p.id">
                {{ p.nom }}
              </option>
            </select>
          </label>
          <label>
            Étape du processus
            <input v-model="etapeProcessus" type="text" required />
          </label>
          <label>
            Mode de défaillance
            <input v-model="modeDefaillance" type="text" required />
          </label>
          <label>
            Effet de la défaillance
            <input v-model="effetDefaillance" type="text" />
          </label>
          <label>
            Cause potentielle
            <input v-model="causePotentielle" type="text" />
          </label>
          <label>
            Contrôle actuel
            <input v-model="controleActuel" type="text" />
          </label>
          <label>
            Sévérité initiale
            <input v-model.number="severiteInitiale" type="number" />
          </label>
          <label>
            Occurrence initiale
            <input v-model.number="occurrenceInitiale" type="number" />
          </label>
          <label>
            Détectabilité initiale
            <input v-model.number="detectabiliteInitiale" type="number" />
          </label>
          <p v-if="erreurCreation" class="bandeau-erreur" role="alert">{{ erreurCreation }}</p>
          <button type="submit">Créer la ligne</button>
        </form>
      </section>
    </template>

    <section v-if="evaluationsTriees.length > 0" class="bloc-evaluations">
      <h2>Lignes AMDEC</h2>
      <ul class="liste-evaluations">
        <li v-for="e in evaluationsTriees" :key="e.id" class="carte-evaluation">
          <p>
            <strong>{{ e.mode_defaillance }}</strong> — {{ e.etape_processus }} —
            {{ libelleAssetNode(e.asset_node_id) }}
          </p>
          <p class="meta">
            IPR initial : <strong>{{ e.ipr_initial ?? '—' }}</strong> — Verdict :
            <strong>{{ e.verdict_initial ? LIBELLES_VERDICT[e.verdict_initial] : '—' }}</strong>
          </p>
          <template v-if="e.ipr_residuel === null">
            <div class="ligne-formulaire">
              <input
                v-model="recommandationBrouillon[e.id]"
                type="text"
                placeholder="Recommandation"
              />
              <input v-model="responsableBrouillon[e.id]" type="text" placeholder="Responsable" />
              <input
                v-model.number="severiteResiduelleBrouillon[e.id]"
                type="number"
                placeholder="S résiduelle"
              />
              <input
                v-model.number="occurrenceResiduelleBrouillon[e.id]"
                type="number"
                placeholder="O résiduelle"
              />
              <input
                v-model.number="detectabiliteResiduelleBrouillon[e.id]"
                type="number"
                placeholder="D résiduelle"
              />
              <button type="button" @click="enregistrerAction(e.id)">
                Enregistrer l'action résiduelle
              </button>
            </div>
          </template>
          <p v-else class="meta">
            IPR résiduel : <strong>{{ e.ipr_residuel }}</strong> — Verdict résiduel :
            <strong>{{ e.verdict_residuel ? LIBELLES_VERDICT[e.verdict_residuel] : '—' }}</strong>
          </p>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.risk-assessment {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 52rem;
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
input[type='number'],
select {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.lien-config {
  background: none;
  color: var(--vp-marque, #4338ca);
  border: none;
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
}

.carte-evaluation {
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.ligne-formulaire {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.5rem;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

button {
  cursor: pointer;
}
</style>

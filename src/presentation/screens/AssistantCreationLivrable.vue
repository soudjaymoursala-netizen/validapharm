<script setup lang="ts">
// Assistant guidé de création de livrable (§4.32 — chaîne assemblée à
// partir des capacités déjà construites séparément : Architecture
// [Structure Système], Process, Procédures [catégorisées CQV/CSV/
// Production, tâche #114], Risques [AMDEC], Méthode [ACFC/AMDEC],
// précédents [autres sections du même type chez ce client]. Chaque étape
// affiche des données réelles déjà persistées ailleurs. La procédure et le
// nœud Structure Système effectivement sélectionnés à l'étape 3/5 sont
// désormais de vrais liens structurels (`Section.procedure_id`/
// `asset_node_id`, tâche #118) — jusqu'ici seule une phrase dans
// `Section.audit_log` (texte non exploitable pour une navigation retour
// depuis `RevueStructureProcedure.vue`/`DossierVivantActif.vue`) en gardait
// trace ; la méthode/les précédents restent, eux, sans champ structurel
// dédié et continuent de n'être journalisés qu'en texte. Vision
// utilisateur : "Context First" — les sections ne sont jamais des silos
// indépendants.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../../persistance/db'
import type { Project, TemplateType } from '../../logique-metier/domaine/types'
import { useClientsStore } from '../stores/useClientsStore'
import { useMethodProfileACFCStore } from '../stores/useMethodProfileACFCStore'
import { useProcedureStore } from '../stores/useProcedureStore'
import { useProcessContextStore } from '../stores/useProcessContextStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { useRiskAssessmentStore } from '../stores/useRiskAssessmentStore'
import { useSectionsStore } from '../stores/useSectionsStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'

defineOptions({ name: 'EcranAssistantCreationLivrable' })
const props = defineProps<{ projectId: string }>()

const router = useRouter()
const clientsStore = useClientsStore()
const projetsStore = useProjectsStore()
const structureStore = useStructureSystemeStore()
const processStore = useProcessContextStore()
const procedureStore = useProcedureStore()
const riskStore = useRiskAssessmentStore()
const methodStore = useMethodProfileACFCStore()
const sectionsStore = useSectionsStore()

const projet = ref<Project | undefined>(undefined)
const nomClient = ref<string | null>(null)
const chargementTermine = ref(false)

// Catalogue restreint à ce qui est réellement exploitable par la machine à
// états et les garde-fous (même liste que FicheProjet.vue — URS §10).
const CATALOGUE_DISPONIBLE: readonly TemplateType[] = [
  'contexte_procede',
  'urs',
  'dq',
  'fat',
  'sat',
  'iq',
  'oq',
  'pq',
  'validation_procede',
  'plan_metrologie',
  'plan_maintenance',
]

const ETAPES = [
  'type',
  'contexte',
  'architecture',
  'process',
  'procedure',
  'risques',
  'methode',
  'precedents',
  'generation',
] as const
type Etape = (typeof ETAPES)[number]
const etapeCourante = ref<Etape>('type')
const indexEtape = computed(() => ETAPES.indexOf(etapeCourante.value))

const templateChoisi = ref<TemplateType | null>(null)
const titreLivrable = ref('')
const noeudSelectionneId = ref<string>('')
const procedureSelectionneeId = ref<string>('')
const precedents = ref<
  Array<{ id: string; projectId: string; projectName: string; titre: string }>
>([])
const enGeneration = ref(false)

onMounted(async () => {
  projet.value = await projetsStore.obtenirProjet(props.projectId)
  if (!projet.value) return
  const client = await clientsStore.obtenirClient(projet.value.client_id ?? '')
  nomClient.value = client?.name ?? null

  const clientId = projet.value.client_id
  if (clientId) {
    await Promise.all([
      structureStore.charger(clientId),
      processStore.charger(clientId),
      procedureStore.charger(clientId),
      riskStore.charger(clientId),
      methodStore.charger(clientId),
    ])
  }
  chargementTermine.value = true
})

function suivant(): void {
  const i = indexEtape.value
  const prochaine = ETAPES[i + 1]
  if (prochaine) etapeCourante.value = prochaine
}
function precedent(): void {
  const i = indexEtape.value
  const precedente = ETAPES[i - 1]
  if (precedente) etapeCourante.value = precedente
}

const procedurePertinentes = computed(() => procedureStore.procedures)
const evaluationsRisque = computed(() => riskStore.evaluations)
const verdictsAVerifier = computed(
  () => evaluationsRisque.value.filter((e) => e.verdict_initial === 'action_requise').length,
)

async function chargerPrecedents(): Promise<void> {
  if (!templateChoisi.value || !projet.value?.client_id) {
    precedents.value = []
    return
  }
  const projetsDuClient = await db.projects
    .where('client_id')
    .equals(projet.value.client_id)
    .toArray()
  const idsProjetsDuClient = new Set(projetsDuClient.map((p) => p.id))
  const sectionsMemeType = await db.sections
    .where('template_type')
    .equals(templateChoisi.value)
    .toArray()
  precedents.value = sectionsMemeType
    .filter((s) => idsProjetsDuClient.has(s.project_id) && s.project_id !== props.projectId)
    .map((s) => ({
      id: s.id,
      projectId: s.project_id,
      projectName: projetsDuClient.find((p) => p.id === s.project_id)?.name ?? s.project_id,
      titre: s.meta.titre,
    }))
}

async function allerAPrecedents(): Promise<void> {
  await chargerPrecedents()
  suivant()
}

function libelleProcedure(procedureId: string): string {
  const p = procedureStore.procedures.find((p) => p.id === procedureId)
  return p ? `${p.reference} — ${p.titre}` : procedureId
}

function libelleNoeud(noeudId: string): string {
  const n = structureStore.noeuds.find((n) => n.id === noeudId)
  return n ? `${n.name} (${n.code})` : noeudId
}

async function genererLivrable(depuisDocument: boolean): Promise<void> {
  if (!templateChoisi.value || titreLivrable.value.trim().length === 0 || !projet.value) return
  enGeneration.value = true
  try {
    const section = await sectionsStore.creerSection({
      project_id: props.projectId,
      template_type: templateChoisi.value,
      language: projet.value.language_default,
      titre: titreLivrable.value.trim(),
      owner_id: projetsStore.identiteCourante,
      procedure_id: procedureSelectionneeId.value || null,
      asset_node_id: noeudSelectionneId.value || null,
    })

    const elementsContexte: string[] = []
    if (procedureSelectionneeId.value) {
      elementsContexte.push(
        `procédure ${libelleProcedure(procedureSelectionneeId.value)} (lien structurel)`,
      )
    }
    if (noeudSelectionneId.value) {
      elementsContexte.push(
        `nœud Structure Système ${libelleNoeud(noeudSelectionneId.value)} (lien structurel)`,
      )
    }
    if (methodStore.profilActif)
      elementsContexte.push(`méthode ACFC ${methodStore.profilActif.version}`)
    if (riskStore.profilActif)
      elementsContexte.push(`méthode AMDEC ${riskStore.profilActif.version}`)
    if (precedents.value.length > 0) {
      elementsContexte.push(`${precedents.value.length} précédent(s) du même type consulté(s)`)
    }
    if (elementsContexte.length > 0) {
      await sectionsStore.journaliserContexteAssemble(section.id, elementsContexte.join(', '))
    }

    await router.push({
      name: 'editeur-section',
      params: { projectId: props.projectId, sectionId: section.id },
      query: depuisDocument ? { demarrage: 'adaptation' } : {},
    })
  } finally {
    enGeneration.value = false
  }
}
</script>

<template>
  <main v-if="chargementTermine && projet" class="assistant-livrable">
    <RouterLink
      :to="{ name: 'fiche-projet', params: { projectId: props.projectId } }"
      class="lien-retour"
    >
      {{ projet.name }}
    </RouterLink>
    <h1>Assistant guidé — Nouveau livrable</h1>
    <p class="rappel">
      Un livrable n'est jamais créé dans un silo : cet assistant rassemble le contexte réellement
      disponible (architecture, process, procédures, risques, méthode, précédents) avant de vous
      amener à la rédaction — rien n'est jamais généré automatiquement sans revue humaine.
    </p>

    <ol class="fil-etapes">
      <li
        v-for="(etape, i) in ETAPES"
        :key="etape"
        :class="{ actif: i === indexEtape, complete: i < indexEtape }"
      >
        {{ i + 1 }}
      </li>
    </ol>

    <section v-if="etapeCourante === 'type'" class="carte etape">
      <h2>1. Quel type de livrable ?</h2>
      <label>
        Titre du livrable
        <input v-model="titreLivrable" type="text" required placeholder="ex. OQ Malaxeur M-300" />
      </label>
      <label>
        Gabarit
        <select v-model="templateChoisi">
          <option :value="null">— choisir —</option>
          <option v-for="type in CATALOGUE_DISPONIBLE" :key="type" :value="type">{{ type }}</option>
        </select>
      </label>
      <div class="actions">
        <button
          type="button"
          :disabled="!templateChoisi || titreLivrable.trim().length === 0"
          @click="suivant"
        >
          Suivant
        </button>
      </div>
    </section>

    <section v-else-if="etapeCourante === 'contexte'" class="carte etape">
      <h2>2. Contexte du projet</h2>
      <dl>
        <dt>Contexte</dt>
        <dd>{{ projet.context || '—' }}</dd>
        <dt>Portée incluse</dt>
        <dd>{{ projet.scope_in || '—' }}</dd>
        <dt>Portée exclue</dt>
        <dd>{{ projet.scope_out || '—' }}</dd>
      </dl>
      <div class="actions">
        <button type="button" @click="precedent">Précédent</button>
        <button type="button" @click="suivant">Suivant</button>
      </div>
    </section>

    <section v-else-if="etapeCourante === 'architecture'" class="carte etape">
      <h2>3. Architecture associée — {{ nomClient }}</h2>
      <p v-if="structureStore.noeuds.length === 0" class="etat-vide">
        Aucun actif défini pour ce site pour l'instant.
      </p>
      <label v-else>
        Nœud lié (facultatif) — lien structurel réel, retrouvable depuis son dossier vivant
        <select v-model="noeudSelectionneId">
          <option value="">— aucun —</option>
          <option v-for="n in structureStore.noeuds" :key="n.id" :value="n.id">
            {{ n.name }} ({{ n.code }})
          </option>
        </select>
      </label>
      <div class="actions">
        <button type="button" @click="precedent">Précédent</button>
        <button type="button" @click="suivant">Suivant</button>
      </div>
    </section>

    <section v-else-if="etapeCourante === 'process'" class="carte etape">
      <h2>4. Process associé — {{ nomClient }}</h2>
      <p v-if="processStore.processes.length === 0" class="etat-vide">
        Aucun process défini pour ce site pour l'instant.
      </p>
      <ul v-else>
        <li v-for="p in processStore.processes" :key="p.id">{{ p.nom }}</li>
      </ul>
      <div class="actions">
        <button type="button" @click="precedent">Précédent</button>
        <button type="button" @click="suivant">Suivant</button>
      </div>
    </section>

    <section v-else-if="etapeCourante === 'procedure'" class="carte etape">
      <h2>5. Procédure applicable</h2>
      <p v-if="procedurePertinentes.length === 0" class="etat-vide">
        Aucune procédure enregistrée pour ce site pour l'instant.
      </p>
      <label v-else>
        Procédure liée (facultatif) — lien structurel réel, retrouvable depuis la fiche procédure
        <select v-model="procedureSelectionneeId">
          <option value="">— aucune —</option>
          <option v-for="p in procedurePertinentes" :key="p.id" :value="p.id">
            [{{ p.categorie }}] {{ p.reference }} — {{ p.titre }}
          </option>
        </select>
      </label>
      <div class="actions">
        <button type="button" @click="precedent">Précédent</button>
        <button type="button" @click="suivant">Suivant</button>
      </div>
    </section>

    <section v-else-if="etapeCourante === 'risques'" class="carte etape">
      <h2>6. Risques pertinents</h2>
      <p v-if="evaluationsRisque.length === 0" class="etat-vide">
        Aucune évaluation de risque enregistrée pour ce site pour l'instant.
      </p>
      <p v-else>
        {{ evaluationsRisque.length }} évaluation(s) AMDEC enregistrée(s), dont
        {{ verdictsAVerifier }} nécessitant une action.
      </p>
      <div class="actions">
        <button type="button" @click="precedent">Précédent</button>
        <button type="button" @click="suivant">Suivant</button>
      </div>
    </section>

    <section v-else-if="etapeCourante === 'methode'" class="carte etape">
      <h2>7. Méthode en vigueur</h2>
      <p v-if="!methodStore.profilActif && !riskStore.profilActif" class="etat-vide">
        Aucune méthodologie configurée pour ce site pour l'instant.
      </p>
      <ul v-else>
        <li v-if="methodStore.profilActif">
          Méthode ACFC — version {{ methodStore.profilActif.version }}
        </li>
        <li v-if="riskStore.profilActif">
          Méthode AMDEC — version {{ riskStore.profilActif.version }}
        </li>
      </ul>
      <div class="actions">
        <button type="button" @click="precedent">Précédent</button>
        <button type="button" @click="allerAPrecedents">Suivant</button>
      </div>
    </section>

    <section v-else-if="etapeCourante === 'precedents'" class="carte etape">
      <h2>8. Précédents pertinents</h2>
      <p v-if="precedents.length === 0" class="etat-vide">
        Aucun autre livrable de ce type chez ce client pour l'instant.
      </p>
      <ul v-else>
        <li v-for="p in precedents" :key="p.id">{{ p.titre }} — projet « {{ p.projectName }} »</li>
      </ul>
      <div class="actions">
        <button type="button" @click="precedent">Précédent</button>
        <button type="button" @click="suivant">Suivant</button>
      </div>
    </section>

    <section v-else-if="etapeCourante === 'generation'" class="carte etape">
      <h2>9. Génération</h2>
      <p class="rappel">
        La procédure et le nœud Structure Système sélectionnés deviennent des liens structurels
        réels du livrable (retrouvables depuis leurs propres fiches) ; le reste du contexte assemblé
        ci-dessus est tracé dans le journal d'audit du livrable. La rédaction elle-même reste
        entièrement sous contrôle humain (contrôle IA puis contrôle déterministe puis revue humaine,
        comme pour toute section).
      </p>
      <div class="actions">
        <button type="button" @click="precedent">Précédent</button>
        <button type="button" :disabled="enGeneration" @click="genererLivrable(false)">
          Démarrer d'un gabarit vierge
        </button>
        <button type="button" :disabled="enGeneration" @click="genererLivrable(true)">
          Démarrer à partir d'un document
        </button>
      </div>
    </section>
  </main>
  <p v-else>Chargement…</p>
</template>

<style scoped>
.assistant-livrable {
  padding: 2.5rem;
  max-width: 48rem;
  margin: 0 auto;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.lien-retour {
  color: var(--vp-texte-secondaire);
  text-decoration: none;
  font-size: 0.85rem;
  width: fit-content;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
  margin: 0;
}

.fil-etapes {
  display: flex;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.fil-etapes li {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 1px solid var(--vp-bordure);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: var(--vp-texte-secondaire);
}

.fil-etapes li.complete {
  background-color: var(--vp-marque-fond-leger);
  border-color: var(--vp-marque);
  color: var(--vp-marque);
}

.fil-etapes li.actif {
  border-color: var(--vp-marque);
  color: var(--vp-marque);
  font-weight: var(--vp-poids-semibold);
}

.carte {
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  box-shadow: var(--vp-ombre-sm);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.etape h2 {
  margin: 0;
  font-size: 1.1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

input[type='text'],
select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem;
  font-family: inherit;
  color: var(--vp-texte-principal);
}

dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem 1rem;
}

dt {
  color: var(--vp-texte-secondaire);
  font-size: 0.85rem;
}

dd {
  margin: 0;
}

ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.actions {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
}

button {
  cursor: pointer;
  font-family: inherit;
  padding: 0.5rem 1rem;
  border-radius: var(--vp-rayon-sm);
  border: 1px solid var(--vp-bordure);
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-principal);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

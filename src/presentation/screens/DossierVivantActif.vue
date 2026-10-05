<script setup lang="ts">
// Dossier vivant d'un actif — écran
// manquant trouvé le 31/08/2026 en simulant une requalification
// périodique réelle : le commentaire d'en-tête de `StructureSysteme.vue`
// listait lui-même cette absence. **Périmètre de ce premier incrément** :
// agrège les données déjà rattachées à un `AssetNode` par un
// `assetNodeId`/`asset_node_id` explicite (ACFC, Impact Assessment, CSV
// Assessment, Risk Assessment/AMDEC, Missions ancrées, Journal
// d'anomalies, relations techniques) — jamais de section de gabarit liée
// directement à un nœud (aucun champ ne porte ce lien dans le modèle
// actuel, contrairement à ce que décrivait la conception d'origine ; corrigé
// honnêtement ici plutôt que simulé).
//
// Journal d'anomalies ajouté le 31/08/2026 (scénario 3, inspection
// simulée) : un constat d'audit lié à cet actif n'apparaissait nulle part
// dans son dossier vivant alors que `QualityEvent.asset_node_id` existe
// au même titre que les autres évaluations agrégées ci-dessus — trouvé
// en consultant réellement l'écran après avoir consigné un constat.
//
// Livrables liés ajoutés (tâche #118) : `Section.asset_node_id` est
// désormais un vrai lien structurel (posé par l'assistant guidé de
// création de livrable ou manuellement depuis `EditeurSection.vue`) —
// referme partiellement la limite documentée ci-dessous ("aucune section
// de gabarit liée à un nœud") : les sections EXPLICITEMENT liées
// apparaissent bien ici désormais ; seule l'absence de lien automatique/
// déduit reste inchangée (toujours une association manuelle explicite).
import { computed, onMounted, ref } from 'vue'
import type { Section } from '../../logique-metier/domaine/types'
import { useClientsStore } from '../stores/useClientsStore'
import { LIBELLES_GABARIT } from '../i18n/libellesGabarit'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import { useMethodProfileACFCStore } from '../stores/useMethodProfileACFCStore'
import { useImpactAssessmentStore } from '../stores/useImpactAssessmentStore'
import { useCSVAssessmentStore } from '../stores/useCSVAssessmentStore'
import { useRiskAssessmentStore } from '../stores/useRiskAssessmentStore'
import { useMissionStore } from '../stores/useMissionStore'
import { useQualityEventStore } from '../stores/useQualityEventStore'
import { useAuthStore } from '../stores/useAuthStore'
import { sectionWireVersDomaine } from '../stores/useSectionsStore'
import { LIBELLES_STATUT_QUALIFICATION } from '../../logique-metier/i18n/libellesStatutQualification'
import {
  libelleVerdictAcfc,
  libelleVerdictImpact,
  tonVerdictAcfc,
  tonVerdictImpact,
} from '../i18n/libellesVerdictQuestionnaire'
import { formaterDateFr } from '../i18n/formaterDate'
import { useParameterStore } from '../stores/useParameterStore'
import { useProcessContextStore } from '../stores/useProcessContextStore'
import { evaluerPeriodicite } from '../../logique-metier/structure-systeme/statutPeriodicite'
import {
  LIBELLES_CONCLUSION,
  type ConclusionStrategieQualification,
} from '../../logique-metier/strategie-qualification/grilleDecision'
import type { VerdictRiskAssessment } from '../../logique-metier/domaine/types'
import BadgeVerdict from '../composants/BadgeVerdict.vue'
import IconeSvg from '../composants/IconeSvg.vue'

const props = defineProps<{ clientId: string; noeudId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const acfcStore = useMethodProfileACFCStore()
const impactStore = useImpactAssessmentStore()
const csvStore = useCSVAssessmentStore()
const riskStore = useRiskAssessmentStore()
const missionStore = useMissionStore()
const qualityEventStore = useQualityEventStore()
const parameterStore = useParameterStore()
const processStore = useProcessContextStore()

const nomClient = ref<string | null>(null)
const sectionsLiees = ref<Section[]>([])
const chargementInitial = ref(true)

async function chargerSectionsLiees(): Promise<void> {
  const authStore = useAuthStore()
  const api = await authStore.client()
  const resultat =
    api && authStore.jeton ? await api.listerToutesLesSections(authStore.jeton) : null
  sectionsLiees.value = (
    resultat?.ok ? resultat.donnees.sections.map(sectionWireVersDomaine) : []
  ).filter((s) => s.asset_node_id === props.noeudId)
}

onMounted(async () => {
  try {
    const client = await clientsStore.obtenirClient(props.clientId)
    nomClient.value = client?.name ?? null
    await Promise.all([
      structureStore.charger(props.clientId),
      acfcStore.charger(props.clientId),
      impactStore.charger(props.clientId),
      csvStore.charger(props.clientId),
      riskStore.charger(props.clientId),
      missionStore.charger(props.clientId),
      qualityEventStore.charger(props.clientId),
      parameterStore.charger(props.clientId),
      processStore.charger(props.clientId),
      chargerSectionsLiees(),
    ])
  } finally {
    chargementInitial.value = false
  }
})

const noeud = computed(() => structureStore.noeuds.find((n) => n.id === props.noeudId) ?? null)

const evaluationsACFC = computed(() =>
  acfcStore.evaluations.filter((e) => e.asset_node_id === props.noeudId),
)
const evaluationsImpact = computed(() =>
  impactStore.evaluations.filter((e) => e.asset_node_id === props.noeudId),
)
const evaluationsCSV = computed(() =>
  csvStore.evaluations.filter((e) => e.asset_node_id === props.noeudId),
)
const evaluationsRisque = computed(() =>
  riskStore.evaluations.filter((e) => e.asset_node_id === props.noeudId),
)
const missionsAncrees = computed(() =>
  missionStore.missions.filter((m) => m.asset_node_id === props.noeudId),
)
const evenementsQualite = computed(() =>
  qualityEventStore.evenements
    .filter((e) => e.asset_node_id === props.noeudId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at)),
)
const chaineTechnique = computed(() => structureStore.chaineTechniqueDepuisNoeud(props.noeudId))

/** Libellé du niveau (« Équipement »), jamais la clé brute (constat 12). */
const libelleNiveau = computed(() => {
  const cle = noeud.value?.level_key
  const niveau = structureStore.schema?.levels.find((l) => l.key === cle)
  return niveau?.label.fr ?? cle ?? ''
})

/**
 * Même calcul que la Structure Système et le Suivi de périodicité
 * (constat 7 : seule fiche muette sur une requalification en retard).
 */
const periodicite = computed(() =>
  noeud.value
    ? evaluerPeriodicite(noeud.value.periodic_qualification, new Date().toISOString())
    : null,
)

const LIBELLES_VERDICT_RISQUE: Record<VerdictRiskAssessment, string> = {
  acceptable: 'Acceptable',
  action_requise: 'Action requise',
}
function tonRisque(verdict: VerdictRiskAssessment | null): 'action' | 'favorable' | 'a_completer' {
  if (verdict === null) return 'a_completer'
  return verdict === 'action_requise' ? 'action' : 'favorable'
}
function libelleRisque(verdict: VerdictRiskAssessment | null): string {
  return verdict ? LIBELLES_VERDICT_RISQUE[verdict] : 'Non calculé'
}
function libelleConclusion(code: string | null): string | null {
  return code ? (LIBELLES_CONCLUSION[code as ConclusionStrategieQualification] ?? code) : null
}

/** Paramètres rattachés à l'actif, avec leur dernière classification (constat 6). */
const parametresRattaches = computed(() =>
  parameterStore.parametres
    .filter((p) => p.asset_node_id === props.noeudId)
    .map((p) => {
      const classification = [...parameterStore.classifications]
        .filter((c) => c.parameter_id === p.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      const cpp = parameterStore.cppsActifs.some((c) => c.parameter_id === p.id)
      return { ...p, niveau: classification?.niveau ?? null, cpp }
    }),
)

/** Fonctions portées par l'actif, et les processus qu'elles servent (constat 24). */
const fonctionsPortees = computed(() => {
  const idsFonctions = new Set(
    processStore.associationsFonctionAssetNode
      .filter((a) => a.asset_node_id === props.noeudId)
      .map((a) => a.function_id),
  )
  return processStore.fonctions
    .filter((fn) => idsFonctions.has(fn.id))
    .map((fn) => ({
      ...fn,
      processes: processStore.associationsFonctionProcess
        .filter((a) => a.function_id === fn.id)
        .map((a) => processStore.processes.find((p) => p.id === a.process_id)?.nom)
        .filter((nom): nom is string => typeof nom === 'string'),
    }))
})

const LIBELLES_TYPE_RELATION: Record<string, string> = {
  controle_par: 'est contrôlé par',
  connecte_a: 'est connecté à',
  heberge_sur: 'est hébergé sur',
}
const LIBELLES_TYPE_QUALITY_EVENT: Record<string, string> = {
  change_control: 'Change Control',
  deviation: 'Déviation / anomalie',
  capa: 'CAPA',
  investigation: 'Investigation',
  audit_finding: "Constat d'audit",
  periodic_review: 'Revue périodique',
}
const LIBELLES_STATUT_QUALITY_EVENT: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  cloture: 'Clôturé',
}
</script>

<template>
  <main class="dossier-vivant">
    <RouterLink
      :to="{ name: 'structure-systeme', params: { clientId: props.clientId } }"
      class="lien-retour"
      >Structure Système</RouterLink
    >
    <template v-if="noeud">
      <h1>Dossier vivant — {{ noeud.name }}</h1>
      <p class="bandeau-disclaimer">
        Agrégation en lecture seule des données déjà rattachées à cet actif — aucune donnée
        fabriquée, uniquement ce qui a été explicitement lié.
      </p>

      <section class="bloc-identite">
        <h2>Identité</h2>
        <dl>
          <dt>Code</dt>
          <dd>{{ noeud.code }}</dd>
          <dt>Niveau</dt>
          <dd>{{ libelleNiveau }}</dd>
          <dt>Statut de qualification</dt>
          <dd>{{ LIBELLES_STATUT_QUALIFICATION[noeud.qualification_status] }}</dd>
          <dt v-if="noeud.periodic_qualification.applicable">Échéance de requalification</dt>
          <dd v-if="noeud.periodic_qualification.applicable">
            {{ formaterDateFr(noeud.periodic_qualification.deadline) || 'non renseignée' }}
            <span v-if="periodicite?.statut === 'en_retard'" class="badge-periodicite en-retard">
              <IconeSvg nom="alerte-triangle" :taille="14" />
              Requalification en retard de {{ -(periodicite.joursRestants ?? 0) }} jour{{
                -(periodicite.joursRestants ?? 0) > 1 ? 's' : ''
              }}
            </span>
            <span
              v-else-if="periodicite?.statut === 'proche_echeance'"
              class="badge-periodicite proche"
            >
              <IconeSvg nom="horloge" :taille="14" />
              Échéance dans {{ periodicite.joursRestants }} jour{{
                (periodicite.joursRestants ?? 0) > 1 ? 's' : ''
              }}
            </span>
          </dd>
        </dl>
      </section>

      <section class="bloc-chaine">
        <h2>Chaîne technique</h2>
        <!-- Le nœud de départ est nommé, chaque maillon mène à son dossier (constat 19). -->
        <p v-if="chaineTechnique.length > 0" class="chaine">
          <strong>{{ noeud.name }}</strong>
          <template v-for="etape in chaineTechnique" :key="etape.relation.id">
            <span class="chaine__relation">
              → {{ LIBELLES_TYPE_RELATION[etape.relation.type_relation] }} →
            </span>
            <RouterLink
              :to="{
                name: 'dossier-vivant-actif',
                params: { clientId: props.clientId, noeudId: etape.noeud.id },
              }"
            >
              {{ etape.noeud.name }}
            </RouterLink>
          </template>
        </p>
        <p v-else class="etat-vide">Aucune relation technique sortante déclarée.</p>
      </section>

      <section class="bloc-evaluations">
        <h2>Évaluations rattachées</h2>
        <p
          v-if="
            evaluationsACFC.length === 0 &&
            evaluationsImpact.length === 0 &&
            evaluationsCSV.length === 0 &&
            evaluationsRisque.length === 0
          "
          class="etat-vide"
        >
          Aucune évaluation rattachée à cet actif pour l'instant.
        </p>
        <ul v-else class="liste-evaluations">
          <li v-for="e in evaluationsACFC" :key="e.id">
            <RouterLink
              :to="{
                name: 'assistant-strategie-qualification',
                params: { clientId: props.clientId },
              }"
            >
              ACFC — {{ e.nom_element }}
            </RouterLink>
            <BadgeVerdict :ton="tonVerdictAcfc(e.verdict)" :texte="libelleVerdictAcfc(e.verdict)" />
            <span v-if="libelleConclusion(e.conclusion)" class="meta">
              Stratégie : {{ libelleConclusion(e.conclusion) }}
            </span>
            <span class="meta">{{ formaterDateFr(e.created_at) }}</span>
          </li>
          <li v-for="e in evaluationsImpact" :key="e.id">
            <RouterLink :to="{ name: 'impact-assessment', params: { clientId: props.clientId } }">
              Impact Assessment — {{ e.nom_element }}
            </RouterLink>
            <BadgeVerdict
              :ton="tonVerdictImpact(e.verdict)"
              :texte="libelleVerdictImpact(e.verdict)"
            />
            <span class="meta">{{ formaterDateFr(e.created_at) }}</span>
          </li>
          <li v-for="e in evaluationsCSV" :key="e.id">
            <RouterLink :to="{ name: 'csv-assessment', params: { clientId: props.clientId } }">
              Computer System Assessment — {{ e.nom_systeme }}
            </RouterLink>
            <span>Catégorie GAMP {{ e.categorie_gamp5 }}</span>
            <span class="meta">{{ formaterDateFr(e.created_at) }}</span>
          </li>
          <li v-for="e in evaluationsRisque" :key="e.id">
            <RouterLink
              :to="{ name: 'risk-assessment-amdec', params: { clientId: props.clientId } }"
            >
              AMDEC — {{ e.mode_defaillance }}
            </RouterLink>
            <span>
              IPR initial {{ e.ipr_initial ?? '—' }}
              <BadgeVerdict
                :ton="tonRisque(e.verdict_initial)"
                :texte="libelleRisque(e.verdict_initial)"
              />
              <template v-if="e.ipr_residuel !== null">
                → IPR résiduel {{ e.ipr_residuel }}
                <BadgeVerdict
                  :ton="tonRisque(e.verdict_residuel)"
                  :texte="libelleRisque(e.verdict_residuel)"
                />
              </template>
            </span>
            <span class="meta">{{ formaterDateFr(e.created_at) }}</span>
          </li>
        </ul>
        <!-- Enchaînement : évaluer cet actif, nœud prérempli (constat 17). -->
        <p class="evaluer-actif">
          Évaluer cet actif :
          <RouterLink
            :to="{
              name: 'impact-assessment',
              params: { clientId: props.clientId },
              query: { noeud: props.noeudId, element: noeud.name },
            }"
            >Impact</RouterLink
          >
          ·
          <RouterLink
            :to="{
              name: 'assistant-strategie-qualification',
              params: { clientId: props.clientId },
              query: { noeud: props.noeudId, element: noeud.name },
            }"
            >ACFC</RouterLink
          >
          ·
          <RouterLink :to="{ name: 'csv-assessment', params: { clientId: props.clientId } }"
            >CSV</RouterLink
          >
          ·
          <RouterLink
            :to="{
              name: 'risk-assessment-amdec',
              params: { clientId: props.clientId },
              query: { noeud: props.noeudId },
            }"
            >AMDEC</RouterLink
          >
        </p>
      </section>

      <section class="bloc-parametres">
        <h2>Paramètres rattachés</h2>
        <ul v-if="parametresRattaches.length > 0" class="liste-evaluations">
          <li v-for="p in parametresRattaches" :key="p.id">
            <RouterLink
              :to="{ name: 'parametres-critiques', params: { clientId: props.clientId } }"
            >
              {{ p.nom }}
            </RouterLink>
            <span v-if="p.unite" class="meta">({{ p.unite }})</span>
            <span v-if="p.niveau" class="etiquette">
              {{ p.niveau === 'critique' ? 'Critique' : 'Important' }}
            </span>
            <span v-if="p.cpp" class="etiquette">CPP</span>
          </li>
        </ul>
        <p v-else class="etat-vide">Aucun paramètre rattaché à cet actif pour l'instant.</p>
      </section>

      <section class="bloc-fonctions">
        <h2>Fonctions portées</h2>
        <ul v-if="fonctionsPortees.length > 0" class="liste-evaluations">
          <li v-for="fn in fonctionsPortees" :key="fn.id">
            <RouterLink :to="{ name: 'gestion-process', params: { clientId: props.clientId } }">
              {{ fn.nom }}
            </RouterLink>
            <span v-if="fn.processes.length > 0" class="meta">
              Processus : {{ fn.processes.join(', ') }}
            </span>
          </li>
        </ul>
        <p v-else class="etat-vide">Aucune fonction rattachée à cet actif pour l'instant.</p>
      </section>

      <section class="bloc-missions">
        <h2>Missions ancrées sur cet actif</h2>
        <ul v-if="missionsAncrees.length > 0" class="liste-missions">
          <li v-for="m in missionsAncrees" :key="m.id">
            <RouterLink
              :to="{
                name: 'mission-workspace',
                params: { clientId: props.clientId, missionId: m.id },
              }"
            >
              {{ m.titre }}
            </RouterLink>
          </li>
        </ul>
        <p v-else class="etat-vide">Aucune mission ancrée sur cet actif pour l'instant.</p>
      </section>

      <section class="bloc-anomalies">
        <h2>Journal d'anomalies rattachées</h2>
        <ul v-if="evenementsQualite.length > 0" class="liste-anomalies">
          <li v-for="e in evenementsQualite" :key="e.id">
            <strong>{{ e.titre }}</strong>
            <span class="meta">
              ({{ LIBELLES_TYPE_QUALITY_EVENT[e.type] }} —
              {{ LIBELLES_STATUT_QUALITY_EVENT[e.statut] }}, {{ formaterDateFr(e.created_at) }})
            </span>
          </li>
        </ul>
        <p v-else class="etat-vide">Aucun événement qualité rattaché à cet actif pour l'instant.</p>
      </section>

      <section class="bloc-livrables">
        <h2>Livrables liés</h2>
        <ul v-if="sectionsLiees.length > 0" class="liste-livrables">
          <li v-for="s in sectionsLiees" :key="s.id">
            <RouterLink
              :to="{
                name: 'editeur-section',
                params: { projectId: s.project_id, sectionId: s.id },
              }"
            >
              {{ s.meta.titre }} ({{ LIBELLES_GABARIT[s.template_type] }})
            </RouterLink>
          </li>
        </ul>
        <p v-else class="etat-vide">
          Aucun livrable explicitement lié à cet actif pour l'instant — le lien se pose depuis
          l'assistant guidé de création ou depuis l'éditeur de la section.
        </p>
      </section>

      <section class="bloc-perimetre">
        <h2>Périmètre non couvert par cet écran</h2>
        <p class="rappel">
          Seules les sections de projet (DQ/FAT/SAT/IQ/OQ/PQ…) explicitement liées à ce nœud
          (assistant guidé ou éditeur de section) apparaissent ci-dessus — aucun lien n'est déduit
          automatiquement (ex. via la chaîne technique ou le procédé associé).
        </p>
      </section>
    </template>
    <p v-else-if="chargementInitial" class="etat-vide">Chargement…</p>
    <p v-else class="etat-vide">Nœud introuvable.</p>
  </main>
</template>

<style scoped>
.dossier-vivant {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 52rem;
}

.bandeau-disclaimer {
  font-style: italic;
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.bloc-identite dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
  margin: 0;
}

.bloc-identite dt {
  color: var(--vp-texte-secondaire);
}

.bloc-identite dd {
  margin: 0;
}

.liste-evaluations,
.liste-missions,
.liste-livrables {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.liste-evaluations li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.75rem;
}

.liste-evaluations li,
.liste-missions li,
.liste-livrables li,
.liste-anomalies li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem 0.75rem;
}

.liste-anomalies {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}
.badge-periodicite {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-left: 0.5rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.85rem;
  font-weight: var(--vp-poids-semibold);
}

.badge-periodicite.en-retard {
  color: var(--vp-danger);
  background-color: var(--vp-danger-fond-leger);
}

.badge-periodicite.proche {
  color: var(--vp-texte-principal);
  border-color: var(--vp-attention);
  background-color: var(--vp-attention-fond-leger);
}

.chaine {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem;
  margin: 0;
}

.chaine__relation {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.evaluer-actif {
  margin: 0.75rem 0 0;
}

.etiquette {
  padding: 0 0.45rem;
  border: 1px solid var(--vp-bordure-forte);
  border-radius: var(--vp-rayon-sm);
  font-size: 0.8rem;
}
</style>

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
import { computed, onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import { useMethodProfileACFCStore } from '../stores/useMethodProfileACFCStore'
import { useImpactAssessmentStore } from '../stores/useImpactAssessmentStore'
import { useCSVAssessmentStore } from '../stores/useCSVAssessmentStore'
import { useRiskAssessmentStore } from '../stores/useRiskAssessmentStore'
import { useMissionStore } from '../stores/useMissionStore'
import { useQualityEventStore } from '../stores/useQualityEventStore'

const props = defineProps<{ clientId: string; noeudId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()
const acfcStore = useMethodProfileACFCStore()
const impactStore = useImpactAssessmentStore()
const csvStore = useCSVAssessmentStore()
const riskStore = useRiskAssessmentStore()
const missionStore = useMissionStore()
const qualityEventStore = useQualityEventStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
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
  ])
})

const noeud = computed(() => structureStore.noeuds.find((n) => n.id === props.noeudId) ?? null)

const LIBELLES_STATUT_QUALIFICATION: Record<string, string> = {
  non_qualifie: 'Non qualifié',
  en_cours_qualification_initiale: 'En cours de qualification initiale',
  qualifie: 'Qualifié',
  qualifie_ecart_ouvert: 'Qualifié — écart ouvert',
  requalification_requise: 'Requalification requise',
  requalification_en_retard: 'Requalification en retard',
  suspendu: 'Suspendu',
  declasse: 'Déclassé',
}

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
          <dd>{{ noeud.level_key }}</dd>
          <dt>Statut de qualification</dt>
          <dd>{{ LIBELLES_STATUT_QUALIFICATION[noeud.qualification_status] }}</dd>
          <dt v-if="noeud.periodic_qualification.applicable">Échéance de requalification</dt>
          <dd v-if="noeud.periodic_qualification.applicable">
            {{ noeud.periodic_qualification.deadline ?? 'non renseignée' }}
          </dd>
        </dl>
      </section>

      <section class="bloc-chaine">
        <h2>Chaîne technique</h2>
        <ol v-if="chaineTechnique.length > 0">
          <li v-for="etape in chaineTechnique" :key="etape.relation.id">
            {{ LIBELLES_TYPE_RELATION[etape.relation.type_relation] }} {{ etape.noeud.name }}
          </li>
        </ol>
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
            ACFC — {{ e.nom_element }} ({{ e.created_at.slice(0, 10) }})
          </li>
          <li v-for="e in evaluationsImpact" :key="e.id">
            Impact Assessment — {{ e.nom_element }} :
            {{ e.verdict === 'impact_direct' ? 'Direct Impact' : 'Not Direct Impact' }}
            ({{ e.created_at.slice(0, 10) }})
          </li>
          <li v-for="e in evaluationsCSV" :key="e.id">
            Computer System Assessment — {{ e.nom_systeme }} : Catégorie GAMP
            {{ e.categorie_gamp5 }} ({{ e.created_at.slice(0, 10) }})
          </li>
          <li v-for="e in evaluationsRisque" :key="e.id">
            Risk Assessment / AMDEC ({{ e.created_at.slice(0, 10) }})
          </li>
        </ul>
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
              {{ LIBELLES_STATUT_QUALITY_EVENT[e.statut] }}, {{ e.created_at.slice(0, 10) }})
            </span>
          </li>
        </ul>
        <p v-else class="etat-vide">Aucun événement qualité rattaché à cet actif pour l'instant.</p>
      </section>

      <section class="bloc-perimetre">
        <h2>Périmètre non couvert par cet écran</h2>
        <p class="rappel">
          Les sections de projet (DQ/FAT/SAT/IQ/OQ/PQ…) ne portent aujourd'hui aucun lien direct
          vers un nœud Structure Système — seul le lien section↔section (garde-fous de finalisation)
          existe. Ce dossier vivant n'agrège donc pas encore les livrables de gabarit ;
          retrouvez-les depuis la fiche du projet concerné.
        </p>
      </section>
    </template>
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
  max-width: 40rem;
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
.liste-missions {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.liste-evaluations li,
.liste-missions li,
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
</style>

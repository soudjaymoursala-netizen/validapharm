<script setup lang="ts">
// Pipeline de qualification guidé (ajouté v20, refonte UX guidée —
// demande explicite de l'utilisateur : "guider l'utilisateur dans
// chaque étape du process"). Affiche l'enchaînement logique des
// gabarits d'un projet de qualification et met en évidence l'étape
// suivante recommandée.
//
// **Ce composant ne fabrique aucune donnée** : le statut de chaque
// étape est dérivé des sections réellement créées dans ce projet
// (aucune section = étape "non démarrée"), jamais une progression
// simulée ou estimée. Les plans de métrologie/maintenance sont
// affichés à part (piste de support, pas une étape séquentielle du
// cycle DQ→PQ — répond aux garde-fous U-01/U-02/U-03, FDS §3.3).
import { computed } from 'vue'
import type { Langue, Section, TemplateType } from '../../logique-metier/domaine/types'
import { libelleStatut } from '../../logique-metier/i18n/libellesStatut'
import IconeSvg from './IconeSvg.vue'

const props = defineProps<{
  sections: Section[]
  langue: Langue
  projectId: string
}>()

const emit = defineEmits<{ 'demarrer-etape': [templateType: TemplateType] }>()

const ETAPES_PIPELINE: ReadonlyArray<{ type: TemplateType; libelle: string }> = [
  { type: 'contexte_procede', libelle: 'Contexte procédé' },
  { type: 'urs', libelle: 'URS' },
  { type: 'dq', libelle: 'DQ' },
  { type: 'fat', libelle: 'FAT' },
  { type: 'sat', libelle: 'SAT' },
  { type: 'iq', libelle: 'IQ' },
  { type: 'oq', libelle: 'OQ' },
  { type: 'pq', libelle: 'PQ' },
  { type: 'validation_procede', libelle: 'Validation procédé' },
]

const PLANS_SUPPORT: ReadonlyArray<{ type: TemplateType; libelle: string }> = [
  { type: 'plan_metrologie', libelle: 'Plan de métrologie' },
  { type: 'plan_maintenance', libelle: 'Plan de maintenance' },
]

// Ordre de priorité pour représenter l'étape par le statut le "plus
// avancé" quand plusieurs sections partagent le même gabarit — jamais
// un statut inventé, seulement le plus avancé de ceux réellement
// présents.
const RANG_STATUT: Record<Section['status'], number> = {
  brouillon_aide: 0,
  propose_par_ia_non_valide: 1,
  en_verification: 2,
  en_approbation: 3,
  valide_en_interne: 4,
}

interface EtapeCalculee {
  type: TemplateType
  libelle: string
  sections: Section[]
  statutRepresentatif: Section['status'] | null
}

function calculerEtape(def: { type: TemplateType; libelle: string }): EtapeCalculee {
  const sectionsDeCeType = props.sections.filter((s) => s.template_type === def.type)
  const statutRepresentatif =
    sectionsDeCeType.length === 0
      ? null
      : sectionsDeCeType.reduce((meilleur, s) =>
          RANG_STATUT[s.status] > RANG_STATUT[meilleur.status] ? s : meilleur,
        ).status
  return { type: def.type, libelle: def.libelle, sections: sectionsDeCeType, statutRepresentatif }
}

const etapes = computed(() => ETAPES_PIPELINE.map(calculerEtape))
const plansSupport = computed(() => PLANS_SUPPORT.map(calculerEtape))

/** Première étape du pipeline principal pas encore validée en interne — la "prochaine étape". */
const etapeRecommandee = computed(
  () => etapes.value.find((e) => e.statutRepresentatif !== 'valide_en_interne') ?? null,
)

function classeEtape(etape: EtapeCalculee): string {
  if (etape.statutRepresentatif === null) return 'non-demarree'
  if (etape.statutRepresentatif === 'valide_en_interne') return 'valide'
  return 'en-cours'
}

function libelleCourtStatut(etape: EtapeCalculee): string {
  if (etape.statutRepresentatif === null) return 'Non démarrée'
  if (etape.statutRepresentatif === 'valide_en_interne') return 'Validée en interne'
  return libelleStatut(etape.statutRepresentatif, props.langue).split(' — ')[0] ?? ''
}
</script>

<template>
  <section class="pipeline-qualification" aria-label="Pipeline de qualification">
    <div v-if="etapeRecommandee" class="bandeau-recommandation">
      <IconeSvg nom="flux" :taille="20" />
      <div>
        <p class="bandeau-recommandation__titre">Prochaine étape recommandée</p>
        <p class="bandeau-recommandation__texte">
          <strong>{{ etapeRecommandee.libelle }}</strong>
          <template v-if="etapeRecommandee.sections.length === 0">
            n'a pas encore été créée pour ce projet.
          </template>
          <template v-else>
            est {{ libelleCourtStatut(etapeRecommandee).toLowerCase() }}.
          </template>
        </p>
      </div>
      <template v-if="etapeRecommandee.sections.length === 0">
        <button
          type="button"
          class="bouton-demarrer"
          @click="emit('demarrer-etape', etapeRecommandee.type)"
        >
          Créer cette section
        </button>
      </template>
      <RouterLink
        v-else
        class="bouton-demarrer"
        :to="{
          name: 'editeur-section',
          params: { projectId, sectionId: etapeRecommandee.sections[0]?.id },
        }"
      >
        Reprendre
      </RouterLink>
    </div>
    <p v-else class="bandeau-recommandation bandeau-recommandation--complet">
      <IconeSvg nom="coche-cercle" :taille="20" />
      Toutes les étapes du pipeline sont validées en interne.
    </p>

    <ol class="etapes">
      <li v-for="(etape, index) in etapes" :key="etape.type" :class="classeEtape(etape)">
        <div v-if="index > 0" class="etape__connecteur" aria-hidden="true"></div>
        <div class="etape__pastille">
          <IconeSvg
            :nom="
              etape.statutRepresentatif === 'valide_en_interne'
                ? 'coche-cercle'
                : 'cercle-pointille'
            "
            :taille="16"
          />
        </div>
        <RouterLink
          v-if="etape.sections.length > 0"
          class="etape__contenu"
          :to="{ name: 'editeur-section', params: { projectId, sectionId: etape.sections[0]?.id } }"
        >
          <span class="etape__libelle">{{ etape.libelle }}</span>
          <span class="etape__statut">{{ libelleCourtStatut(etape) }}</span>
        </RouterLink>
        <button
          v-else
          type="button"
          class="etape__contenu etape__contenu--vide"
          @click="emit('demarrer-etape', etape.type)"
        >
          <span class="etape__libelle">{{ etape.libelle }}</span>
          <span class="etape__statut">Non démarrée</span>
        </button>
      </li>
    </ol>

    <div v-if="plansSupport.some((p) => p.sections.length > 0)" class="plans-support">
      <p class="plans-support__titre">Plans de support (liés, pas séquentiels — FDS §3.3)</p>
      <ul>
        <li v-for="plan in plansSupport" v-show="plan.sections.length > 0" :key="plan.type">
          <RouterLink
            :to="{
              name: 'editeur-section',
              params: { projectId, sectionId: plan.sections[0]?.id },
            }"
          >
            {{ plan.libelle }}
          </RouterLink>
          <span class="etape__statut">{{ libelleCourtStatut(plan) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.pipeline-qualification {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bandeau-recommandation {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque-survol);
  border-radius: var(--vp-rayon);
  padding: 0.9rem 1.1rem;
}

.bandeau-recommandation--complet {
  background-color: var(--vp-succes-fond-leger);
  color: var(--vp-succes);
  font-weight: var(--vp-poids-medium);
  margin: 0;
}

.bandeau-recommandation__titre {
  margin: 0;
  font-size: 0.75rem;
  font-weight: var(--vp-poids-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  opacity: 0.8;
}

.bandeau-recommandation__texte {
  margin: 0.15rem 0 0;
  color: var(--vp-texte-principal);
}

.bouton-demarrer {
  margin-left: auto;
  flex-shrink: 0;
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: var(--vp-poids-medium);
  text-decoration: none;
  cursor: pointer;
  transition: var(--vp-transition);
}

.bouton-demarrer:hover {
  background-color: var(--vp-marque-survol);
}

.etapes {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  overflow-x: auto;
  gap: 0;
}

.etapes li {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 6.5rem;
  padding-top: 0.25rem;
}

.etape__connecteur {
  position: absolute;
  top: 1.15rem;
  right: 50%;
  width: 100%;
  height: 2px;
  background-color: var(--vp-bordure);
  z-index: 0;
}

.etapes li.valide .etape__connecteur {
  background-color: var(--vp-section-valide);
}

.etape__pastille {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background-color: var(--vp-fond-page);
  border: 2px solid var(--vp-bordure);
  color: var(--vp-texte-secondaire);
}

.etapes li.en-cours .etape__pastille {
  border-color: var(--vp-marque);
  color: var(--vp-marque);
}

.etapes li.valide .etape__pastille {
  border-color: var(--vp-section-valide);
  background-color: var(--vp-section-valide-fond);
  color: var(--vp-section-valide);
}

.etape__contenu {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.15rem;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.etape__libelle {
  font-size: 0.82rem;
  font-weight: var(--vp-poids-semibold);
  color: var(--vp-texte-principal);
}

.etape__contenu--vide .etape__libelle {
  color: var(--vp-texte-secondaire);
}

.etape__statut {
  font-size: 0.72rem;
  color: var(--vp-texte-secondaire);
}

.plans-support {
  border-top: 1px dashed var(--vp-bordure);
  padding-top: 0.85rem;
}

.plans-support__titre {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  color: var(--vp-texte-secondaire);
}

.plans-support ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.plans-support li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

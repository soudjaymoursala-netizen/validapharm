<script setup lang="ts">
// Computer System Assessment (F3 du catalogue §10, URS-F-057/057bis) —
// écran manquant trouvé le 29/08/2026 en comparant l'inventaire d'écrans
// réel à celui documenté depuis la FDS v15 (Phase 3, 25/08/2026) : le
// store `useCSVAssessmentStore` existait depuis la Phase 3 sans jamais
// avoir de composant. Contrairement à l'ACFC (F2) et l'Impact Assessment
// (F1), pas de `MethodProfile` : la catégorie GAMP5 est une grille
// normative fixe (PIC/S PI 011-3), jamais configurable par client
// (URS-F-057bis) — sélection directe parmi les 5 valeurs fixes.
import { computed, onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useCSVAssessmentStore } from '../stores/useCSVAssessmentStore'
import type { CategorieGAMP5 } from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const csvStore = useCSVAssessmentStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await csvStore.charger(props.clientId)
})

const LIBELLES_CATEGORIE: Record<CategorieGAMP5, string> = {
  1: 'Catégorie 1 — Infrastructure',
  2: 'Catégorie 2 — Firmware',
  3: 'Catégorie 3 — Logiciel standard non configuré',
  4: 'Catégorie 4 — Logiciel configurable',
  5: 'Catégorie 5 — Sur mesure',
}

const nomSysteme = ref('')
const categorieGamp5 = ref<CategorieGAMP5 | null>(null)
const justificationCategorie = ref('')
const pertinenceGxp = ref<boolean | null>(null)
const pertinenceEresPart11 = ref<boolean | null>(null)
const justificationPertinence = ref('')
const evaluationEnregistree = ref(false)

const formulaireComplet = computed(
  () =>
    nomSysteme.value.trim().length > 0 &&
    categorieGamp5.value !== null &&
    justificationCategorie.value.trim().length > 0 &&
    pertinenceGxp.value !== null &&
    pertinenceEresPart11.value !== null &&
    justificationPertinence.value.trim().length > 0,
)

async function enregistrerEvaluation(): Promise<void> {
  if (!formulaireComplet.value || categorieGamp5.value === null) return
  if (pertinenceGxp.value === null || pertinenceEresPart11.value === null) return
  await csvStore.creerEvaluation(props.clientId, {
    nomSysteme: nomSysteme.value.trim(),
    assetNodeId: null,
    categorieGamp5: categorieGamp5.value,
    justificationCategorie: justificationCategorie.value.trim(),
    pertinenceGxp: pertinenceGxp.value,
    pertinenceEresPart11: pertinenceEresPart11.value,
    justificationPertinence: justificationPertinence.value.trim(),
  })
  evaluationEnregistree.value = true
}

function nouvelleEvaluation(): void {
  nomSysteme.value = ''
  categorieGamp5.value = null
  justificationCategorie.value = ''
  pertinenceGxp.value = null
  pertinenceEresPart11.value = null
  justificationPertinence.value = ''
  evaluationEnregistree.value = false
}
</script>

<template>
  <main class="csv-assessment">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Computer System Assessment — {{ nomClient ?? props.clientId }}</h1>
    <p class="bandeau-disclaimer">
      Aide à la décision, non une décision de classification (URS-F-057).
    </p>

    <section v-if="!evaluationEnregistree" class="bloc-evaluation">
      <form class="formulaire" @submit.prevent="enregistrerEvaluation">
        <label>
          Système évalué
          <input v-model="nomSysteme" type="text" required placeholder="ex. SCADA ligne STICK002" />
        </label>

        <fieldset class="categorie">
          <legend>Catégorie GAMP5 (grille fixe, non modulable par client — URS-F-057bis)</legend>
          <label v-for="n in [1, 2, 3, 4, 5] as CategorieGAMP5[]" :key="n">
            <input v-model.number="categorieGamp5" type="radio" :value="n" />
            {{ LIBELLES_CATEGORIE[n] }}
          </label>
        </fieldset>
        <label>
          Justification de la catégorie
          <textarea v-model="justificationCategorie" required rows="3"></textarea>
        </label>

        <fieldset class="pertinence">
          <legend>Pertinence GxP</legend>
          <label><input v-model="pertinenceGxp" type="radio" :value="true" /> Oui</label>
          <label><input v-model="pertinenceGxp" type="radio" :value="false" /> Non</label>
        </fieldset>

        <fieldset class="pertinence">
          <legend>Pertinence ERES / 21 CFR Part 11</legend>
          <label><input v-model="pertinenceEresPart11" type="radio" :value="true" /> Oui</label>
          <label><input v-model="pertinenceEresPart11" type="radio" :value="false" /> Non</label>
        </fieldset>
        <label>
          Justification de la pertinence GxP/ERES
          <textarea v-model="justificationPertinence" required rows="3"></textarea>
        </label>

        <div class="actions">
          <button type="submit" :disabled="!formulaireComplet">Enregistrer cette évaluation</button>
        </div>
      </form>
    </section>

    <section v-else class="bloc-confirmation">
      <p class="confirmation" role="status">Évaluation enregistrée.</p>
      <button type="button" @click="nouvelleEvaluation">Nouvelle évaluation</button>
    </section>

    <section v-if="csvStore.evaluations.length > 0" class="bloc-historique">
      <h2>Évaluations enregistrées</h2>
      <ul>
        <li v-for="e in csvStore.evaluations" :key="e.id">
          {{ e.nom_systeme }} — {{ LIBELLES_CATEGORIE[e.categorie_gamp5] }}, GxP :
          {{ e.pertinence_gxp ? 'oui' : 'non' }}, ERES/Part 11 :
          {{ e.pertinence_eres_part11 ? 'oui' : 'non' }}
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.csv-assessment {
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

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.formulaire > label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input[type='text'],
textarea {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

.categorie,
.pertinence {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.categorie label,
.pertinence label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

button {
  background-color: var(--vp-marque);
  color: white;
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

.confirmation {
  color: var(--vp-marque);
  font-weight: 600;
}

.bloc-historique ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bloc-historique li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem 0.75rem;
}
</style>

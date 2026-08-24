<script setup lang="ts">
// Assistant de stratégie de qualification (FS §4.6, URS-F-050 à 055) —
// module indépendant (URS-F-054) ; l'accès depuis une section Change
// Control en cours de rédaction (même URS-F-054) reste hors périmètre de
// cet incrément — `change_control` n'existe pas encore comme
// `TemplateType` dans ce projet. Aucune génération IA ici (URS-F-050bis,
// "l'IA peut proposer des réponses depuis un Change Control joint") :
// différée avec le reste du routage par mode (tâches #28/#29).
//
// Grille PROVISOIRE — voir l'avertissement complet dans
// logique-metier/strategie-qualification/grilleCriticite.ts. Jamais
// validée par un expert qualification réel : ne jamais utiliser la
// conclusion de cet écran comme une décision de qualification.
import { computed, ref } from 'vue'
import {
  CRITERES_CRITICITE_V1,
  niveauLePlusEleve,
  type NiveauCriticite,
} from '../../logique-metier/strategie-qualification/grilleCriticite'
import {
  determinerConclusion,
  LIBELLES_CONCLUSION,
  VERSION_GRILLE_STRATEGIE_QUALIFICATION,
  type NiveauComplexite,
} from '../../logique-metier/strategie-qualification/grilleDecision'

const LIBELLES_CRITICITE: Record<NiveauCriticite, string> = {
  critique: 'Critique',
  majeur: 'Majeur',
  mineur: 'mineur',
  absence_criticite: 'Absence de criticité',
}

const itemsCoches = ref<Record<string, boolean>>({})
const complexite = ref<NiveauComplexite | null>(null)

const niveauCriticite = computed(() =>
  niveauLePlusEleve(
    CRITERES_CRITICITE_V1.filter((item) => itemsCoches.value[item.id]).map((item) => item.niveau),
  ),
)

const complexitePertinente = computed(() => niveauCriticite.value !== 'absence_criticite')

const conclusion = computed(() =>
  determinerConclusion(niveauCriticite.value, complexitePertinente.value ? complexite.value : null),
)
</script>

<template>
  <main class="assistant-strategie">
    <RouterLink :to="{ name: 'tableau-de-bord' }">&larr; Tableau de bord</RouterLink>
    <h1>Assistant de stratégie de qualification</h1>

    <p class="bandeau-provisoire" role="alert">
      Grille provisoire, jamais validée par un expert qualification réel — ne jamais utiliser cette
      conclusion comme une décision de qualification effective sans revue préalable.
    </p>
    <p class="bandeau-disclaimer">Aide à la décision, non une décision de qualification.</p>

    <section class="bloc-criticite">
      <h2>1. Évaluation de la criticité</h2>
      <p class="rappel">
        Cochez toutes les situations d'usage qui s'appliquent au système évalué. Le niveau retenu
        est le plus élevé parmi les cases cochées.
      </p>
      <ul class="liste-criteres">
        <li v-for="item in CRITERES_CRITICITE_V1" :key="item.id">
          <label>
            <input v-model="itemsCoches[item.id]" type="checkbox" />
            {{ item.libelle }}
            <span class="niveau-item">({{ LIBELLES_CRITICITE[item.niveau] }})</span>
          </label>
        </li>
      </ul>
      <p class="resultat-partiel">
        Niveau de criticité déterminé : <strong>{{ LIBELLES_CRITICITE[niveauCriticite] }}</strong>
      </p>
    </section>

    <section v-if="complexitePertinente" class="bloc-complexite">
      <h2>2. Évaluation de la complexité</h2>
      <p class="rappel">
        La complexité n'est pas évaluée en cas d'absence de criticité (cf. rationnel de la grille).
      </p>
      <label>
        <input v-model="complexite" type="radio" value="catalogue" />
        Catalogue — système sans adaptation particulière du fournisseur
      </label>
      <label>
        <input v-model="complexite" type="radio" value="specifique" />
        Spécifique — système fait à façon ou hautement configuré
      </label>
    </section>

    <section class="bloc-conclusion">
      <h2>Conclusion</h2>
      <p class="conclusion" role="status">{{ LIBELLES_CONCLUSION[conclusion] }}</p>
      <p class="version-grille">
        Version de la grille : {{ VERSION_GRILLE_STRATEGIE_QUALIFICATION }}
      </p>
    </section>
  </main>
</template>

<style scoped>
.assistant-strategie {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 40rem;
}

.bandeau-provisoire {
  background-color: var(--vp-fond-secondaire, #fff3cd);
  color: var(--vp-statut-requalification-en-retard);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
  margin: 0;
  font-weight: 600;
}

.bandeau-disclaimer {
  font-style: italic;
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.liste-criteres {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-criteres label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.niveau-item {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.bloc-complexite {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bloc-complexite label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bloc-conclusion {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
}

.conclusion {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-marque);
}

.resultat-partiel {
  font-weight: 600;
}

.version-grille {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}
</style>

<script setup lang="ts">
// Écran Paramètres (§9 du prompt maître du 03/09/2026, Phase 40) — thème
// et police, les deux seules préférences réellement câblées de bout en
// bout (voir le commentaire de `usePreferencesAffichageStore` pour la
// raison de ne pas proposer la langue d'interface ni une densité
// d'affichage tant qu'aucun mécanisme réel ne les porte).
import {
  usePreferencesAffichageStore,
  type PoliceAffichage,
  type ThemeAffichage,
} from '../stores/usePreferencesAffichageStore'

defineOptions({ name: 'EcranParametres' })
const store = usePreferencesAffichageStore()

const OPTIONS_THEME: Array<{ valeur: ThemeAffichage; libelle: string }> = [
  { valeur: 'systeme', libelle: 'Système (suit votre appareil)' },
  { valeur: 'clair', libelle: 'Clair' },
  { valeur: 'sombre', libelle: 'Sombre' },
]

const OPTIONS_POLICE: Array<{ valeur: PoliceAffichage; libelle: string }> = [
  { valeur: 'systeme', libelle: 'Système (sans empattement)' },
  { valeur: 'serif', libelle: 'Serif' },
]
</script>

<template>
  <main class="parametres">
    <h1>Paramètres</h1>
    <p class="rappel">Préférences d'affichage de cet appareil — jamais une donnée de projet.</p>

    <section class="bloc">
      <h2>Thème</h2>
      <fieldset class="options" role="radiogroup" aria-label="Thème">
        <label v-for="option in OPTIONS_THEME" :key="option.valeur">
          <input
            type="radio"
            name="theme"
            :value="option.valeur"
            :checked="store.theme === option.valeur"
            @change="store.definirTheme(option.valeur)"
          />
          {{ option.libelle }}
        </label>
      </fieldset>
    </section>

    <section class="bloc">
      <h2>Police</h2>
      <fieldset class="options" role="radiogroup" aria-label="Police">
        <label v-for="option in OPTIONS_POLICE" :key="option.valeur">
          <input
            type="radio"
            name="police"
            :value="option.valeur"
            :checked="store.police === option.valeur"
            @change="store.definirPolice(option.valeur)"
          />
          {{ option.libelle }}
        </label>
      </fieldset>
    </section>

    <p class="note-limite">
      La langue de l'interface (actuellement français uniquement) et une densité d'affichage
      réglable ne sont pas encore disponibles ici — à la différence de la langue d'un livrable
      (réglable projet par projet), aucun mécanisme de traduction de l'interface n'existe encore
      dans l'outil.
    </p>
  </main>
</template>

<style scoped>
.parametres {
  padding: 2.5rem;
  max-width: 40rem;
  margin: 0 auto;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: var(--vp-poids-bold);
}

.rappel {
  margin: 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.bloc {
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  box-shadow: var(--vp-ombre-sm);
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bloc h2 {
  margin: 0;
  font-size: 1.02rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: none;
  padding: 0;
  margin: 0;
}

.options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.note-limite {
  font-size: 0.82rem;
  color: var(--vp-texte-secondaire);
  font-style: italic;
}
</style>

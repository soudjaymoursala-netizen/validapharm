<script setup lang="ts">
// Point d'entrée : applique la garde de compatibilité de schéma
// avant tout accès aux données, puis monte le routeur — jamais l'inverse.
import { onMounted, ref } from 'vue'
import { db } from '../persistance/db'
import {
  initialiserVersionSchemaSiAbsente,
  verifierCompatibiliteAvantAcces,
} from '../persistance/demarrage'
import BlocageIncompatibilite from './screens/BlocageIncompatibilite.vue'
import CoquilleApplication from './composants/CoquilleApplication.vue'
import { usePreferencesAffichageStore } from './stores/usePreferencesAffichageStore'

// Instancier ce store ici (racine, toujours montée) plutôt que seulement
// dans `Parametres.vue` : sans cet appel, le thème/la police persistés en
// `localStorage` n'étaient réappliqués au DOM (`data-theme`, `--vp-police`)
// qu'après une visite de l'écran Paramètres dans la session en cours — un
// rechargement complet (F5, réouverture de la PWA) retombait silencieusement
// sur le thème clair par défaut malgré une préférence sombre enregistrée.
// Bug trouvé pendant une vérification navigateur (le thème sombre ne
// survivait pas à une navigation complète vers un autre écran).
usePreferencesAffichageStore()

type EtatDemarrage = 'verification' | 'bloque' | 'pret'
const etatDemarrage = ref<EtatDemarrage>('verification')

onMounted(async () => {
  const resultat = await verifierCompatibiliteAvantAcces(db)
  if (!resultat.pretPourAcces) {
    etatDemarrage.value = 'bloque'
    return
  }
  await initialiserVersionSchemaSiAbsente(db)
  etatDemarrage.value = 'pret'
})
</script>

<template>
  <BlocageIncompatibilite v-if="etatDemarrage === 'bloque'" />
  <CoquilleApplication v-else-if="etatDemarrage === 'pret'" />
</template>

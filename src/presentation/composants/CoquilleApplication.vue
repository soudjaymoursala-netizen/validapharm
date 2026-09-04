<script setup lang="ts">
// Coquille applicative (Phase 16, `docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3) — sidebar partagée + zone de contenu,
// remplace l'affichage nu de `RouterView` dans `App.vue`. N'enveloppe que
// l'état "pret" de l'application — jamais l'écran de blocage au démarrage.
//
// Écran de connexion (TD-046, Phase 41) : la sidebar n'a aucun sens tant
// qu'aucune session n'existe (ses liens mènent tous à des routes gardées
// qui renverraient immédiatement vers `/connexion`) — elle brouillait la
// première impression du produit et laissait deviner la navigation
// complète avant authentification. `Login.vue` reste donc affiché seul,
// pleine page, sans la coquille.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BarreLaterale from './BarreLaterale.vue'

const route = useRoute()
const masquerSidebar = computed(() => route.name === 'connexion')
</script>

<template>
  <div class="coquille-application">
    <BarreLaterale v-if="!masquerSidebar" />
    <div class="coquille-application__contenu">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.coquille-application {
  display: flex;
  min-height: 100vh;
}

.coquille-application__contenu {
  flex: 1;
  min-width: 0;
}
</style>

<script setup lang="ts">
// Coquille applicative (Phase 16, `docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3) — sidebar partagée + zone de contenu,
// remplace l'affichage nu de `RouterView` dans `App.vue`. N'enveloppe que
// l'état "pret" de l'application — jamais l'écran de blocage au démarrage.
import BarreLaterale from './BarreLaterale.vue'
</script>

<template>
  <div class="coquille-application">
    <BarreLaterale />
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

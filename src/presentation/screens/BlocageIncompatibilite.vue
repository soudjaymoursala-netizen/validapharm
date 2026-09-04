<script setup lang="ts">
// Écran de blocage au démarrage — FDS §7 (U-12). Affiché
// à la place de toute l'application (jamais une simple modale) quand les
// données ont un schema_version postérieur à ce que cette version sait
// lire. Aucune écriture n'a lieu avant confirmation de compatibilité.
import { messageSysteme } from '../i18n/messages'
import { VERSION_SCHEMA_CONNUE } from '../../persistance/demarrage'

defineProps<{ langue?: 'fr' | 'en' | 'de' }>()
</script>

<template>
  <main class="blocage" role="alert">
    <h1>ValidaPharm — Application non compatible</h1>
    <p>{{ messageSysteme('U-12', langue ?? 'fr', { x: VERSION_SCHEMA_CONNUE }) }}</p>
  </main>
</template>

<style scoped>
.blocage {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-principal);
}
</style>

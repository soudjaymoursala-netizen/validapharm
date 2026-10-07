<script setup lang="ts">
// Fil d'Ariane commun aux écrans d'entrée et d'administration (audit UX
// entrée #18) : remplace les boutons « retour » dont la cible variait d'un
// écran à l'autre. Le dernier élément (page courante) n'est pas un lien.
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  elements: readonly { libelle: string; to?: RouteLocationRaw }[]
}>()
</script>

<template>
  <nav class="fil-ariane" aria-label="Fil d'Ariane">
    <ol>
      <li v-for="(element, index) in elements" :key="index">
        <RouterLink v-if="element.to && index < elements.length - 1" :to="element.to">
          {{ element.libelle }}
        </RouterLink>
        <span v-else aria-current="page">{{ element.libelle }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.fil-ariane ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.fil-ariane li + li::before {
  content: '›';
  margin-right: 0.35rem;
}

.fil-ariane a {
  color: var(--vp-texte-secondaire);
  text-decoration: underline;
}

.fil-ariane a:hover {
  color: var(--vp-marque);
}

.fil-ariane [aria-current='page'] {
  color: var(--vp-texte-principal);
  font-weight: var(--vp-poids-medium);
}
</style>

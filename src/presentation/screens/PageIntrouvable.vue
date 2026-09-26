<script setup lang="ts">
// Adresse inconnue (lien périmé, faute de frappe) : explique la situation
// et propose un retour, jamais un écran blanc.
</script>

<template>
  <main class="page-introuvable">
    <h1>Page introuvable</h1>
    <p>
      Cette adresse ne correspond à aucun écran de ValidaPharm. Le lien est peut-être périmé, ou
      l'élément a été supprimé ou archivé.
    </p>
    <p>
      <RouterLink :to="{ name: 'accueil' }">Revenir à l'accueil</RouterLink>
    </p>
  </main>
</template>

<style scoped>
.page-introuvable {
  padding: 2rem;
  font-family: var(--vp-police);
  color: var(--vp-texte-principal);
  max-width: 40rem;
}
</style>

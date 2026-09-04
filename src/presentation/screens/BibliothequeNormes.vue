<script setup lang="ts">
// Bibliothèque de normes (FS §4.5) — agrégation déterministe des
// normes/référentiels déjà portés par chaque gabarit du catalogue (FDS §4).
// L'association de documents normatifs propres à l'utilisateur
// (Could) reste backlog : nécessiterait un écran générique de bibliothèque de
// documents non construit à ce stade — voir TD-032.
import { computed, ref } from 'vue'
import { rechercherNormes } from '../../logique-metier/bibliotheque-normes/rechercherNormes'

const motCle = ref('')

const resultats = computed(() => rechercherNormes(motCle.value))
</script>

<template>
  <main class="bibliotheque-normes">
    <RouterLink :to="{ name: 'tableau-de-bord' }">&larr; Tableau de bord</RouterLink>
    <h1>Bibliothèque de normes</h1>
    <p class="rappel">
      Normes et référentiels cités par les gabarits du catalogue (FDS §4) — recherche par mot-clé.
    </p>

    <label class="champ-recherche">
      Rechercher une norme
      <input v-model="motCle" type="text" placeholder="ex. EudraLex, ICH Q9, ASTM" />
    </label>

    <p v-if="resultats.length === 0" class="etat-vide">Aucune norme ne correspond à ce mot-clé.</p>
    <ul v-else class="liste-normes">
      <li v-for="entree in resultats" :key="entree.norme">
        <strong>{{ entree.norme }}</strong>
        <span class="gabarits"> — cité par : {{ entree.gabarits.join(', ') }}</span>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.bibliotheque-normes {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.champ-recherche {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.champ-recherche input {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.liste-normes {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-normes li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.9rem;
}

.gabarits {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}
</style>

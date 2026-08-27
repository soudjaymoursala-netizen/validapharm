<script setup lang="ts">
// Écran d'accueil "Que voulez-vous faire ?" (Phase 16, `docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3) — remplace la racine `/` occupée
// jusqu'ici par le Tableau de bord (déplacé vers `/tableau-de-bord`,
// même nom de route, aucune régression des liens existants). Cartes
// d'action vers des capacités réellement construites — jamais une
// fonctionnalité aspirationnelle non construite.
interface CarteAction {
  titre: string
  description: string
  route: { name: string }
}

const cartes: CarteAction[] = [
  {
    titre: 'Voir mes projets',
    description: 'Reprendre un projet en cours ou en créer un nouveau.',
    route: { name: 'tableau-de-bord' },
  },
  {
    titre: 'Gérer mes clients',
    description: 'Ajouter un client, configurer ses outils (Structure Système, IA, Drive).',
    route: { name: 'gestion-clients' },
  },
  {
    titre: 'Configurer la connexion GitHub',
    description: 'Dépôt de données, jeton — nécessaire pour synchroniser et récupérer.',
    route: { name: 'configuration-client' },
  },
]
</script>

<template>
  <main class="accueil">
    <h1>Que voulez-vous faire ?</h1>
    <div class="accueil__cartes">
      <RouterLink
        v-for="carte in cartes"
        :key="carte.titre"
        :to="carte.route"
        class="accueil__carte"
      >
        <h2>{{ carte.titre }}</h2>
        <p>{{ carte.description }}</p>
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.accueil {
  max-width: 960px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.accueil h1 {
  margin-bottom: 2rem;
}

.accueil__cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.accueil__carte {
  display: block;
  padding: 1.25rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  background-color: var(--vp-fond-carte);
  color: var(--vp-texte-principal);
  text-decoration: none;
  transition: var(--vp-transition);
}

.accueil__carte:hover {
  border-color: var(--vp-marque);
  background-color: var(--vp-marque-fond-leger);
}

.accueil__carte h2 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  color: var(--vp-marque);
}

.accueil__carte p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-texte-secondaire);
}
</style>

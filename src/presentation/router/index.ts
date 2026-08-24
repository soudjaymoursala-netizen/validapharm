import { createRouter, createWebHistory } from 'vue-router'

/**
 * Routeur applicatif — un composant par écran (FDS §2), chargement
 * différé (`import()` dynamique) pour réduire le poids initial du bundle
 * (09-architecture-detaillee.md §6).
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'tableau-de-bord',
      component: () => import('../screens/TableauDeBord.vue'),
    },
    {
      path: '/projets/:projectId',
      name: 'fiche-projet',
      component: () => import('../screens/FicheProjet.vue'),
      props: true,
    },
    {
      path: '/projets/:projectId/sections/:sectionId',
      name: 'editeur-section',
      component: () => import('../screens/EditeurSection.vue'),
      props: true,
    },
  ],
})

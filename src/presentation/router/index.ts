import { createRouter, createWebHistory } from 'vue-router'
import { useClientActifStore } from '../stores/useClientActifStore'

/**
 * Routeur applicatif — un composant par écran (FDS §2), chargement
 * différé (`import()` dynamique) pour réduire le poids initial du bundle
 * (09-architecture-detaillee.md §6).
 */
export const router = createRouter({
  // `import.meta.env.BASE_URL` DOIT être passé explicitement : Vue Router
  // ne lit jamais automatiquement le `base` de Vite (contrairement à une
  // idée reçue) — sans ça, le routeur cherche les routes à la racine du
  // domaine, ce qui échoue silencieusement (aucune erreur, RouterView ne
  // rend rien) dès que l'app est servie sous un sous-chemin, comme sur
  // GitHub Pages (`/validapharm/`) — constaté le 26/08/2026.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'accueil',
      component: () => import('../screens/AccueilQueVoulezVousFaire.vue'),
    },
    {
      // Déplacée de `/` vers `/tableau-de-bord` (Phase 16) — le nom de
      // route est inchangé, toutes les références existantes par nom
      // (`RouterLink :to="{ name: 'tableau-de-bord' }"`) restent valides.
      path: '/tableau-de-bord',
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
    {
      path: '/configuration',
      name: 'configuration-client',
      component: () => import('../screens/ConfigurationClient.vue'),
    },
    {
      path: '/normes',
      name: 'bibliotheque-normes',
      component: () => import('../screens/BibliothequeNormes.vue'),
    },
    {
      path: '/resolution-conflit',
      name: 'resolution-conflit',
      component: () => import('../screens/ResolutionConflit.vue'),
    },
    {
      path: '/clients',
      name: 'gestion-clients',
      component: () => import('../screens/GestionClients.vue'),
    },
    {
      path: '/clients/:clientId/drive',
      name: 'configuration-drive',
      component: () => import('../screens/ConfigurationDrive.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/ia',
      name: 'configuration-ia',
      component: () => import('../screens/ConfigurationIA.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/chat',
      name: 'panneau-chat',
      component: () => import('../screens/PanneauChat.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/strategie-qualification',
      name: 'assistant-strategie-qualification',
      component: () => import('../screens/AssistantStrategieQualification.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/structure-systeme',
      name: 'structure-systeme',
      component: () => import('../screens/StructureSysteme.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/impact-assessment',
      name: 'impact-assessment',
      component: () => import('../screens/ImpactAssessment.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/csv-assessment',
      name: 'csv-assessment',
      component: () => import('../screens/ComputerSystemAssessment.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/missions',
      name: 'liste-missions',
      component: () => import('../screens/ListeMissions.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/missions/:missionId',
      name: 'mission-workspace',
      component: () => import('../screens/MissionWorkspace.vue'),
      props: true,
    },
    {
      path: '/clients/:clientId/procedures',
      name: 'revue-structure-procedure',
      component: () => import('../screens/RevueStructureProcedure.vue'),
      props: true,
    },
  ],
})

/**
 * Mémorise le dernier client visité (Phase 16, spec §2) — une commodité de
 * navigation, jamais une donnée métier. Toute route portant un paramètre
 * `clientId` met à jour `useClientActifStore`, pour que la `Sidebar`
 * propose un accès direct aux outils de ce client sans qu'aucun concept
 * de "client actif" ne soit fabriqué côté domaine.
 */
router.afterEach((to) => {
  const clientId = to.params.clientId
  if (typeof clientId === 'string') {
    useClientActifStore().definirClientActif(clientId)
  }
})

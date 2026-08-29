<script setup lang="ts">
// Sidebar de navigation par intention (Phase 16, `docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3) — remplace la logique implicite
// "chaque écran construit son propre bandeau" par une coquille partagée,
// groupée par intention plutôt qu'une liste plate d'écrans.
import { computed } from 'vue'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useModeAffichageStore, type ModeAffichage } from '../stores/useModeAffichageStore'

const clientActifStore = useClientActifStore()
const modeStore = useModeAffichageStore()

const outilsClientActif = computed(() => {
  const clientId = clientActifStore.clientActifId
  if (!clientId) return null
  return [
    { nom: 'Missions', route: { name: 'liste-missions', params: { clientId } } },
    { nom: 'Structure Système', route: { name: 'structure-systeme', params: { clientId } } },
    {
      nom: 'Stratégie de qualification',
      route: { name: 'assistant-strategie-qualification', params: { clientId } },
    },
    {
      nom: 'Impact Assessment',
      route: { name: 'impact-assessment', params: { clientId } },
    },
    {
      nom: 'Computer System Assessment',
      route: { name: 'csv-assessment', params: { clientId } },
    },
    { nom: 'Assistant IA', route: { name: 'panneau-chat', params: { clientId } } },
    { nom: 'Procédures', route: { name: 'revue-structure-procedure', params: { clientId } } },
    { nom: 'Miroir Drive', route: { name: 'configuration-drive', params: { clientId } } },
  ]
})

function basculerMode(nouveauMode: ModeAffichage): void {
  modeStore.definirMode(nouveauMode)
}
</script>

<template>
  <nav class="sidebar" aria-label="Navigation principale">
    <div class="sidebar__bascule-mode" role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        :class="{ actif: modeStore.mode === 'expert' }"
        @click="basculerMode('expert')"
      >
        Mode Expert
      </button>
      <button
        type="button"
        :class="{ actif: modeStore.mode === 'assistant' }"
        @click="basculerMode('assistant')"
      >
        Mode Assistant
      </button>
    </div>

    <div class="sidebar__groupe">
      <p class="sidebar__titre-groupe">Accueil</p>
      <RouterLink :to="{ name: 'accueil' }">Que voulez-vous faire ?</RouterLink>
    </div>

    <div class="sidebar__groupe">
      <p class="sidebar__titre-groupe">Mon travail</p>
      <RouterLink :to="{ name: 'tableau-de-bord' }">Mes projets</RouterLink>
      <RouterLink :to="{ name: 'bibliotheque-normes' }">Bibliothèque de normes</RouterLink>
    </div>

    <div class="sidebar__groupe">
      <p class="sidebar__titre-groupe">Mon site</p>
      <template v-if="outilsClientActif">
        <RouterLink v-for="outil in outilsClientActif" :key="outil.nom" :to="outil.route">
          {{ outil.nom }}
        </RouterLink>
      </template>
      <RouterLink v-else :to="{ name: 'gestion-clients' }" class="sidebar__invite">
        Choisissez un client pour accéder à ses outils
      </RouterLink>
    </div>

    <div class="sidebar__groupe">
      <p class="sidebar__titre-groupe">Clients &amp; configuration</p>
      <RouterLink :to="{ name: 'gestion-clients' }">Clients</RouterLink>
      <RouterLink :to="{ name: 'configuration-client' }">Configuration GitHub</RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 240px;
  flex-shrink: 0;
  padding: 1rem 0.75rem;
  border-right: 1px solid var(--vp-bordure);
  background-color: var(--vp-fond-carte);
}

.sidebar__bascule-mode {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  background-color: var(--vp-fond-page);
}

.sidebar__bascule-mode button {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border: none;
  border-radius: calc(var(--vp-rayon) - 2px);
  background: transparent;
  color: var(--vp-texte-secondaire);
  font-size: 0.8rem;
  cursor: pointer;
  transition: var(--vp-transition);
}

.sidebar__bascule-mode button.actif {
  background-color: var(--vp-marque);
  color: #ffffff;
}

.sidebar__groupe {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar__titre-groupe {
  margin: 0 0 0.25rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-texte-secondaire);
}

.sidebar__groupe a {
  padding: 0.45rem 0.5rem;
  border-radius: var(--vp-rayon);
  color: var(--vp-texte-principal);
  text-decoration: none;
  font-size: 0.9rem;
}

.sidebar__groupe a:hover,
.sidebar__groupe a.router-link-active {
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

.sidebar__invite {
  color: var(--vp-texte-secondaire) !important;
  font-style: italic;
}
</style>

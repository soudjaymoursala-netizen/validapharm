<script setup lang="ts">
// Sidebar de navigation par intention (Phase 16, `docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3) — remplace la logique implicite
// "chaque écran construit son propre bandeau" par une coquille partagée,
// groupée par intention plutôt qu'une liste plate d'écrans.
//
// Refonte visuelle v20 (demande explicite : "super UX/UI moderne...
// guider l'utilisateur") : icônes par intention, badge du client actif
// (nom réel, pas seulement son id technique), sidebar fixe pendant le
// défilement du contenu — aucun changement de logique de navigation,
// seulement de présentation.
import { computed, ref, watch } from 'vue'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useClientsStore } from '../stores/useClientsStore'
import { useModeAffichageStore, type ModeAffichage } from '../stores/useModeAffichageStore'
import IconeSvg, { type NomIcone } from './IconeSvg.vue'

const clientActifStore = useClientActifStore()
const clientsStore = useClientsStore()
const modeStore = useModeAffichageStore()

const nomClientActif = ref<string | null>(null)

watch(
  () => clientActifStore.clientActifId,
  async (clientId) => {
    nomClientActif.value = clientId
      ? ((await clientsStore.obtenirClient(clientId))?.name ?? null)
      : null
  },
  { immediate: true },
)

const initialesClient = computed(() => {
  const nom = nomClientActif.value ?? clientActifStore.clientActifId ?? ''
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase())
    .join('')
})

interface OutilClient {
  nom: string
  icone: NomIcone
  route: { name: string; params: Record<string, string> }
}

const outilsClientActif = computed<OutilClient[] | null>(() => {
  const clientId = clientActifStore.clientActifId
  if (!clientId) return null
  return [
    { nom: 'Missions', icone: 'reseau', route: { name: 'liste-missions', params: { clientId } } },
    {
      nom: 'Structure Système',
      icone: 'batiment',
      route: { name: 'structure-systeme', params: { clientId } },
    },
    {
      nom: 'Exigences et tests',
      icone: 'reglettes',
      route: { name: 'definition-tests', params: { clientId } },
    },
    {
      nom: 'Exécution de tests',
      icone: 'graphique',
      route: { name: 'execution-tests', params: { clientId } },
    },
    {
      nom: 'Paramètres critiques',
      icone: 'reglettes',
      route: { name: 'parametres-critiques', params: { clientId } },
    },
    {
      nom: 'Ingestion documentaire',
      icone: 'nuage',
      route: { name: 'source-intelligence', params: { clientId } },
    },
    {
      nom: 'Plans de livrable',
      icone: 'dossier',
      route: { name: 'content-plan', params: { clientId } },
    },
    {
      nom: 'Risk Assessment (AMDEC)',
      icone: 'flacon',
      route: { name: 'risk-assessment-amdec', params: { clientId } },
    },
    {
      nom: 'Stratégie de qualification',
      icone: 'bouclier',
      route: { name: 'assistant-strategie-qualification', params: { clientId } },
    },
    {
      nom: 'Impact Assessment',
      icone: 'bouclier',
      route: { name: 'impact-assessment', params: { clientId } },
    },
    {
      nom: 'Computer System Assessment',
      icone: 'bouclier',
      route: { name: 'csv-assessment', params: { clientId } },
    },
    {
      nom: 'Assistant IA',
      icone: 'etincelles',
      route: { name: 'panneau-chat', params: { clientId } },
    },
    {
      nom: 'Procédures',
      icone: 'flux',
      route: { name: 'revue-structure-procedure', params: { clientId } },
    },
    {
      nom: "Journal d'anomalies",
      icone: 'alerte-triangle',
      route: { name: 'journal-anomalies', params: { clientId } },
    },
    {
      nom: 'Connecteurs QMS',
      icone: 'lien',
      route: { name: 'configuration-connecteurs-qms', params: { clientId } },
    },
    {
      nom: 'Miroir Drive',
      icone: 'nuage',
      route: { name: 'configuration-drive', params: { clientId } },
    },
  ]
})

function basculerMode(nouveauMode: ModeAffichage): void {
  modeStore.definirMode(nouveauMode)
}
</script>

<template>
  <nav class="sidebar" aria-label="Navigation principale">
    <div class="sidebar__marque">
      <span class="sidebar__logo" aria-hidden="true">VP</span>
      <span class="sidebar__nom-produit">ValidaPharm</span>
    </div>

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

    <div class="sidebar__scroll">
      <div class="sidebar__groupe">
        <p class="sidebar__titre-groupe">Accueil</p>
        <RouterLink :to="{ name: 'accueil' }">
          <IconeSvg nom="accueil" :taille="16" />
          Que voulez-vous faire ?
        </RouterLink>
      </div>

      <div class="sidebar__groupe">
        <p class="sidebar__titre-groupe">Mon travail</p>
        <RouterLink :to="{ name: 'tableau-de-bord' }">
          <IconeSvg nom="dossier" :taille="16" />
          Mes projets
        </RouterLink>
        <RouterLink :to="{ name: 'bibliotheque-normes' }">
          <IconeSvg nom="livre" :taille="16" />
          Bibliothèque de normes
        </RouterLink>
      </div>

      <div class="sidebar__groupe">
        <div v-if="outilsClientActif" class="sidebar__badge-client">
          <span class="sidebar__avatar-client" aria-hidden="true">{{
            initialesClient || '?'
          }}</span>
          <div class="sidebar__badge-client-texte">
            <span class="sidebar__badge-client-libelle">Site actif</span>
            <span class="sidebar__badge-client-nom">{{
              nomClientActif ?? clientActifStore.clientActifId
            }}</span>
          </div>
        </div>
        <p v-else class="sidebar__titre-groupe">Mon site</p>
        <template v-if="outilsClientActif">
          <RouterLink v-for="outil in outilsClientActif" :key="outil.nom" :to="outil.route">
            <IconeSvg :nom="outil.icone" :taille="16" />
            {{ outil.nom }}
          </RouterLink>
        </template>
        <RouterLink v-else :to="{ name: 'gestion-clients' }" class="sidebar__invite">
          Choisissez un client pour accéder à ses outils
        </RouterLink>
      </div>

      <div class="sidebar__groupe">
        <p class="sidebar__titre-groupe">Clients &amp; configuration</p>
        <RouterLink :to="{ name: 'gestion-clients' }">
          <IconeSvg nom="utilisateur" :taille="16" />
          Clients
        </RouterLink>
        <RouterLink :to="{ name: 'configuration-client' }">
          <IconeSvg nom="engrenage" :taille="16" />
          Configuration GitHub
        </RouterLink>
        <RouterLink :to="{ name: 'profil-local' }">
          <IconeSvg nom="cadenas" :taille="16" />
          Profil local
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  padding: 1.25rem 0.75rem 0;
  border-right: 1px solid var(--vp-bordure);
  background-color: var(--vp-fond-carte);
}

.sidebar__marque {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.5rem;
  margin-bottom: 1.1rem;
}

.sidebar__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--vp-rayon-sm);
  background-color: var(--vp-marque);
  color: white;
  font-size: 0.75rem;
  font-weight: var(--vp-poids-bold);
  letter-spacing: 0.02em;
}

.sidebar__nom-produit {
  font-weight: var(--vp-poids-bold);
  font-size: 1.02rem;
  color: var(--vp-texte-principal);
}

.sidebar__scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 1.25rem;
}

.sidebar__bascule-mode {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  margin-bottom: 1.25rem;
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
  gap: 0.15rem;
}

.sidebar__titre-groupe {
  margin: 0 0 0.35rem 0.5rem;
  font-size: 0.7rem;
  font-weight: var(--vp-poids-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-texte-secondaire);
}

.sidebar__badge-client {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: var(--vp-rayon);
  background-color: var(--vp-marque-fond-leger);
}

.sidebar__avatar-client {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 999px;
  background-color: var(--vp-marque);
  color: white;
  font-size: 0.7rem;
  font-weight: var(--vp-poids-semibold);
}

.sidebar__badge-client-texte {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar__badge-client-libelle {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-marque-survol);
  opacity: 0.85;
}

.sidebar__badge-client-nom {
  font-size: 0.82rem;
  font-weight: var(--vp-poids-semibold);
  color: var(--vp-texte-principal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__groupe a {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.5rem;
  border-radius: var(--vp-rayon-sm);
  color: var(--vp-texte-principal);
  text-decoration: none;
  font-size: 0.87rem;
  transition: var(--vp-transition);
}

.sidebar__groupe a :deep(svg) {
  flex-shrink: 0;
  color: var(--vp-texte-secondaire);
  transition: var(--vp-transition);
}

.sidebar__groupe a:hover {
  background-color: var(--vp-fond-page);
  color: var(--vp-marque);
}

.sidebar__groupe a.router-link-active {
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
  font-weight: var(--vp-poids-medium);
}

.sidebar__groupe a:hover :deep(svg),
.sidebar__groupe a.router-link-active :deep(svg) {
  color: var(--vp-marque);
}

.sidebar__invite {
  color: var(--vp-texte-secondaire) !important;
  font-style: italic;
  font-size: 0.85rem;
  padding: 0.45rem 0.5rem;
}
</style>

<script setup lang="ts">
// Sidebar de navigation par intention (Phase 16, `docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3 ; restructurée Phase 40, §11 du prompt
// maître du 03/09/2026 — demande explicite : « refonte UX comme prévue,
// ultra améliorée et optimisée »).
//
// Avant Phase 40 : la section « Mon site » listait les ~16 outils d'un
// client à plat, sans hiérarchie. Cette refonte les regroupe par intention
// (Architecture/Process/Procédures/Templates/Projets — les 5 branches
// exactes du parcours demandé — puis Qualité & Ingénierie / Connaissance &
// IA / Configuration pour le reste), cohérent avec §11 du prompt maître qui
// propose exactement ce découpage. Chaque outil garde son drapeau `guide`
// (Mode Assistant = parcours restreint) — aucun changement de ce mécanisme,
// seulement de présentation. Le lien « Fiche client » (`fiche-client`,
// Phase 40) est le point d'entrée du Mode 1 (« travail contextuel », §12
// du prompt maître) ; cette sidebar reste le Mode 2 (« expert ») — l'accès
// direct aux briques ne disparaît jamais, conformément à ce même §12.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useClientsStore } from '../stores/useClientsStore'
import { useModeAffichageStore, type ModeAffichage } from '../stores/useModeAffichageStore'
import IconeSvg, { type NomIcone } from './IconeSvg.vue'

const clientActifStore = useClientActifStore()
const clientsStore = useClientsStore()
const modeStore = useModeAffichageStore()
const authStore = useAuthStore()
const router = useRouter()

async function seDeconnecter(): Promise<void> {
  await authStore.deconnecter()
  await router.push({ name: 'connexion' })
}

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
  route: { name: string; params?: Record<string, string>; query?: Record<string, string> }
  /** Visible en Mode Assistant — parcours guidé restreint (v21). */
  guide: boolean
}

interface GroupeOutils {
  titre: string
  outils: OutilClient[]
}

const GROUPES_OUTILS_CLIENT = (clientId: string): GroupeOutils[] => [
  {
    titre: 'Le site',
    outils: [
      {
        nom: 'Vue d’ensemble',
        icone: 'utilisateur',
        route: { name: 'fiche-client', params: { clientId } },
        guide: true,
      },
      {
        nom: 'Architecture',
        icone: 'batiment',
        route: { name: 'structure-systeme', params: { clientId } },
        guide: true,
      },
      {
        nom: 'Process',
        icone: 'flux',
        route: { name: 'gestion-process', params: { clientId } },
        guide: true,
      },
      {
        nom: 'Procédures',
        icone: 'reglettes',
        route: { name: 'revue-structure-procedure', params: { clientId } },
        guide: true,
      },
      {
        nom: 'Templates & Formulaires',
        icone: 'dossier',
        route: { name: 'templates-formulaires', params: { clientId } },
        guide: false,
      },
      {
        nom: 'Projets',
        icone: 'graphique',
        route: { name: 'tableau-de-bord', query: { clientId } },
        guide: true,
      },
      {
        nom: 'Missions',
        icone: 'reseau',
        route: { name: 'liste-missions', params: { clientId } },
        guide: true,
      },
    ],
  },
  {
    titre: 'Qualité & ingénierie',
    outils: [
      {
        nom: 'Stratégie de qualification',
        icone: 'bouclier',
        route: { name: 'assistant-strategie-qualification', params: { clientId } },
        guide: true,
      },
      {
        nom: 'Impact Assessment',
        icone: 'bouclier',
        route: { name: 'impact-assessment', params: { clientId } },
        guide: true,
      },
      {
        nom: 'Computer System Assessment',
        icone: 'bouclier',
        route: { name: 'csv-assessment', params: { clientId } },
        guide: true,
      },
      {
        nom: 'Risk Assessment (AMDEC)',
        icone: 'flacon',
        route: { name: 'risk-assessment-amdec', params: { clientId } },
        guide: false,
      },
      {
        nom: 'Paramètres critiques',
        icone: 'reglettes',
        route: { name: 'parametres-critiques', params: { clientId } },
        guide: false,
      },
      {
        nom: 'Exigences et tests',
        icone: 'reglettes',
        route: { name: 'definition-tests', params: { clientId } },
        guide: false,
      },
      {
        nom: 'Exécution de tests',
        icone: 'graphique',
        route: { name: 'execution-tests', params: { clientId } },
        guide: false,
      },
      {
        nom: "Journal d'anomalies",
        icone: 'alerte-triangle',
        route: { name: 'journal-anomalies', params: { clientId } },
        guide: false,
      },
    ],
  },
  {
    titre: 'Connaissance & IA',
    outils: [
      {
        nom: 'Ingestion documentaire',
        icone: 'nuage',
        route: { name: 'source-intelligence', params: { clientId } },
        guide: false,
      },
      {
        nom: 'Plans de livrable',
        icone: 'dossier',
        route: { name: 'content-plan', params: { clientId } },
        guide: false,
      },
      {
        nom: 'Assistant IA',
        icone: 'etincelles',
        route: { name: 'panneau-chat', params: { clientId } },
        guide: true,
      },
    ],
  },
  {
    titre: 'Configuration du site',
    outils: [
      {
        nom: 'Connecteurs QMS',
        icone: 'lien',
        route: { name: 'configuration-connecteurs-qms', params: { clientId } },
        guide: false,
      },
      {
        nom: 'Miroir Drive',
        icone: 'nuage',
        route: { name: 'configuration-drive', params: { clientId } },
        guide: false,
      },
      {
        nom: 'IA du client',
        icone: 'etincelles',
        route: { name: 'configuration-ia', params: { clientId } },
        guide: false,
      },
    ],
  },
]

const groupesOutilsClientActif = computed<GroupeOutils[] | null>(() => {
  const clientId = clientActifStore.clientActifId
  if (!clientId) return null
  const groupes = GROUPES_OUTILS_CLIENT(clientId)
  if (modeStore.mode !== 'assistant') return groupes
  return groupes
    .map((groupe) => ({ ...groupe, outils: groupe.outils.filter((o) => o.guide) }))
    .filter((groupe) => groupe.outils.length > 0)
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

    <div v-if="authStore.utilisateur" class="sidebar__utilisateur">
      <span class="sidebar__utilisateur-nom">
        {{ authStore.utilisateur.prenom }} {{ authStore.utilisateur.nom }}
      </span>
      <button type="button" class="sidebar__deconnexion" @click="seDeconnecter">
        Se déconnecter
      </button>
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
        <p class="sidebar__titre-groupe">Mon espace</p>
        <RouterLink :to="{ name: 'profil-local' }">
          <IconeSvg nom="cadenas" :taille="16" />
          Profil
        </RouterLink>
        <RouterLink :to="{ name: 'parametres' }">
          <IconeSvg nom="engrenage" :taille="16" />
          Paramètres
        </RouterLink>
        <RouterLink :to="{ name: 'bibliotheque-normes' }">
          <IconeSvg nom="livre" :taille="16" />
          Guides &amp; normes
        </RouterLink>
        <RouterLink v-if="modeStore.mode === 'expert'" :to="{ name: 'configuration-client' }">
          <IconeSvg nom="engrenage" :taille="16" />
          Configuration GitHub
        </RouterLink>
        <RouterLink v-if="authStore.estAdmin" :to="{ name: 'admin-utilisateurs' }">
          <IconeSvg nom="utilisateur" :taille="16" />
          Gestion des comptes
        </RouterLink>
      </div>

      <div class="sidebar__groupe">
        <p class="sidebar__titre-groupe">Mon travail</p>
        <RouterLink :to="{ name: 'gestion-clients' }">
          <IconeSvg nom="utilisateur" :taille="16" />
          Mes clients
        </RouterLink>
        <RouterLink :to="{ name: 'tableau-de-bord' }">
          <IconeSvg nom="dossier" :taille="16" />
          Tous mes projets
        </RouterLink>
      </div>

      <template v-if="groupesOutilsClientActif">
        <div class="sidebar__badge-client">
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
        <p v-if="modeStore.mode === 'assistant'" class="sidebar__note-mode">
          Parcours guidé — le Mode Expert donne accès à tous les outils.
        </p>
        <div v-for="groupe in groupesOutilsClientActif" :key="groupe.titre" class="sidebar__groupe">
          <p class="sidebar__titre-groupe">{{ groupe.titre }}</p>
          <RouterLink v-for="outil in groupe.outils" :key="outil.nom" :to="outil.route">
            <IconeSvg :nom="outil.icone" :taille="16" />
            {{ outil.nom }}
          </RouterLink>
        </div>
      </template>
      <div v-else class="sidebar__groupe">
        <p class="sidebar__titre-groupe">Mon site</p>
        <RouterLink :to="{ name: 'gestion-clients' }" class="sidebar__invite">
          Choisissez un client pour accéder à ses outils
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

.sidebar__utilisateur {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.5rem;
  margin-bottom: 0.75rem;
}

.sidebar__utilisateur-nom {
  font-size: 0.8rem;
  font-weight: var(--vp-poids-medium);
  color: var(--vp-texte-principal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__deconnexion {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--vp-texte-secondaire);
  font-size: 0.72rem;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
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

.sidebar__note-mode {
  margin: 0 0 0.4rem 0.5rem;
  font-size: 0.72rem;
  color: var(--vp-texte-secondaire);
  font-style: italic;
}

.sidebar__invite {
  color: var(--vp-texte-secondaire) !important;
  font-style: italic;
  font-size: 0.85rem;
  padding: 0.45rem 0.5rem;
}
</style>

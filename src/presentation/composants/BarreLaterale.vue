<script setup lang="ts">
// Sidebar de navigation par intention (`docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3 ; restructurée §11 du prompt
// maître du 03/09/2026 — demande explicite : « refonte UX comme prévue,
// ultra améliorée et optimisée »).
//
// Avant cette refonte : la section « Mon site » listait les ~16 outils d'un
// client à plat, sans hiérarchie. Cette refonte les regroupe par intention
// (Architecture/Process/Procédures/Templates/Projets — les 5 branches
// exactes du parcours demandé — puis Qualité & Ingénierie / Connaissance &
// IA / Configuration pour le reste), cohérent avec §11 du prompt maître qui
// propose exactement ce découpage. Chaque outil garde son drapeau `guide`
// (Mode Assistant = parcours restreint) — aucun changement de ce mécanisme,
// seulement de présentation. Le lien « Fiche client » (`fiche-client`)
// est le point d'entrée du Mode 1 (« travail contextuel », §12
// du prompt maître) ; cette sidebar reste le Mode 2 (« expert ») — l'accès
// direct aux briques ne disparaît jamais, conformément à ce même §12.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useClientsStore } from '../stores/useClientsStore'
import { useEpinglageStore } from '../stores/useEpinglageStore'
import { useModeAffichageStore, type ModeAffichage } from '../stores/useModeAffichageStore'
import IconeSvg, { type NomIcone } from './IconeSvg.vue'

// `ouverte` : uniquement pertinent sous le point de rupture mobile (voir
// `@media` en bas de fichier) — pilote le tiroir superposé plutôt que la
// sidebar fixe habituelle. Au-dessus du point de rupture, ignoré (la
// sidebar reste toujours visible, comme avant cette refonte responsive).
const props = withDefaults(defineProps<{ ouverte?: boolean }>(), { ouverte: false })

const clientActifStore = useClientActifStore()
const clientsStore = useClientsStore()
const modeStore = useModeAffichageStore()
const authStore = useAuthStore()
const epinglageStore = useEpinglageStore()
const router = useRouter()

async function seDeconnecter(): Promise<void> {
  await authStore.deconnecter()
  await router.push({ name: 'connexion' })
}

// Largeur redimensionnable (demande explicite de l'utilisateur) — pure
// commodité d'affichage par poste, même discipline que `useClientActifStore`
// (localStorage, jamais une donnée métier) : pas de store Pinia dédié, cet
// état n'est consommé que par ce composant. Bornes choisies pour rester
// utilisable (`LARGEUR_MIN`, en dessous les libellés des outils tronquent
// mal) sans jamais empiéter excessivement sur la zone de contenu
// (`LARGEUR_MAX`).
const CLE_LARGEUR_SIDEBAR = 'validapharm.sidebar_largeur'
const LARGEUR_PAR_DEFAUT = 260
const LARGEUR_MIN = 200
const LARGEUR_MAX = 420
const PAS_CLAVIER = 12

function bornerLargeur(valeur: number): number {
  return Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, valeur))
}

function lireLargeurStockee(): number {
  try {
    const valeur = Number(localStorage.getItem(CLE_LARGEUR_SIDEBAR))
    return Number.isFinite(valeur) && valeur > 0 ? bornerLargeur(valeur) : LARGEUR_PAR_DEFAUT
  } catch {
    return LARGEUR_PAR_DEFAUT
  }
}

const largeurSidebar = ref(lireLargeurStockee())
const redimensionnementEnCours = ref(false)
let largeurAuDebutDuGeste = 0
let positionXAuDebutDuGeste = 0

function persisterLargeur(valeur: number): void {
  try {
    localStorage.setItem(CLE_LARGEUR_SIDEBAR, String(valeur))
  } catch {
    // Stockage indisponible — la préférence reste valide pour la session en cours.
  }
}

function demarrerRedimensionnement(evenement: PointerEvent): void {
  redimensionnementEnCours.value = true
  largeurAuDebutDuGeste = largeurSidebar.value
  positionXAuDebutDuGeste = evenement.clientX
  // Pendant le geste : curseur cohérent et texte non sélectionnable même
  // quand le pointeur quitte la poignée (les écouteurs sont sur `window`,
  // pas sur la poignée elle-même) — jamais laissé accroché si le geste
  // se termine hors de la poignée.
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', gererDeplacementRedimensionnement)
  window.addEventListener('pointerup', arreterRedimensionnement)
}

function gererDeplacementRedimensionnement(evenement: PointerEvent): void {
  const delta = evenement.clientX - positionXAuDebutDuGeste
  largeurSidebar.value = bornerLargeur(largeurAuDebutDuGeste + delta)
}

function arreterRedimensionnement(): void {
  redimensionnementEnCours.value = false
  persisterLargeur(largeurSidebar.value)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', gererDeplacementRedimensionnement)
  window.removeEventListener('pointerup', arreterRedimensionnement)
}

/** Redimensionnement au clavier (poignée focusable) — accessibilité, pas seulement à la souris/au tactile. */
function gererToucheRedimensionnement(evenement: KeyboardEvent): void {
  if (evenement.key !== 'ArrowLeft' && evenement.key !== 'ArrowRight') return
  evenement.preventDefault()
  const signe = evenement.key === 'ArrowRight' ? 1 : -1
  largeurSidebar.value = bornerLargeur(largeurSidebar.value + signe * PAS_CLAVIER)
  persisterLargeur(largeurSidebar.value)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', gererDeplacementRedimensionnement)
  window.removeEventListener('pointerup', arreterRedimensionnement)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})

const requeteRecherche = ref('')

function lancerRecherche(): void {
  if (requeteRecherche.value.trim().length === 0) return
  void router.push({ name: 'recherche-globale', query: { q: requeteRecherche.value.trim() } })
  requeteRecherche.value = ''
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
        nom: 'Suivi de périodicité',
        icone: 'horloge',
        route: { name: 'suivi-periodicite', params: { clientId } },
        guide: false,
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

/** Id d'épinglage stable pour un outil du site actif — dépend du client, un même outil épinglé pour deux clients différents reste deux raccourcis distincts. */
function idEpinglage(outil: OutilClient): string {
  const clientId = outil.route.params?.clientId ?? ''
  return `${outil.route.name}:${clientId}`
}

function basculerEpinglage(outil: OutilClient): void {
  epinglageStore.basculer({
    id: idEpinglage(outil),
    libelle: `${outil.nom} — ${nomClientActif.value ?? clientActifStore.clientActifId}`,
    routeName: outil.route.name,
    routeParams: outil.route.params ?? {},
  })
}
</script>

<template>
  <nav
    class="sidebar"
    :class="{
      'sidebar--ouverte': props.ouverte,
      'sidebar--redimensionnement': redimensionnementEnCours,
    }"
    :style="{ '--sidebar-largeur': `${largeurSidebar}px` }"
    aria-label="Navigation principale"
  >
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

    <form class="sidebar__recherche" @submit.prevent="lancerRecherche">
      <IconeSvg nom="recherche" :taille="15" />
      <input
        v-model="requeteRecherche"
        type="search"
        placeholder="Rechercher…"
        aria-label="Recherche globale"
      />
    </form>

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
        <RouterLink :to="{ name: 'profil' }">
          <IconeSvg nom="utilisateur" :taille="16" />
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
          <div v-for="outil in groupe.outils" :key="outil.nom" class="sidebar__lien-epinglable">
            <RouterLink :to="outil.route">
              <IconeSvg :nom="outil.icone" :taille="16" />
              {{ outil.nom }}
            </RouterLink>
            <button
              type="button"
              class="sidebar__bouton-epingle"
              :class="{
                'sidebar__bouton-epingle--actif': epinglageStore.estEpingle(idEpinglage(outil)),
              }"
              :aria-label="
                epinglageStore.estEpingle(idEpinglage(outil))
                  ? `Désépingler ${outil.nom}`
                  : `Épingler ${outil.nom}`
              "
              :title="epinglageStore.estEpingle(idEpinglage(outil)) ? 'Désépingler' : 'Épingler'"
              @click="basculerEpinglage(outil)"
            >
              <IconeSvg nom="epingle" :taille="14" />
            </button>
          </div>
        </div>
      </template>
      <div v-else class="sidebar__groupe">
        <p class="sidebar__titre-groupe">Mon site</p>
        <RouterLink :to="{ name: 'gestion-clients' }" class="sidebar__invite">
          Choisissez un client pour accéder à ses outils
        </RouterLink>
      </div>
    </div>
    <div
      class="sidebar__poignee-redimensionnement"
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner la barre latérale"
      :aria-valuenow="Math.round(largeurSidebar)"
      :aria-valuemin="LARGEUR_MIN"
      :aria-valuemax="LARGEUR_MAX"
      tabindex="0"
      @pointerdown="demarrerRedimensionnement"
      @keydown="gererToucheRedimensionnement"
    ></div>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-largeur, 260px);
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
  background-image: linear-gradient(160deg, var(--vp-marque), var(--vp-marque-survol));
  box-shadow: var(--vp-ombre-sm);
  color: var(--vp-marque-bouton-texte);
  font-size: 0.75rem;
  font-weight: var(--vp-poids-bold);
  letter-spacing: 0.02em;
}

.sidebar__nom-produit {
  font-family: var(--vp-police-affichage);
  font-weight: var(--vp-poids-semibold);
  font-size: 1.15rem;
  letter-spacing: -0.01em;
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
  text-decoration: none;
  cursor: pointer;
  padding: 0;
  transition: var(--vp-transition);
}

.sidebar__deconnexion:hover {
  color: var(--vp-marque);
  text-decoration: underline;
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
  color: var(--vp-marque-bouton-texte);
}

.sidebar__recherche {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-secondaire);
}

.sidebar__recherche:focus-within {
  border-color: var(--vp-marque);
}

.sidebar__recherche input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--vp-texte-principal);
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
  background-color: var(--vp-accent-fond-leger);
}

.sidebar__avatar-client {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 999px;
  background-color: var(--vp-accent);
  color: var(--vp-accent-bouton-texte);
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
  color: var(--vp-accent);
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
  box-shadow: inset 2.5px 0 0 var(--vp-marque);
}

.sidebar__groupe a:hover :deep(svg),
.sidebar__groupe a.router-link-active :deep(svg) {
  color: var(--vp-marque);
}

.sidebar__lien-epinglable {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.sidebar__lien-epinglable a {
  flex: 1;
  min-width: 0;
}

.sidebar__bouton-epingle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border: none;
  border-radius: var(--vp-rayon-sm);
  background: transparent;
  color: var(--vp-texte-secondaire);
  opacity: 0;
  cursor: pointer;
  transition: var(--vp-transition);
}

.sidebar__lien-epinglable:hover .sidebar__bouton-epingle,
.sidebar__bouton-epingle--actif {
  opacity: 1;
}

.sidebar__bouton-epingle:hover {
  background-color: var(--vp-fond-page);
  color: var(--vp-marque);
}

.sidebar__bouton-epingle--actif {
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

/* Poignée de redimensionnement (demande explicite de l'utilisateur) — piste
   large (0.75rem) pour rester facile à saisir à la souris/au tactile, mais
   avec un filet visuel étroit (`::after`, 2px) au repos : une poignée
   large en permanence aurait cassé la ligne verticale nette entre sidebar
   et contenu sur les ~40 écrans existants. `position: absolute` s'ancre
   sur `.sidebar` (bloc de positionnement déjà établi par son
   `position: sticky`), jamais un élément séparé dans `CoquilleApplication.vue`
   — la poignée doit suivre la sidebar quel que soit le layout parent. */
.sidebar__poignee-redimensionnement {
  position: absolute;
  top: 0;
  right: -0.375rem;
  width: 0.75rem;
  height: 100%;
  cursor: col-resize;
  touch-action: none;
  z-index: 10;
}

.sidebar__poignee-redimensionnement::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 100%;
  background-color: transparent;
  transition: background-color var(--vp-transition);
}

.sidebar__poignee-redimensionnement:hover::after,
.sidebar__poignee-redimensionnement:focus-visible::after,
.sidebar--redimensionnement .sidebar__poignee-redimensionnement::after {
  background-color: var(--vp-marque);
}

.sidebar__poignee-redimensionnement:focus-visible {
  outline: none;
}

/* Responsive (ajouté — la sidebar restait fixe à 260px, illisible sur un
   écran de téléphone, seule media query de toute l'app hors thème sombre
   avant cette refonte) : sous ~768px, la sidebar quitte le flux (retirée
   du `display:flex` de `CoquilleApplication.vue`, qui laisse alors le
   contenu occuper toute la largeur) et devient un tiroir superposé,
   fermé par défaut (translation hors écran) — piloté par le bouton
   hamburger de `CoquilleApplication.vue` via la prop `ouverte`. */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: 85vw;
    max-width: 300px;
    transform: translateX(-100%);
    transition: transform var(--vp-transition);
    z-index: 60;
    box-shadow: var(--vp-ombre-lg);
  }

  .sidebar--ouverte {
    transform: translateX(0);
  }

  .sidebar__poignee-redimensionnement {
    display: none;
  }
}
</style>

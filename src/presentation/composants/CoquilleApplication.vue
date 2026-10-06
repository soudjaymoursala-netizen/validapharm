<script setup lang="ts">
// Coquille applicative (`docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3) — sidebar partagée + zone de contenu,
// remplace l'affichage nu de `RouterView` dans `App.vue`. N'enveloppe que
// l'état "pret" de l'application — jamais l'écran de blocage au démarrage.
//
// Écran de connexion : la sidebar n'a aucun sens tant
// qu'aucune session n'existe (ses liens mènent tous à des routes gardées
// qui renverraient immédiatement vers `/connexion`) — elle brouillait la
// première impression du produit et laissait deviner la navigation
// complète avant authentification. `Login.vue` reste donc affiché seul,
// pleine page, sans la coquille.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BarreLaterale from './BarreLaterale.vue'
import IconeSvg from './IconeSvg.vue'
import { useConnectiviteServeurStore } from '../stores/useConnectiviteServeurStore'
import { useErreursGlobalesStore } from '../stores/useErreursGlobalesStore'

const route = useRoute()
const connectivite = useConnectiviteServeurStore()
const erreursGlobales = useErreursGlobalesStore()

// Recharge la page : chaque écran relance ses chargements, et le bandeau
// disparaît de lui-même dès que le serveur répond à nouveau.
function reessayer(): void {
  window.location.reload()
}
function allerAuContenu(): void {
  const cible = document.querySelector<HTMLElement>(
    '#contenu-principal main, #contenu-principal h1',
  )
  if (!cible) return
  cible.setAttribute('tabindex', '-1')
  cible.focus()
}
const ROUTES_SANS_BARRE = new Set(['connexion', 'definir-mot-de-passe', 'mot-de-passe-oublie'])
const masquerSidebar = computed(() => ROUTES_SANS_BARRE.has(String(route.name)))
/**
 * Clé de l'écran affiché : change avec le nom de route ET ses paramètres
 * (jamais la requête). Sans elle, passer du même outil d'un client A à
 * celui d'un client B réutilisait le composant déjà monté, qui ne charge
 * qu'au montage : l'écran montrait encore les données de A sous l'adresse
 * de B, et une évaluation pouvait être enregistrée dans B avec la méthode
 * de A (audit d'intégrité front du 25/09/2026, C5).
 */
const cleEcran = computed(() => `${String(route.name)}:${JSON.stringify(route.params)}`)

// Menu mobile (responsive, ajouté) — état transitoire de navigation,
// jamais une donnée métier ni persistée (même discipline que
// `useClientActifStore`) : sous ~768px la sidebar passe en tiroir
// superposé plutôt que de rester fixe à 260px, illisible sur un écran de
// téléphone (trouvé en vérifiant l'app à largeur mobile — aucune media
// query dans toute l'app hors thème sombre). Refermé automatiquement à
// chaque changement de route, comportement standard d'un tiroir mobile.
const menuMobileOuvert = ref(false)
const boutonMenu = ref<HTMLButtonElement | null>(null)
watch(
  () => route.fullPath,
  () => {
    menuMobileOuvert.value = false
    // Les erreurs d'un écran quitté ne concernent plus l'écran affiché.
    erreursGlobales.toutFermer()
  },
)

// Après un changement d'écran (pas d'un simple paramètre de requête, comme
// la recherche), le focus passe au titre de la page : sinon il reste sur le
// lien de la barre latérale et un lecteur d'écran n'annonce rien (audit UX
// entrée #6, WCAG 2.4.3).
watch(
  () => route.path,
  async (_nouveau, ancien) => {
    if (!ancien) return
    await nextTick()
    const titre = document.querySelector<HTMLElement>('main h1, #contenu-principal h1')
    if (!titre) return
    titre.setAttribute('tabindex', '-1')
    titre.focus({ preventScroll: true })
  },
)

// Tiroir mobile (audit UX entrée #5, WCAG 2.4.3) : fermé, la navigation est
// inerte (ses liens hors écran ne reçoivent plus le focus) ; ouvert, Échap
// le referme et rend le focus au bouton.
const ecranEtroit = ref(false)
let requeteEtroite: MediaQueryList | null = null
function majEcranEtroit(): void {
  ecranEtroit.value = requeteEtroite?.matches ?? false
}
function surTouche(e: KeyboardEvent): void {
  if (e.key === 'Escape' && menuMobileOuvert.value) {
    menuMobileOuvert.value = false
    boutonMenu.value?.focus()
  }
}
onMounted(() => {
  if (typeof window.matchMedia === 'function') {
    requeteEtroite = window.matchMedia('(max-width: 768px)')
    requeteEtroite.addEventListener?.('change', majEcranEtroit)
    majEcranEtroit()
  }
  window.addEventListener('keydown', surTouche)
})
onBeforeUnmount(() => {
  requeteEtroite?.removeEventListener?.('change', majEcranEtroit)
  window.removeEventListener('keydown', surTouche)
})
</script>

<template>
  <div class="coquille-application">
    <a
      v-if="!masquerSidebar"
      href="#contenu-principal"
      class="lien-evitement"
      @click.prevent="allerAuContenu"
    >
      Aller au contenu
    </a>
    <button
      v-if="!masquerSidebar"
      ref="boutonMenu"
      type="button"
      class="coquille-application__bouton-menu"
      :aria-expanded="menuMobileOuvert"
      :aria-label="menuMobileOuvert ? 'Fermer la navigation' : 'Ouvrir la navigation'"
      @click="menuMobileOuvert = !menuMobileOuvert"
    >
      <IconeSvg :nom="menuMobileOuvert ? 'fermer' : 'menu'" :taille="20" />
    </button>
    <div v-if="!masquerSidebar" class="coquille-application__barre-mobile" aria-hidden="true">
      <span class="coquille-application__titre-mobile">
        {{ typeof route.meta.titre === 'string' ? route.meta.titre : 'ValidaPharm' }}
      </span>
    </div>
    <div
      v-if="!masquerSidebar && menuMobileOuvert"
      class="coquille-application__fond"
      aria-hidden="true"
      @click="menuMobileOuvert = false"
    />
    <BarreLaterale
      v-if="!masquerSidebar"
      :ouverte="menuMobileOuvert"
      :inert="ecranEtroit && !menuMobileOuvert"
    />
    <div id="contenu-principal" class="coquille-application__contenu">
      <p v-if="connectivite.serveurInjoignable" class="bandeau-serveur-injoignable" role="alert">
        <IconeSvg nom="alerte-triangle" :taille="18" />
        Serveur injoignable : les données affichées peuvent être incomplètes ou vides à tort.
        N'enregistrez rien de nouveau avant le retour de la connexion.
        <button type="button" @click="reessayer">Réessayer</button>
      </p>
      <div v-if="erreursGlobales.erreurs.length > 0" class="erreurs-globales" role="alert">
        <p v-for="e in erreursGlobales.erreurs" :key="e.id" class="erreurs-globales__message">
          <span>Action non aboutie : {{ e.message }}</span>
          <button type="button" @click="erreursGlobales.fermer(e.id)">Fermer</button>
        </p>
      </div>
      <RouterView :key="cleEcran" />
    </div>
  </div>
</template>

<style scoped>
.coquille-application {
  display: flex;
  min-height: 100vh;
}

.coquille-application__contenu {
  flex: 1;
  min-width: 0;
}

.bandeau-serveur-injoignable {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  padding: 0.75rem 1rem;
  background-color: var(--vp-danger-fond-leger);
  color: var(--vp-danger);
  border-bottom: 1px solid var(--vp-danger);
}

.erreurs-globales {
  position: sticky;
  top: 0;
  z-index: 49;
  display: flex;
  flex-direction: column;
}

.erreurs-globales__message {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  padding: 0.6rem 1rem;
  background-color: var(--vp-danger-fond-leger);
  color: var(--vp-danger);
  border-bottom: 1px solid var(--vp-danger);
}

.coquille-application__bouton-menu {
  display: none;
}

.lien-evitement {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  padding: 0.5rem 1rem;
  background-color: var(--vp-marque);
  color: #fff;
  transform: translateY(-120%);
}

.lien-evitement:focus {
  transform: translateY(0);
}

.coquille-application__fond {
  display: none;
}

.coquille-application__barre-mobile {
  display: none;
}

/* Responsive (ajouté, voir note dans BarreLaterale.vue) — bouton hamburger
   fixe + fond assombri derrière le tiroir ouvert. `padding-top` réservé sur
   le contenu pour qu'aucun écran (chacun avec son propre `.lien-retour` en
   haut à gauche) ne chevauche visuellement le bouton, sans toucher aux ~40
   écrans un par un. */
@media (max-width: 768px) {
  .coquille-application__bouton-menu {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 70;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--vp-rayon-sm);
    border: 1px solid var(--vp-bordure);
    background-color: var(--vp-fond-carte);
    color: var(--vp-texte-principal);
    box-shadow: var(--vp-ombre-sm);
    cursor: pointer;
    transition: var(--vp-transition);
  }

  .coquille-application__bouton-menu:hover {
    color: var(--vp-marque);
    border-color: var(--vp-marque);
  }

  .coquille-application__barre-mobile {
    display: flex;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3.5rem;
    z-index: 60;
    padding-left: 4rem;
    background-color: var(--vp-fond-carte);
    border-bottom: 1px solid var(--vp-bordure);
  }

  .coquille-application__titre-mobile {
    font-weight: var(--vp-poids-medium);
    color: var(--vp-texte-principal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bandeau-serveur-injoignable,
  .erreurs-globales {
    top: 3.5rem;
  }

  .coquille-application__fond {
    display: block;
    position: fixed;
    inset: 0;
    background-color: rgba(20, 21, 42, 0.4);
    z-index: 55;
  }

  .coquille-application__contenu {
    padding-top: 3.5rem;
  }
}
</style>

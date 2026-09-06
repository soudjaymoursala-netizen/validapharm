<script setup lang="ts">
// Écran d'accueil "Que voulez-vous faire ?" — refonte du 06/09/2026
// (parcours utilisateur détaillé donné par l'utilisateur, §4) : l'accueil
// ne doit pas être un dashboard générique mais répondre directement à
// « Où en étais-je et qu'est-ce que je dois faire maintenant ? ». Chaque
// bloc s'appuie sur des données réelles déjà persistées (jamais une
// suggestion fabriquée) :
// - "Continuer mon travail" : le projet actif le plus récemment modifié
//   (`Project.updated_at`, déjà trié par `useProjectsStore`), avec un
//   compte réel de sections validées — jamais un pourcentage de
//   "progression" inventé (`PipelineQualification.vue` documente déjà
//   pourquoi une telle progression ne doit jamais être fabriquée).
// - "Mes clients" : comptage réel actifs/archivés (`useClientsStore`).
// - "À vérifier" : agrégats réels et bon marché sur des tables déjà
//   indexées par statut — `KnowledgeItem.statut === 'a_valider'`
//   (Source Intelligence) et `Conflict.statut === 'ouvert'` — jamais une
//   analyse structurelle coûteuse sur tous les projets à chaque visite de
//   l'accueil (`detecterEcartsStructurels` reste une vue par projet, sur
//   la Fiche Projet).
// - "Mes projets" : les projets actifs les plus récents.
// - "Raccourcis épinglés" (§5 du parcours) : `useEpinglageStore`.
import { computed, onMounted, ref } from 'vue'
import type { Project } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useClientsStore } from '../stores/useClientsStore'
import { useEpinglageStore, type RaccourciEpingle } from '../stores/useEpinglageStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import IconeSvg, { type NomIcone } from '../composants/IconeSvg.vue'

const clientActifStore = useClientActifStore()
const clientsStore = useClientsStore()
const projetsStore = useProjectsStore()
const epinglageStore = useEpinglageStore()

const chargementTermine = ref(false)
const erreurChargementClients = ref<string | null>(null)
const nbInformationsAValider = ref(0)
const nbConflitsOuverts = ref(0)
const sectionsDernierProjet = ref<{ total: number; validees: number } | null>(null)

const dernierProjetActif = computed<Project | null>(() => projetsStore.projetsActifs[0] ?? null)

function nomClient(clientId: string | null): string | null {
  if (!clientId) return null
  return clientsStore.clients.find((c) => c.id === clientId)?.name ?? null
}

onMounted(async () => {
  // `chargerClients` appelle le Worker d'authentification par le réseau
  // (D1, source de vérité) — un incident réseau ponctuel ne doit jamais
  // bloquer indéfiniment le reste de l'accueil (projets/sections/
  // informations à vérifier, tous locaux IndexedDB), d'où l'isolement
  // explicite de cet appel plutôt qu'un unique `Promise.all` qui aurait
  // laissé toute la grille bloquée en chargement sur un rejet non
  // rattrapé.
  await projetsStore.chargerProjets()
  try {
    await clientsStore.chargerClients()
  } catch (e) {
    erreurChargementClients.value =
      e instanceof Error ? e.message : 'Erreur inconnue lors du chargement des clients.'
  }

  const projet = dernierProjetActif.value
  if (projet) {
    const sections = await db.sections.where('project_id').equals(projet.id).toArray()
    sectionsDernierProjet.value = {
      total: sections.length,
      validees: sections.filter((s) => s.status === 'valide_en_interne').length,
    }
  }

  nbInformationsAValider.value = await db.knowledgeItems.where('statut').equals('a_valider').count()
  nbConflitsOuverts.value = await db.conflicts.where('statut').equals('ouvert').count()
  chargementTermine.value = true
})

interface CarteAction {
  titre: string
  description: string
  icone: NomIcone
  route: { name: string; params?: Record<string, string> }
}

const cartes: CarteAction[] = [
  {
    titre: 'Gérer mes clients',
    description: 'Ajouter un client, configurer ses outils (Structure Système, IA, Drive).',
    icone: 'utilisateur',
    route: { name: 'gestion-clients' },
  },
  {
    titre: 'Configurer la connexion GitHub',
    description: 'Dépôt de données, jeton — nécessaire pour synchroniser et récupérer.',
    icone: 'engrenage',
    route: { name: 'configuration-client' },
  },
]

function ouvrirRaccourci(raccourci: RaccourciEpingle): {
  name: string
  params: Record<string, string>
} {
  return { name: raccourci.routeName, params: raccourci.routeParams }
}
</script>

<template>
  <main class="accueil">
    <h1>Que voulez-vous faire ?</h1>
    <p class="accueil__sous-titre">
      Choisissez une action pour démarrer, ou reprenez là où vous en étiez.
    </p>

    <RouterLink
      v-if="dernierProjetActif"
      class="accueil__reprise"
      :to="{ name: 'fiche-projet', params: { projectId: dernierProjetActif.id } }"
    >
      <span class="accueil__reprise-icone" aria-hidden="true">
        <IconeSvg nom="flux" :taille="20" />
      </span>
      <span class="accueil__reprise-texte-bloc">
        <span class="accueil__reprise-eyebrow">Continuer mon travail</span>
        <span class="accueil__reprise-titre">{{ dernierProjetActif.name }}</span>
        <span class="accueil__reprise-texte">
          {{ nomClient(dernierProjetActif.client_id) ?? 'Sans client' }}
          <template v-if="sectionsDernierProjet && sectionsDernierProjet.total > 0">
            — {{ sectionsDernierProjet.validees }}/{{ sectionsDernierProjet.total }} section(s)
            validée(s)
          </template>
        </span>
      </span>
      <IconeSvg nom="chevron-droit" :taille="18" class="accueil__reprise-fleche" />
    </RouterLink>

    <div v-if="chargementTermine" class="accueil__grille">
      <section class="accueil__bloc">
        <h2>Mes clients</h2>
        <p v-if="erreurChargementClients" class="accueil__erreur" role="alert">
          Impossible de charger vos clients pour l'instant ({{ erreurChargementClients }}).
        </p>
        <RouterLink v-else :to="{ name: 'gestion-clients' }" class="accueil__ligne-stat">
          <span>Clients actifs</span>
          <strong>{{ clientsStore.clientsActifs.length }}</strong>
        </RouterLink>
        <RouterLink
          v-if="!erreurChargementClients"
          :to="{ name: 'gestion-clients' }"
          class="accueil__ligne-stat"
        >
          <span>Clients archivés</span>
          <strong>{{ clientsStore.clientsArchives.length }}</strong>
        </RouterLink>
      </section>

      <section
        class="accueil__bloc"
        :class="{ 'accueil__bloc--alerte': nbInformationsAValider + nbConflitsOuverts > 0 }"
      >
        <h2>À vérifier</h2>
        <p v-if="nbInformationsAValider + nbConflitsOuverts === 0" class="accueil__etat-vide">
          Rien à vérifier pour l'instant.
        </p>
        <template v-else>
          <RouterLink
            v-if="nbInformationsAValider > 0 && clientActifStore.clientActifId"
            :to="{
              name: 'source-intelligence',
              params: { clientId: clientActifStore.clientActifId },
            }"
            class="accueil__ligne-stat"
          >
            <span>Information(s) extraite(s) non validée(s)</span>
            <strong>{{ nbInformationsAValider }}</strong>
          </RouterLink>
          <p v-else-if="nbInformationsAValider > 0" class="accueil__ligne-stat">
            <span>Information(s) extraite(s) non validée(s)</span>
            <strong>{{ nbInformationsAValider }}</strong>
          </p>
          <p v-if="nbConflitsOuverts > 0" class="accueil__ligne-stat">
            <span>Conflit(s) non résolu(s)</span>
            <strong>{{ nbConflitsOuverts }}</strong>
          </p>
        </template>
      </section>

      <section class="accueil__bloc">
        <h2>Mes projets</h2>
        <p v-if="projetsStore.projetsActifs.length === 0" class="accueil__etat-vide">
          Aucun projet actif pour l'instant.
        </p>
        <RouterLink
          v-for="projet in projetsStore.projetsActifs.slice(0, 5)"
          :key="projet.id"
          :to="{ name: 'fiche-projet', params: { projectId: projet.id } }"
          class="accueil__ligne-projet"
        >
          <span class="accueil__ligne-projet-nom">{{ projet.name }}</span>
          <span class="accueil__ligne-projet-client">{{
            nomClient(projet.client_id) ?? 'Sans client'
          }}</span>
        </RouterLink>
        <RouterLink :to="{ name: 'tableau-de-bord' }" class="accueil__voir-tout"
          >Voir tous mes projets</RouterLink
        >
      </section>

      <section class="accueil__bloc">
        <h2>Raccourcis épinglés</h2>
        <p v-if="epinglageStore.raccourcis.length === 0" class="accueil__etat-vide">
          Aucun raccourci épinglé — épinglez un outil depuis la navigation d'un site pour le
          retrouver ici.
        </p>
        <div
          v-for="raccourci in epinglageStore.raccourcis"
          :key="raccourci.id"
          class="accueil__ligne-epingle"
        >
          <RouterLink :to="ouvrirRaccourci(raccourci)">{{ raccourci.libelle }}</RouterLink>
          <button
            type="button"
            class="accueil__bouton-desepingler"
            :aria-label="`Désépingler ${raccourci.libelle}`"
            @click="epinglageStore.desepingler(raccourci.id)"
          >
            <IconeSvg nom="epingle" :taille="14" />
          </button>
        </div>
      </section>
    </div>

    <div class="accueil__cartes">
      <RouterLink
        v-for="carte in cartes"
        :key="carte.titre"
        :to="carte.route"
        class="accueil__carte"
      >
        <span class="accueil__carte-icone" aria-hidden="true">
          <IconeSvg :nom="carte.icone" :taille="20" />
        </span>
        <h2>{{ carte.titre }}</h2>
        <p>{{ carte.description }}</p>
        <IconeSvg nom="chevron-droit" :taille="16" class="accueil__carte-fleche" />
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.accueil {
  max-width: 1080px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.accueil h1 {
  margin: 0 0 0.4rem;
  font-size: 1.75rem;
  font-weight: var(--vp-poids-bold);
}

.accueil__sous-titre {
  margin: 0 0 1.75rem;
  color: var(--vp-texte-secondaire);
}

.accueil__reprise {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.3rem;
  margin-bottom: 1.5rem;
  border-radius: var(--vp-rayon-lg);
  background-color: var(--vp-marque);
  background-image: linear-gradient(135deg, var(--vp-marque), var(--vp-marque-survol));
  color: var(--vp-marque-bouton-texte);
  text-decoration: none;
  box-shadow: var(--vp-ombre-md);
  transition: var(--vp-transition);
}

.accueil__reprise:hover {
  box-shadow: var(--vp-ombre-lg);
  transform: translateY(-1px);
}

.accueil__reprise-icone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border-radius: var(--vp-rayon);
  background-color: rgba(255, 255, 255, 0.18);
}

.accueil__reprise-texte-bloc {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.accueil__reprise-eyebrow {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.accueil__reprise-titre {
  font-weight: var(--vp-poids-semibold);
  font-size: 1.02rem;
}

.accueil__reprise-texte {
  display: block;
  font-size: 0.85rem;
  opacity: 0.85;
}

.accueil__reprise-fleche {
  margin-left: auto;
  flex-shrink: 0;
}

.accueil__grille {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.accueil__bloc {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  background-color: var(--vp-fond-carte);
  box-shadow: var(--vp-ombre-sm);
  padding: 1.1rem 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.accueil__bloc--alerte {
  border-color: var(--vp-danger);
}

.accueil__bloc h2 {
  margin: 0 0 0.3rem;
  font-size: 0.95rem;
  font-weight: var(--vp-poids-semibold);
}

.accueil__etat-vide {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
  font-style: italic;
}

.accueil__erreur {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-danger);
}

.accueil__ligne-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.3rem 0;
  color: var(--vp-texte-principal);
  text-decoration: none;
  font-size: 0.88rem;
}

.accueil__ligne-stat strong {
  color: var(--vp-marque);
}

.accueil__ligne-projet {
  display: flex;
  flex-direction: column;
  padding: 0.4rem 0;
  border-top: 1px solid var(--vp-bordure);
  color: var(--vp-texte-principal);
  text-decoration: none;
}

.accueil__ligne-projet:first-of-type {
  border-top: none;
}

.accueil__ligne-projet-nom {
  font-size: 0.88rem;
  font-weight: var(--vp-poids-medium);
}

.accueil__ligne-projet-client {
  font-size: 0.76rem;
  color: var(--vp-texte-secondaire);
}

.accueil__voir-tout {
  margin-top: 0.3rem;
  font-size: 0.82rem;
  color: var(--vp-marque);
}

.accueil__ligne-epingle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.3rem 0;
  border-top: 1px solid var(--vp-bordure);
}

.accueil__ligne-epingle:first-of-type {
  border-top: none;
}

.accueil__ligne-epingle a {
  color: var(--vp-texte-principal);
  text-decoration: none;
  font-size: 0.88rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.accueil__bouton-desepingler {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border: none;
  border-radius: var(--vp-rayon-sm);
  background: transparent;
  color: var(--vp-marque);
  cursor: pointer;
}

.accueil__bouton-desepingler:hover {
  background-color: var(--vp-fond-page);
}

.accueil__cartes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.accueil__carte {
  position: relative;
  display: block;
  padding: 1.4rem 1.5rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  background-color: var(--vp-fond-carte);
  color: var(--vp-texte-principal);
  text-decoration: none;
  box-shadow: var(--vp-ombre-sm);
  transition: var(--vp-transition);
}

.accueil__carte:hover {
  border-color: var(--vp-marque);
  box-shadow: var(--vp-ombre-md);
  transform: translateY(-2px);
}

.accueil__carte-icone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-bottom: 0.9rem;
  border-radius: var(--vp-rayon);
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

.accueil__carte h2 {
  margin: 0 0 0.4rem;
  font-size: 1.02rem;
  font-weight: var(--vp-poids-semibold);
  color: var(--vp-texte-principal);
}

.accueil__carte p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
  line-height: 1.5;
}

.accueil__carte-fleche {
  position: absolute;
  top: 1.4rem;
  right: 1.3rem;
  color: var(--vp-texte-secondaire);
  opacity: 0;
  transition: var(--vp-transition);
}

.accueil__carte:hover .accueil__carte-fleche {
  opacity: 1;
  color: var(--vp-marque);
}
</style>

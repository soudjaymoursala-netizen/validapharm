<script setup lang="ts">
// Écran d'accueil "Que voulez-vous faire ?" (Phase 16, `docs/convergence/
// PHASE_16_COQUILLE_UX_SPEC.md` §3) — remplace la racine `/` occupée
// jusqu'ici par le Tableau de bord (déplacé vers `/tableau-de-bord`,
// même nom de route, aucune régression des liens existants). Cartes
// d'action vers des capacités réellement construites — jamais une
// fonctionnalité aspirationnelle non construite.
//
// Refonte visuelle v20 : icônes par carte, carte "reprendre" mise en
// avant si un client est déjà actif (donnée réelle, `useClientActifStore`
// — jamais une suggestion fabriquée). Pure présentation, aucune nouvelle
// route ni capacité.
import { onMounted, ref } from 'vue'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useClientsStore } from '../stores/useClientsStore'
import IconeSvg, { type NomIcone } from '../composants/IconeSvg.vue'

const clientActifStore = useClientActifStore()
const clientsStore = useClientsStore()
const nomClientActif = ref<string | null>(null)

onMounted(async () => {
  const clientId = clientActifStore.clientActifId
  if (clientId) {
    nomClientActif.value = (await clientsStore.obtenirClient(clientId))?.name ?? null
  }
})

interface CarteAction {
  titre: string
  description: string
  icone: NomIcone
  route: { name: string; params?: Record<string, string> }
}

const cartes: CarteAction[] = [
  {
    titre: 'Voir mes projets',
    description: 'Reprendre un projet en cours ou en créer un nouveau.',
    icone: 'dossier',
    route: { name: 'tableau-de-bord' },
  },
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
</script>

<template>
  <main class="accueil">
    <h1>Que voulez-vous faire ?</h1>
    <p class="accueil__sous-titre">
      Choisissez une action pour démarrer, ou reprenez là où vous en étiez.
    </p>

    <RouterLink
      v-if="clientActifStore.clientActifId"
      class="accueil__reprise"
      :to="{ name: 'structure-systeme', params: { clientId: clientActifStore.clientActifId } }"
    >
      <span class="accueil__reprise-icone" aria-hidden="true">
        <IconeSvg nom="flux" :taille="20" />
      </span>
      <span>
        <span class="accueil__reprise-titre"
          >Continuer sur {{ nomClientActif ?? 'votre site actif' }}</span
        >
        <span class="accueil__reprise-texte">Reprendre le travail là où vous l'avez laissé.</span>
      </span>
      <IconeSvg nom="chevron-droit" :taille="18" class="accueil__reprise-fleche" />
    </RouterLink>

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
  max-width: 960px;
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
  color: white;
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

.accueil__reprise-titre {
  display: block;
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
  background-color: var(--vp-fond-page);
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

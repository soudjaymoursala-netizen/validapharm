<script setup lang="ts">
// Fiche Client / Site (§13-15 du prompt maître du 03/09/2026) —
// remplace la navigation à plat (barre latérale listant ~15 outils) par
// la page d'entrée unique décrite dans le parcours demandé : cliquer sur
// un client depuis « Mes clients » ouvre cette page, avec les 5 branches
// (Architecture, Process, Procédures, Templates & Formulaires, Projets).
// Les outils plus spécialisés (assessments, tests, IA, etc.) restent
// atteignables — Mode Expert de la barre latérale — cohérent avec le
// principe du prompt maître §12 : « l'accès direct aux briques expertes
// ne doit jamais disparaître » ; cette page est le Mode 1 (« travail
// contextuel »), la barre latérale reste le Mode 2 (« expert »).
import { computed, onMounted, ref, watch } from 'vue'
import type { SecteurClient } from '../../logique-metier/domaine/types'
import { useAuthStore } from '../stores/useAuthStore'
import { useClientsStore } from '../stores/useClientsStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import IconeSvg, { type NomIcone } from '../composants/IconeSvg.vue'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const projetsStore = useProjectsStore()

const modeEdition = ref(false)
const brouillon = ref({
  name: '',
  adresse: '',
  secteur: '' as SecteurClient | '',
  details: '',
})
const erreurEnregistrement = ref<string | null>(null)

// Codes métier renvoyés par le Worker pour PATCH /clients/:id
// (`gererModifierClient`, routeur.ts) — un repli générique couvre tout
// autre code, ou une panne de connectivité réelle (`IndisponibleAuthError`
// etc., levée par `AuthApiClient` plutôt que renvoyée, d'où le `catch`).
const LIBELLES_ERREUR: Record<string, string> = {
  introuvable: "Ce client n'existe plus (probablement supprimé entre-temps).",
  non_autorise: "Vous n'avez pas les droits nécessaires pour modifier ce client.",
}

function libelleErreur(e: unknown): string {
  if (e && typeof e === 'object' && 'erreur' in e && typeof e.erreur === 'string') {
    return LIBELLES_ERREUR[e.erreur] ?? `Échec (${e.erreur}).`
  }
  return e instanceof Error ? e.message : 'Erreur inconnue.'
}

const LIBELLES_SECTEUR: Record<SecteurClient, string> = {
  pharmaceutique: 'Pharmaceutique',
  dispositif_medical: 'Dispositif médical',
  autre: 'Autre',
}

const clientCourant = computed(() => clientsStore.clients.find((c) => c.id === props.clientId))

// Règle de signature (décision utilisateur du 26/09/2026) : modifiable par
// le créateur du client ou un admin — même garde que le Worker.
const authStore = useAuthStore()
const peutReglerSignature = computed(
  () =>
    authStore.estAdmin ||
    (clientCourant.value?.created_by_user_id ?? null) === (authStore.utilisateur?.id ?? ''),
)
const erreurSignature = ref<string | null>(null)
const enregistrementSignature = ref(false)

async function basculerSeparationTaches(evenement: Event): Promise<void> {
  const active = (evenement.target as HTMLInputElement).checked
  erreurSignature.value = null
  enregistrementSignature.value = true
  try {
    const resultat = await clientsStore.definirSeparationTaches(props.clientId, active)
    if ('erreur' in resultat) erreurSignature.value = libelleErreur(resultat)
  } catch (e) {
    erreurSignature.value = libelleErreur(e)
  } finally {
    enregistrementSignature.value = false
  }
}

function reinitialiserBrouillon(): void {
  const client = clientCourant.value
  brouillon.value = {
    name: client?.name ?? '',
    adresse: client?.adresse ?? '',
    secteur: client?.secteur ?? '',
    details: client?.details ?? '',
  }
}

async function charger(): Promise<void> {
  await clientsStore.chargerClients()
  await projetsStore.chargerProjets()
  reinitialiserBrouillon()
}

onMounted(charger)

// Navigation d'un client à un autre : la route (`/clients/:clientId`) est
// la même, Vue Router réutilise donc la même instance de composant — sans
// ce watcher, le brouillon d'édition afficherait encore les informations
// de l'ancien client.
watch(() => props.clientId, charger)

async function enregistrer(): Promise<void> {
  if (brouillon.value.name.trim().length === 0) return
  erreurEnregistrement.value = null
  try {
    const resultat = await clientsStore.modifierClient(props.clientId, {
      name: brouillon.value.name.trim(),
      adresse: brouillon.value.adresse.trim() || null,
      secteur: brouillon.value.secteur || null,
      details: brouillon.value.details.trim() || null,
    })
    // Avant ce correctif, ce résultat n'était jamais vérifié : un échec
    // (client supprimé entre-temps, droits insuffisants...) refermait quand
    // même le formulaire d'édition, comme un succès, en perdant les
    // modifications saisies sans aucun message — même défaut déjà corrigé
    // dans GestionClients.vue (voir docs/CHANTIER-PAGES-RECAP.md).
    if ('erreur' in resultat) {
      erreurEnregistrement.value = libelleErreur(resultat)
      return
    }
    modeEdition.value = false
  } catch (e) {
    erreurEnregistrement.value = libelleErreur(e)
  }
}

function ouvrirEdition(): void {
  reinitialiserBrouillon()
  erreurEnregistrement.value = null
  modeEdition.value = true
}

interface Branche {
  nom: string
  description: string
  icone: NomIcone
  route: { name: string; params?: Record<string, string>; query?: Record<string, string> }
}

const branches = computed<Branche[]>(() => [
  {
    nom: 'Architecture',
    description:
      'Organisation du site : bâtiments, lignes, systèmes, équipements, utilités, liaisons — import Excel ou construction manuelle.',
    icone: 'batiment',
    route: { name: 'structure-systeme', params: { clientId: props.clientId } },
  },
  {
    nom: 'Process',
    description: 'Procédés du site, leurs fonctions et leur rattachement à l’architecture.',
    icone: 'flux',
    route: { name: 'gestion-process', params: { clientId: props.clientId } },
  },
  {
    nom: 'Procédures',
    description: 'Procédures CQV/CSV et de production — référençables depuis un livrable.',
    icone: 'reglettes',
    route: { name: 'revue-structure-procedure', params: { clientId: props.clientId } },
  },
  {
    nom: 'Templates & Formulaires',
    description: 'Gabarits officiels ou anciens protocoles réutilisables pour créer un livrable.',
    icone: 'dossier',
    route: { name: 'templates-formulaires', params: { clientId: props.clientId } },
  },
  {
    nom: 'Projets',
    description: 'Les différents projets menés chez ce client — contexte, phases, livrables.',
    icone: 'graphique',
    route: { name: 'tableau-de-bord', query: { clientId: props.clientId } },
  },
])

const projetsDuClient = computed(() =>
  projetsStore.projetsActifs.filter((p) => p.client_id === props.clientId).slice(0, 5),
)
</script>

<template>
  <main class="fiche-client">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Mes clients</RouterLink>

    <header class="entete-client">
      <h1>{{ clientCourant?.name ?? props.clientId }}</h1>
      <button
        type="button"
        class="bouton-secondaire"
        @click="modeEdition ? (modeEdition = false) : ouvrirEdition()"
      >
        {{ modeEdition ? 'Annuler' : 'Modifier les informations' }}
      </button>
    </header>

    <form v-if="modeEdition" class="formulaire-edition" @submit.prevent="enregistrer">
      <label>
        Nom de l'entreprise
        <input v-model="brouillon.name" type="text" required />
      </label>
      <label>
        Adresse
        <input v-model="brouillon.adresse" type="text" />
      </label>
      <label>
        Secteur
        <select v-model="brouillon.secteur">
          <option value="">— non renseigné —</option>
          <option value="pharmaceutique">Pharmaceutique</option>
          <option value="dispositif_medical">Dispositif médical</option>
          <option value="autre">Autre</option>
        </select>
      </label>
      <label>
        Détails (produits fabriqués, contexte industriel…)
        <textarea v-model="brouillon.details" rows="3" />
      </label>
      <p v-if="erreurEnregistrement" class="bandeau-erreur" role="alert">
        {{ erreurEnregistrement }}
      </p>
      <button type="submit" class="bouton-principal">Enregistrer</button>
    </form>

    <dl
      v-else-if="clientCourant?.adresse || clientCourant?.secteur || clientCourant?.details"
      class="details-client"
    >
      <template v-if="clientCourant?.adresse">
        <dt>Adresse</dt>
        <dd>{{ clientCourant.adresse }}</dd>
      </template>
      <template v-if="clientCourant?.secteur">
        <dt>Secteur</dt>
        <dd>
          <span class="badge-secteur">{{ LIBELLES_SECTEUR[clientCourant.secteur] }}</span>
        </dd>
      </template>
      <template v-if="clientCourant?.details">
        <dt>Détails</dt>
        <dd>{{ clientCourant.details }}</dd>
      </template>
    </dl>

    <section class="carte regle-signature" aria-labelledby="titre-regle-signature">
      <h2 id="titre-regle-signature" class="carte__titre-discret">Règle de signature</h2>
      <p>
        Approuver une section ou un test, et clôturer une exécution, demandent toujours la ressaisie
        du mot de passe.
      </p>
      <label v-if="peutReglerSignature" class="case">
        <input
          type="checkbox"
          :checked="clientCourant?.separation_taches === true"
          :disabled="enregistrementSignature"
          @change="basculerSeparationTaches"
        />
        Séparation des tâches : l'auteur d'une section ou d'un test ne peut pas l'approuver
        lui-même, et la personne qui a exécuté un test ne peut pas clôturer son exécution.
      </label>
      <p v-else>
        Séparation des tâches :
        <strong>{{ clientCourant?.separation_taches ? 'activée' : 'désactivée' }}</strong>
        (réglée par le créateur du client ou un administrateur).
      </p>
      <p v-if="erreurSignature" class="bandeau-erreur" role="alert">{{ erreurSignature }}</p>
    </section>

    <section class="branches">
      <RouterLink
        v-for="branche in branches"
        :key="branche.nom"
        :to="branche.route"
        class="branche"
      >
        <span class="branche__icone" aria-hidden="true">
          <IconeSvg :nom="branche.icone" :taille="20" />
        </span>
        <h2>{{ branche.nom }}</h2>
        <p>{{ branche.description }}</p>
        <IconeSvg nom="chevron-droit" :taille="16" class="branche__fleche" />
      </RouterLink>
    </section>

    <section v-if="projetsDuClient.length > 0" class="carte apercu-projets">
      <h2 class="carte__titre-discret">Projets récents</h2>
      <ul>
        <li v-for="projet in projetsDuClient" :key="projet.id">
          <RouterLink :to="{ name: 'fiche-projet', params: { projectId: projet.id } }">
            {{ projet.name }}
          </RouterLink>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.regle-signature {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.regle-signature p {
  margin: 0;
}

.regle-signature .case {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.regle-signature .case input {
  margin-top: 0.2rem;
}

.fiche-client {
  padding: 2.5rem;
  max-width: 60rem;
  margin: 0 auto;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.entete-client {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.entete-client h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: var(--vp-poids-bold);
}

.formulaire-edition,
.details-client {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem 1.25rem;
}

.formulaire-edition {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 32rem;
}

.formulaire-edition label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.formulaire-edition input,
.formulaire-edition select,
.formulaire-edition textarea {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem;
  font-family: inherit;
  color: var(--vp-texte-principal);
}

.bandeau-erreur {
  margin: 0;
  color: var(--vp-danger);
  font-size: 0.85rem;
}

.details-client {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.4rem 1.5rem;
  margin: 0;
}

.details-client dt {
  color: var(--vp-texte-secondaire);
  font-size: 0.85rem;
}

.details-client dd {
  margin: 0;
}

/* Même présentation que `.badge-secteur` de GestionClients.vue — le
   secteur s'affichait ici en texte brut, seul écran à représenter ce même
   concept différemment du reste de l'app. */
.badge-secteur {
  display: inline-block;
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

.bouton-principal,
.bouton-secondaire {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: var(--vp-poids-medium);
  cursor: pointer;
  align-self: flex-start;
  transition: var(--vp-transition);
}

.bouton-principal {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
}

.bouton-secondaire {
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-principal);
  border: 1px solid var(--vp-bordure);
  flex-shrink: 0;
}

.branches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.branche {
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

.branche:hover {
  border-color: var(--vp-marque);
  box-shadow: var(--vp-ombre-md);
  transform: translateY(-2px);
}

.branche__icone {
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

.branche h2 {
  margin: 0 0 0.4rem;
  font-size: 1.02rem;
  font-weight: var(--vp-poids-semibold);
}

.branche p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
  line-height: 1.5;
}

.branche__fleche {
  position: absolute;
  top: 1.4rem;
  right: 1.3rem;
  color: var(--vp-texte-secondaire);
  opacity: 0;
  transition: var(--vp-transition);
}

.branche:hover .branche__fleche {
  opacity: 1;
  color: var(--vp-marque);
}

.carte {
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  box-shadow: var(--vp-ombre-sm);
  padding: 1.25rem 1.5rem;
}

.carte__titre-discret {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: var(--vp-poids-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-texte-secondaire);
}

.apercu-projets ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.apercu-projets a {
  color: var(--vp-marque);
  text-decoration: none;
}

.apercu-projets a:hover {
  text-decoration: underline;
}
</style>

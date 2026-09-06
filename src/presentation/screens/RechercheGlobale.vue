<script setup lang="ts">
// Recherche globale (§4.33) — comble un vide constaté : avec 25+ écrans
// par client, retrouver une section/un document/une procédure/un process/
// une connaissance déjà créés exigeait de deviner le bon écran, sans aucun
// point d'entrée transverse. Recherche par sous-chaîne (jamais floue),
// scopée au client actif pour le contenu (isolation stricte déjà en
// vigueur partout ailleurs), globale seulement pour retrouver un client.
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClientActifStore } from '../stores/useClientActifStore'
import { useClientsStore } from '../stores/useClientsStore'
import {
  useRechercheGlobaleStore,
  type ResultatRecherche,
  type TypeResultatRecherche,
} from '../stores/useRechercheGlobaleStore'
import IconeSvg, { type NomIcone } from '../composants/IconeSvg.vue'

defineOptions({ name: 'EcranRechercheGlobale' })

const route = useRoute()
const router = useRouter()
const clientActifStore = useClientActifStore()
const clientsStore = useClientsStore()
const rechercheStore = useRechercheGlobaleStore()

const requete = ref(typeof route.query.q === 'string' ? route.query.q : '')
const nomClientActif = ref<string | null>(null)
const resultatsClients = ref<ResultatRecherche[]>([])
const resultatsClient = ref<ResultatRecherche[]>([])

const LIBELLES_TYPE: Record<TypeResultatRecherche, string> = {
  client: 'Clients',
  section: 'Sections',
  document: 'Documents',
  procedure: 'Procédures',
  process: 'Process',
  connaissance: 'Connaissances',
}

const ICONES_TYPE: Record<TypeResultatRecherche, NomIcone> = {
  client: 'utilisateur',
  section: 'reglettes',
  document: 'dossier',
  procedure: 'livre',
  process: 'engrenage',
  connaissance: 'etincelles',
}

const ORDRE_TYPES: TypeResultatRecherche[] = [
  'section',
  'document',
  'procedure',
  'process',
  'connaissance',
  'client',
]

const resultats = computed(() => [...resultatsClient.value, ...resultatsClients.value])
const resultatsParType = computed(() =>
  ORDRE_TYPES.map((type) => ({
    type,
    libelle: LIBELLES_TYPE[type],
    icone: ICONES_TYPE[type],
    items: resultats.value.filter((r) => r.type === type),
  })).filter((groupe) => groupe.items.length > 0),
)
const totalResultats = computed(() => resultats.value.length)

async function lancerRecherche(): Promise<void> {
  await router.replace({ query: requete.value.trim() ? { q: requete.value.trim() } : {} })
  resultatsClients.value = rechercheStore.rechercherClients(clientsStore.clients, requete.value)
  resultatsClient.value = clientActifStore.clientActifId
    ? await rechercheStore.rechercherPourClient(clientActifStore.clientActifId, requete.value)
    : []
}

let debounce: ReturnType<typeof setTimeout> | undefined
watch(requete, () => {
  clearTimeout(debounce)
  debounce = setTimeout(lancerRecherche, 200)
})

onMounted(async () => {
  await clientsStore.chargerClients()
  if (clientActifStore.clientActifId) {
    const client = await clientsStore.obtenirClient(clientActifStore.clientActifId)
    nomClientActif.value = client?.name ?? null
  }
  if (requete.value.trim()) await lancerRecherche()
})
</script>

<template>
  <main class="recherche-globale">
    <h1>Recherche</h1>
    <p class="rappel">
      <template v-if="nomClientActif">
        Sections, documents, procédures, process et connaissances du site « {{ nomClientActif }} » —
        plus vos clients, pour changer de site.
      </template>
      <template v-else>
        Aucun site actif — seuls vos clients sont cherchables ici. Ouvrez la fiche d'un client pour
        rechercher aussi dans son contenu.
      </template>
    </p>

    <label class="champ-recherche">
      <IconeSvg nom="recherche" :taille="18" />
      <input
        v-model="requete"
        type="search"
        autofocus
        placeholder="Rechercher un livrable, un document, une procédure…"
        @keydown.enter="lancerRecherche"
      />
    </label>

    <p v-if="requete.trim() && !rechercheStore.enRecherche" class="compteur">
      {{ totalResultats }} résultat(s)
    </p>

    <section v-if="requete.trim().length === 0" class="etat-vide">
      <p>Commencez à taper pour rechercher.</p>
    </section>
    <section v-else-if="totalResultats === 0 && !rechercheStore.enRecherche" class="etat-vide">
      <p>Aucun résultat pour « {{ requete }} ».</p>
    </section>

    <section v-for="groupe in resultatsParType" :key="groupe.type" class="groupe-resultats">
      <h2>
        <IconeSvg :nom="groupe.icone" :taille="16" />
        {{ groupe.libelle }}
        <span class="compte">{{ groupe.items.length }}</span>
      </h2>
      <ul>
        <li v-for="item in groupe.items" :key="item.id">
          <RouterLink :to="item.route" class="resultat">
            <span class="resultat__titre">{{ item.titre }}</span>
            <span v-if="item.extrait" class="resultat__extrait">{{ item.extrait }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.recherche-globale {
  padding: 2.5rem;
  max-width: 44rem;
  margin: 0 auto;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: var(--vp-poids-bold);
}

.rappel {
  margin: 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.9rem;
}

.champ-recherche {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  background-color: var(--vp-fond-carte);
  box-shadow: var(--vp-ombre-sm);
  color: var(--vp-texte-secondaire);
}

.champ-recherche:focus-within {
  border-color: var(--vp-marque);
}

.champ-recherche input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-family: inherit;
  font-size: 1rem;
  color: var(--vp-texte-principal);
}

.champ-recherche input::-webkit-search-cancel-button {
  cursor: pointer;
}

.compteur {
  margin: 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.85rem;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
  text-align: center;
  padding: 2rem 1rem;
}

.groupe-resultats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.groupe-resultats h2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.85rem;
  font-weight: var(--vp-poids-semibold);
  color: var(--vp-texte-secondaire);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.compte {
  color: var(--vp-texte-secondaire);
  font-weight: var(--vp-poids-medium);
}

.groupe-resultats ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.resultat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  background-color: var(--vp-fond-carte);
  text-decoration: none;
  color: inherit;
  transition: var(--vp-transition);
}

.resultat:hover {
  border-color: var(--vp-marque);
  box-shadow: var(--vp-ombre-sm);
}

.resultat__titre {
  font-weight: var(--vp-poids-medium);
  color: var(--vp-texte-principal);
}

.resultat__extrait {
  font-size: 0.8rem;
  color: var(--vp-texte-secondaire);
}
</style>

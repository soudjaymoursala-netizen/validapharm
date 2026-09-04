<script setup lang="ts">
// Écran « Templates & Formulaires » (§8 du prompt maître du 03/09/2026,
// Phase 40) — bibliothèque autonome et consultable des gabarits `.docx`
// client, jusqu'ici seulement accessibles depuis le panneau d'export d'une
// section (`EditeurSection.vue`). `useGabaritExportStore` (Phase 26,
// TD-024) porte déjà tout le mécanisme (import vérifié par balises
// obligatoires, suppression) — cet écran n'ajoute aucune logique nouvelle,
// seulement un point d'entrée dédié cohérent avec le parcours demandé
// (« le système stocke le template que je lui donne »).
import { onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useGabaritExportStore } from '../stores/useGabaritExportStore'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const gabaritStore = useGabaritExportStore()

const nomClient = ref<string | null>(null)
const nomNouveauGabarit = ref('')
const erreur = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await gabaritStore.charger(props.clientId)
})

async function importer(evenement: Event): Promise<void> {
  erreur.value = null
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return
  if (nomNouveauGabarit.value.trim().length === 0) {
    erreur.value = 'Donnez un nom au gabarit avant de l’importer.'
    return
  }

  try {
    const tampon = await fichier.arrayBuffer()
    const resultat = await gabaritStore.importerGabarit(
      props.clientId,
      nomNouveauGabarit.value.trim(),
      tampon,
    )
    if (!resultat.ok) {
      erreur.value = `Gabarit refusé — balises obligatoires manquantes : ${resultat.tagsManquants.join(', ')}.`
      return
    }
    nomNouveauGabarit.value = ''
  } catch {
    erreur.value = 'Erreur inconnue lors de l’import du gabarit.'
  } finally {
    ;(evenement.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <main class="templates-formulaires">
    <RouterLink
      :to="{ name: 'fiche-client', params: { clientId: props.clientId } }"
      class="lien-retour"
    >
      {{ nomClient ?? props.clientId }}
    </RouterLink>
    <h1>Templates &amp; Formulaires — {{ nomClient ?? props.clientId }}</h1>
    <p class="rappel">
      Modèles officiels, formulaires, ou anciens protocoles réutilisables comme structure — un
      livrable créé depuis une section peut être généré directement dans l'un de ces gabarits (§8 du
      parcours). Import `.docx` uniquement, vérifié pour les balises obligatoires (bloc de
      signatures, historique des révisions) avant acceptation.
    </p>

    <section class="bloc-import">
      <h2>Importer un template</h2>
      <p v-if="erreur" class="bandeau-erreur" role="alert">{{ erreur }}</p>
      <div class="ligne-formulaire">
        <input
          v-model="nomNouveauGabarit"
          type="text"
          placeholder="Nom du template — ex. QD-0007 Protocole OQ"
        />
        <label class="bouton-fichier">
          Choisir un fichier (.docx)
          <input type="file" accept=".docx" @change="importer" />
        </label>
      </div>
    </section>

    <section class="bloc-liste">
      <h2>Templates disponibles</h2>
      <ul v-if="gabaritStore.gabarits.length > 0" class="liste-gabarits">
        <li v-for="g in gabaritStore.gabarits" :key="g.id">
          <span class="nom">{{ g.nom }}</span>
          <button type="button" class="bouton-danger" @click="gabaritStore.supprimerGabarit(g.id)">
            Supprimer
          </button>
        </li>
      </ul>
      <p v-else class="etat-vide">
        Aucun template importé pour l'instant — importez-en un ci-dessus, ou utilisez le gabarit par
        défaut de chaque type de livrable depuis l'éditeur de section.
      </p>
    </section>
  </main>
</template>

<style scoped>
.templates-formulaires {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 48rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
  margin: 0;
}

.bloc-import,
.bloc-liste {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ligne-formulaire {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

input[type='text'] {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
  flex: 1;
  min-width: 16rem;
}

.bouton-fichier {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: 0.25rem;
  cursor: pointer;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

.liste-gabarits {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-gabarits li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.4rem;
  padding: 0.6rem 0.9rem;
}

.nom {
  font-weight: 600;
}

.bouton-danger {
  background: none;
  border: none;
  color: var(--vp-danger);
  cursor: pointer;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

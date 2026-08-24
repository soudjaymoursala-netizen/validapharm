<script setup lang="ts">
// Panneau Chat expert (FDS §3.4, FS §4.4) — panneau séparé de l'espace de
// rédaction (URS-F-030). Mode "audit simulé" (URS-F-038/039/040) hors
// périmètre de cet incrément : seul le mode `chat_normatif` est câblé ici
// (backlog séparé, cf. tâche #14).
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { messageSysteme } from '../i18n/messages'
import { genererExportJSON } from '../../logique-metier/export/genererExportJSON'
import { useClientsStore } from '../stores/useClientsStore'
import { usePanneauChatStore, type SectionDisponibleAJoindre } from '../stores/usePanneauChatStore'

const DELAI_INACTIVITE_MS = 5 * 60 * 1000
const VERIFICATION_INACTIVITE_MS = 30 * 1000
const MODE_ACTUEL = 'chat_normatif' as const

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const chatStore = usePanneauChatStore()

const nomClient = ref<string | null>(null)
const sectionsDisponibles = ref<SectionDisponibleAJoindre[]>([])
const question = ref('')
const sectionAJoindreId = ref('')
const confirmationEnvoiOuverte = ref(false)
const sessionFermeePourInactivite = ref(false)

const sectionAJoindreChoisie = computed(
  () => sectionsDisponibles.value.find((s) => s.id === sectionAJoindreId.value) ?? null,
)

let derniereActivite = Date.now()
let minuteurInactivite: ReturnType<typeof setInterval> | undefined

function signalerActivite(): void {
  derniereActivite = Date.now()
}

async function verifierInactivite(): Promise<void> {
  if (sessionFermeePourInactivite.value) return
  if (Date.now() - derniereActivite >= DELAI_INACTIVITE_MS) {
    await chatStore.fermerSession(MODE_ACTUEL)
    sessionFermeePourInactivite.value = true
  }
}

async function demarrer(): Promise<void> {
  sessionFermeePourInactivite.value = false
  signalerActivite()
  await chatStore.demarrerSession(props.clientId)
  sectionsDisponibles.value = await chatStore.listerSectionsDisponibles(props.clientId)
}

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await demarrer()
  minuteurInactivite = setInterval(() => void verifierInactivite(), VERIFICATION_INACTIVITE_MS)
})

onBeforeUnmount(async () => {
  if (minuteurInactivite) clearInterval(minuteurInactivite)
  if (!sessionFermeePourInactivite.value) {
    await chatStore.fermerSession(MODE_ACTUEL)
  }
})

function demanderEnvoi(): void {
  if (question.value.trim().length === 0) return
  signalerActivite()
  if (sectionAJoindreId.value) {
    confirmationEnvoiOuverte.value = true
  } else {
    void envoyer()
  }
}

async function envoyer(): Promise<void> {
  confirmationEnvoiOuverte.value = false
  const texteQuestion = question.value.trim()
  const section = sectionAJoindreChoisie.value
  question.value = ''

  if (section) {
    const sectionComplete = await chatStore.obtenirSection(section.id)
    sectionAJoindreId.value = ''
    if (sectionComplete) {
      await chatStore.envoyerQuestion(
        texteQuestion,
        MODE_ACTUEL,
        {
          contenu_joint: true,
          contenu: genererExportJSON(sectionComplete),
          titre_document: section.titre,
        },
        section.titre,
      )
      return
    }
  }
  await chatStore.envoyerQuestion(texteQuestion, MODE_ACTUEL, { contenu_joint: false }, null)
}

async function reouvrirSession(): Promise<void> {
  await demarrer()
}
</script>

<template>
  <main class="panneau-chat">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Chat expert — {{ nomClient ?? props.clientId }}</h1>

    <p class="bandeau-fournisseur">
      Fournisseur actif : {{ chatStore.nomFournisseurActuel }}
      {{ chatStore.estFournisseurCloud ? '[cloud]' : '[local]' }}
      <span v-if="!chatStore.enLigne">— hors ligne détecté</span>
    </p>

    <p
      v-if="chatStore.estFournisseurCloud && chatStore.alerteDerive"
      class="bandeau-avertissement"
      role="alert"
    >
      ⚠ Ce fournisseur a changé de version depuis sa dernière qualification de fiabilité.
      Re-qualification recommandée avant usage réel.
    </p>

    <p class="bandeau-disclaimer">Aide, pas avis opposable.</p>

    <section v-if="sessionFermeePourInactivite" class="bloc-inactivite">
      <p>Session fermée pour cause d'inactivité — consignée au journal (URS-F-037).</p>
      <button type="button" @click="reouvrirSession">Rouvrir une session</button>
    </section>

    <template v-else>
      <ul class="messages">
        <li v-for="(m, index) in chatStore.messages" :key="index" class="message">
          <p class="question">{{ m.question }}</p>
          <p v-if="m.documentJoint" class="document-joint">
            Document joint : « {{ m.titreDocumentJoint }} »
          </p>
          <p v-if="m.bascule" class="bandeau-bascule" role="alert">
            Bascule automatique : réponse fournie par {{ m.fournisseurUtilise }} suite à
            l'indisponibilité du fournisseur configuré.
          </p>
          <p class="reponse">{{ m.reponse.texte }}</p>
          <p v-if="m.reponse.citations.length > 0" class="citations">
            Références : {{ m.reponse.citations.join(', ') }}
          </p>
        </li>
      </ul>

      <p v-if="chatStore.erreur" class="bandeau-erreur" role="alert">{{ chatStore.erreur }}</p>

      <form class="formulaire-envoi" @submit.prevent="demanderEnvoi">
        <label>
          Question
          <textarea
            v-model="question"
            required
            rows="3"
            @input="signalerActivite"
            @focus="signalerActivite"
          ></textarea>
        </label>
        <label>
          Joindre ce document à la question (action explicite, URS-F-031)
          <select v-model="sectionAJoindreId">
            <option value="">— aucun —</option>
            <option v-for="s in sectionsDisponibles" :key="s.id" :value="s.id">
              {{ s.projetNom }} — {{ s.titre }}
            </option>
          </select>
        </label>
        <div class="actions">
          <button type="submit" :disabled="chatStore.envoiEnCours">
            {{ chatStore.envoiEnCours ? 'Envoi en cours…' : 'Envoyer' }}
          </button>
        </div>
      </form>
    </template>

    <div
      v-if="confirmationEnvoiOuverte"
      class="modale-confirmation"
      role="dialog"
      aria-modal="true"
    >
      <div class="modale-contenu">
        <p>
          {{
            messageSysteme('U-06', 'fr', {
              titre: sectionAJoindreChoisie?.titre ?? '',
              fournisseur: chatStore.nomFournisseurActuel,
            })
          }}
        </p>
        <div class="actions">
          <button type="button" @click="confirmationEnvoiOuverte = false">Annuler</button>
          <button type="button" @click="envoyer">Continuer</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.panneau-chat {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}

.bandeau-fournisseur {
  background-color: var(--vp-fond-secondaire, #f4f4f8);
  border-radius: var(--vp-rayon);
  padding: 0.5rem 0.75rem;
  margin: 0;
}

.bandeau-avertissement {
  color: var(--vp-statut-requalification-en-retard);
  margin: 0;
}

.bandeau-disclaimer {
  font-style: italic;
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.bandeau-bascule {
  color: var(--vp-statut-requalification-en-retard);
}

.bandeau-erreur {
  color: var(--vp-statut-requalification-en-retard);
}

.bloc-inactivite {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}

.messages {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.question {
  font-weight: 600;
  margin: 0;
}

.reponse {
  margin: 0;
  white-space: pre-wrap;
}

.document-joint,
.citations {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
  margin: 0;
}

.formulaire-envoi {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.formulaire-envoi label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

textarea,
select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

button {
  background-color: var(--vp-marque);
  color: white;
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:disabled {
  background-color: var(--vp-bordure);
  cursor: not-allowed;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.modale-confirmation {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modale-contenu {
  background-color: var(--vp-fond, white);
  border-radius: var(--vp-rayon);
  padding: 1.5rem;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

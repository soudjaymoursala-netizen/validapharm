<script setup lang="ts">
// Panneau Chat expert — panneau séparé de l'espace de
// rédaction. Mode "audit simulé" : bascule explicite entre `chat_normatif` et
// `audit_simule`, sélection de persona(s) d'auditeur simulé, bandeau de
// rappel non négociable affiché à chaque activation.
//
// Refonte visuelle (07/09/2026, demande explicite de l'utilisateur —
// interface "plus chaleureuse, moderne, fluide et interactive", inspirée
// des agents IA en ligne) : bulles de conversation alignées
// question/réponse, indicateur de frappe pendant l'envoi, défilement
// automatique vers le dernier message, zone de saisie de type "composeur"
// (textarea auto-agrandissable, Entrée pour envoyer/Maj+Entrée pour un
// saut de ligne, bouton d'import de document intégré directement à la
// barre de saisie plutôt qu'un `<select>` séparé). Comportement/logique
// métier inchangés — seule la présentation change.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { messageSysteme } from '../i18n/messages'
import type { ModeUsageIA } from '../../connecteurs/ia/ProviderAdapter'
import { genererExportJSON } from '../../logique-metier/export/genererExportJSON'
import {
  construirePromptAuditSimule,
  LIBELLES_PERSONA_AUDIT_SIMULE,
  type PersonaAuditSimule,
} from '../../logique-metier/audit-simule/construirePromptAuditSimule'
import { usePanneauChatStore, type SectionDisponibleAJoindre } from '../stores/usePanneauChatStore'
import { rendreMarkdown } from '../rendreMarkdown'

const DELAI_INACTIVITE_MS = 5 * 60 * 1000
const VERIFICATION_INACTIVITE_MS = 30 * 1000
const HAUTEUR_TEXTAREA_MAX_PX = 200
const MODES: ReadonlyArray<{ id: ModeUsageIA; nom: string }> = [
  { id: 'chat_normatif', nom: 'Chat normatif' },
  { id: 'audit_simule', nom: 'Audit simulé' },
]
const PERSONAS: readonly PersonaAuditSimule[] = [
  'swissmedic',
  'fda',
  'cabinet_conseil_gxp',
  'qa_specialisee',
]

const props = defineProps<{ clientId: string }>()

const modeActuel = ref<ModeUsageIA>('chat_normatif')
const personasChoisies = ref<PersonaAuditSimule[]>([])

const chatStore = usePanneauChatStore()

const sectionsDisponibles = ref<SectionDisponibleAJoindre[]>([])
const question = ref('')
const sectionAJoindreId = ref('')
const confirmationEnvoiOuverte = ref(false)
const sessionFermeePourInactivite = ref(false)
const menuJointOuvert = ref(false)

const zoneMessagesRef = ref<HTMLElement | null>(null)
const zoneTexteRef = ref<HTMLTextAreaElement | null>(null)
const conteneurJoindreRef = ref<HTMLElement | null>(null)

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
    await chatStore.fermerSession(modeActuel.value)
    sessionFermeePourInactivite.value = true
  }
}

async function demarrer(): Promise<void> {
  sessionFermeePourInactivite.value = false
  signalerActivite()
  await chatStore.demarrerSession(props.clientId)
  sectionsDisponibles.value = await chatStore.listerSectionsDisponibles(props.clientId)
}

function defilerVersLeBas(): void {
  const zone = zoneMessagesRef.value
  if (!zone) return
  zone.scrollTo({ top: zone.scrollHeight, behavior: 'smooth' })
}

watch(
  () => chatStore.messages.length,
  async () => {
    await nextTick()
    defilerVersLeBas()
  },
)

watch(
  () => chatStore.envoiEnCours,
  async (enCours) => {
    if (!enCours) return
    await nextTick()
    defilerVersLeBas()
  },
)

function gererClicExterieurMenuJoint(evenement: MouseEvent): void {
  if (!menuJointOuvert.value) return
  const cible = evenement.target as Node
  if (conteneurJoindreRef.value && !conteneurJoindreRef.value.contains(cible)) {
    menuJointOuvert.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', gererClicExterieurMenuJoint)
  await demarrer()
  minuteurInactivite = setInterval(() => void verifierInactivite(), VERIFICATION_INACTIVITE_MS)
})

onBeforeUnmount(async () => {
  document.removeEventListener('click', gererClicExterieurMenuJoint)
  if (minuteurInactivite) clearInterval(minuteurInactivite)
  if (!sessionFermeePourInactivite.value) {
    await chatStore.fermerSession(modeActuel.value)
  }
})

function ajusterHauteurTextarea(): void {
  const zone = zoneTexteRef.value
  if (!zone) return
  zone.style.height = 'auto'
  zone.style.height = `${Math.min(zone.scrollHeight, HAUTEUR_TEXTAREA_MAX_PX)}px`
}

function gererSaisieTextarea(): void {
  signalerActivite()
  ajusterHauteurTextarea()
}

function gererToucheTextarea(evenement: KeyboardEvent): void {
  if (evenement.key !== 'Enter' || evenement.shiftKey || evenement.isComposing) return
  evenement.preventDefault()
  demanderEnvoi()
}

function basculerMenuJoint(): void {
  menuJointOuvert.value = !menuJointOuvert.value
}

function choisirSectionAJoindre(id: string): void {
  sectionAJoindreId.value = id
  menuJointOuvert.value = false
  signalerActivite()
}

function retirerDocumentJoint(): void {
  sectionAJoindreId.value = ''
}

function demanderEnvoi(): void {
  if (question.value.trim().length === 0) return
  signalerActivite()
  if (sectionAJoindreId.value) {
    confirmationEnvoiOuverte.value = true
  } else {
    void envoyer()
  }
}

/**
 * Mode audit_simule : la question réellement
 * envoyée au fournisseur porte le prompt engineered (débat contradictoire +
 * personas), jamais la question brute — celle-ci reste ce qui s'affiche
 * dans l'historique via `questionAffichee`.
 */
function texteAEnvoyer(texteQuestion: string): string {
  if (modeActuel.value !== 'audit_simule') return texteQuestion
  return construirePromptAuditSimule({
    question: texteQuestion,
    personas: personasChoisies.value,
  })
}

async function envoyer(): Promise<void> {
  confirmationEnvoiOuverte.value = false
  const texteQuestion = question.value.trim()
  const section = sectionAJoindreChoisie.value
  question.value = ''
  await nextTick()
  ajusterHauteurTextarea()

  if (section) {
    const sectionComplete = await chatStore.obtenirSection(section.id)
    sectionAJoindreId.value = ''
    if (sectionComplete) {
      await chatStore.envoyerQuestion(
        texteAEnvoyer(texteQuestion),
        modeActuel.value,
        {
          contenu_joint: true,
          contenu: genererExportJSON(sectionComplete),
          titre_document: section.titre,
        },
        section.titre,
        texteQuestion,
      )
      return
    }
  }
  await chatStore.envoyerQuestion(
    texteAEnvoyer(texteQuestion),
    modeActuel.value,
    { contenu_joint: false },
    null,
    texteQuestion,
  )
}

async function reouvrirSession(): Promise<void> {
  await demarrer()
}
</script>

<template>
  <main class="panneau-chat">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Clients</RouterLink>

    <header class="en-tete-chat">
      <div class="avatar-assistant" aria-hidden="true">✨</div>
      <div class="en-tete-texte">
        <h1>Assistant IA</h1>
        <p class="sous-titre">
          Aide à la rédaction et à la compréhension réglementaire.
          <strong>Aide, pas avis opposable.</strong>
        </p>
      </div>
      <span
        class="badge-fournisseur"
        :class="{ 'badge-fournisseur--attention': !chatStore.enLigne }"
      >
        <span
          class="pastille-etat"
          :class="{ 'pastille-etat--attention': !chatStore.enLigne }"
          aria-hidden="true"
        ></span>
        {{ chatStore.nomFournisseurActuel }}
        <span class="badge-fournisseur-portee">{{
          chatStore.estFournisseurCloud ? 'cloud' : 'local'
        }}</span>
        <template v-if="!chatStore.enLigne">— hors ligne détecté</template>
      </span>
    </header>

    <p
      v-if="chatStore.estFournisseurCloud && chatStore.alerteDerive(modeActuel)"
      class="bandeau-avertissement"
      role="alert"
    >
      ⚠ Ce fournisseur a changé de version depuis sa dernière qualification de fiabilité.
      Re-qualification recommandée avant usage réel.
    </p>

    <div class="barre-controles">
      <div class="segmente" role="radiogroup" aria-label="Mode">
        <label
          v-for="m in MODES"
          :key="m.id"
          class="segmente-option"
          :class="{ 'is-active': modeActuel === m.id }"
        >
          <input v-model="modeActuel" type="radio" :value="m.id" class="sr-only" />
          {{ m.nom }}
        </label>
      </div>
    </div>

    <template v-if="modeActuel === 'audit_simule'">
      <p class="bandeau-avertissement" role="alert">
        ⚠ Mode audit simulé : débat contradictoire multi-angles et, si des profils sont
        sélectionnés, simulation de persona(s) d'auditeur. Cette simulation ne constitue en aucun
        cas un audit réglementaire réel ni un avis opposable.
      </p>
      <fieldset class="bloc-personas">
        <legend>Persona(s) d'auditeur simulé (optionnel)</legend>
        <div class="chips-personas">
          <label
            v-for="p in PERSONAS"
            :key="p"
            class="chip-persona"
            :class="{ 'is-active': personasChoisies.includes(p) }"
          >
            <input v-model="personasChoisies" type="checkbox" :value="p" class="sr-only" />
            {{ LIBELLES_PERSONA_AUDIT_SIMULE[p] }}
          </label>
        </div>
      </fieldset>
    </template>

    <section v-if="sessionFermeePourInactivite" class="bloc-inactivite">
      <p>Session fermée pour cause d'inactivité — consignée au journal.</p>
      <button type="button" @click="reouvrirSession">Rouvrir une session</button>
    </section>

    <template v-else>
      <div ref="zoneMessagesRef" class="zone-messages">
        <p v-if="chatStore.messages.length === 0" class="etat-vide">
          <span class="etat-vide-icone" aria-hidden="true">💬</span>
          Posez votre première question — je suis là pour vous aider sur la rédaction et la
          compréhension réglementaire.
        </p>

        <ul class="messages">
          <li v-for="(m, index) in chatStore.messages" :key="index" class="tour-message">
            <div class="bulle bulle-question">
              <p class="etiquette-role">Vous</p>
              <p class="texte-bulle">{{ m.question }}</p>
              <p v-if="m.documentJoint" class="document-joint">📎 « {{ m.titreDocumentJoint }} »</p>
            </div>
            <div class="bulle bulle-reponse">
              <p class="etiquette-role">
                {{ m.fournisseurUtilise }}
                <span class="etiquette-mode">{{
                  m.mode === 'audit_simule' ? 'Audit simulé' : 'Chat normatif'
                }}</span>
              </p>
              <p v-if="m.bascule" class="bandeau-bascule" role="alert">
                Bascule automatique : réponse fournie par {{ m.fournisseurUtilise }} suite à
                l'indisponibilité du fournisseur configuré.
              </p>
              <!-- eslint-disable-next-line vue/no-v-html -- assaini par DOMPurify dans rendreMarkdown.ts avant insertion, jamais le texte brut du fournisseur IA -->
              <div class="reponse-markdown" v-html="rendreMarkdown(m.reponse.texte)"></div>
              <p v-if="m.reponse.citations.length > 0" class="citations">
                Références : {{ m.reponse.citations.join(', ') }}
              </p>
            </div>
          </li>

          <li v-if="chatStore.envoiEnCours" class="tour-message">
            <div class="bulle bulle-reponse bulle-frappe" aria-live="polite">
              <p class="etiquette-role">{{ chatStore.nomFournisseurActuel }}</p>
              <span class="indicateur-frappe"> <span></span><span></span><span></span> </span>
            </div>
          </li>
        </ul>
      </div>

      <p v-if="chatStore.erreur" class="bandeau-erreur" role="alert">{{ chatStore.erreur }}</p>

      <form class="composeur" @submit.prevent="demanderEnvoi">
        <div v-if="sectionAJoindreChoisie" class="jeton-document">
          <span aria-hidden="true">📎</span>
          {{ sectionAJoindreChoisie.projetNom }} — {{ sectionAJoindreChoisie.titre }}
          <button
            type="button"
            class="bouton-retirer-jeton"
            aria-label="Retirer le document joint"
            @click="retirerDocumentJoint"
          >
            ×
          </button>
        </div>

        <div class="barre-saisie">
          <div ref="conteneurJoindreRef" class="menu-joindre-conteneur">
            <button
              type="button"
              class="bouton-icone bouton-joindre"
              :class="{ 'is-active': menuJointOuvert }"
              :disabled="sectionsDisponibles.length === 0"
              :aria-expanded="menuJointOuvert"
              aria-haspopup="listbox"
              title="Joindre un document à la question"
              @click="basculerMenuJoint"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M17.5 8.5 9.9 16.1a3 3 0 0 1-4.24-4.24l8.13-8.13a2 2 0 0 1 2.83 2.83L8.7 14.5a1 1 0 0 1-1.42-1.42l6.44-6.44"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="sr-only">Joindre un document</span>
            </button>
            <ul v-if="menuJointOuvert" class="menu-joindre" role="listbox">
              <li v-if="sectionsDisponibles.length === 0" class="menu-joindre-item-vide">
                Aucun document disponible pour ce client
              </li>
              <li v-for="s in sectionsDisponibles" :key="s.id">
                <button type="button" role="option" @click="choisirSectionAJoindre(s.id)">
                  <span class="menu-joindre-projet">{{ s.projetNom }}</span>
                  <span class="menu-joindre-titre">{{ s.titre }}</span>
                </button>
              </li>
            </ul>
          </div>

          <textarea
            ref="zoneTexteRef"
            v-model="question"
            required
            rows="1"
            placeholder="Écrivez votre question… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
            @input="gererSaisieTextarea"
            @focus="signalerActivite"
            @keydown="gererToucheTextarea"
          ></textarea>

          <button
            type="submit"
            class="bouton-icone bouton-envoyer"
            :disabled="chatStore.envoiEnCours || question.trim().length === 0"
            aria-label="Envoyer la question"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 12 20 4l-6.5 16-2.8-7.2L4 12Z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
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
          <button type="button" class="bouton-neutre" @click="confirmationEnvoiOuverte = false">
            Annuler
          </button>
          <button type="button" @click="envoyer">Continuer</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.panneau-chat {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 44rem;
  height: calc(100vh - 4rem);
}

/* En-tête — avatar + titre + sous-titre chaleureux, badge fournisseur
   détaché à droite plutôt qu'un bandeau plein-largeur séparé. */
.en-tete-chat {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}

.avatar-assistant {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  background: linear-gradient(135deg, var(--vp-marque-fond-leger), var(--vp-accent-fond-leger));
  border: 1px solid var(--vp-bordure);
  box-shadow: var(--vp-ombre-sm);
}

.en-tete-texte {
  flex: 1;
  min-width: 0;
}

.en-tete-texte h1 {
  margin: 0;
  font-size: 1.5rem;
}

.sous-titre {
  margin: 0.2rem 0 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.88rem;
}

.sous-titre strong {
  color: var(--vp-texte-principal);
  font-weight: var(--vp-poids-medium);
}

.badge-fournisseur {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  color: var(--vp-texte-secondaire);
  box-shadow: var(--vp-ombre-sm);
  white-space: nowrap;
}

.badge-fournisseur--attention {
  border-color: var(--vp-attention);
  color: var(--vp-attention);
}

.badge-fournisseur-portee {
  color: var(--vp-texte-secondaire);
  text-transform: uppercase;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
}

.pastille-etat {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background-color: var(--vp-succes);
}

.pastille-etat--attention {
  background-color: var(--vp-attention);
}

.bandeau-avertissement {
  color: var(--vp-attention);
  background-color: var(--vp-attention-fond-leger);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.85rem;
  margin: 0;
  font-size: 0.88rem;
}

.bandeau-bascule {
  color: var(--vp-attention);
  font-size: 0.85rem;
  margin: 0;
}

/* Sélecteur de mode — bascule à deux options plutôt que deux boutons
   radio nus, plus proche d'un contrôle segmenté d'application moderne. */
.barre-controles {
  display: flex;
}

.segmente {
  display: inline-flex;
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: 999px;
  padding: 0.2rem;
  gap: 0.2rem;
  box-shadow: var(--vp-ombre-sm);
}

.segmente-option {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: var(--vp-poids-medium);
  color: var(--vp-texte-secondaire);
  cursor: pointer;
  transition: var(--vp-transition);
}

.segmente-option.is-active {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
}

.segmente-option:not(.is-active):hover {
  color: var(--vp-marque);
}

.bloc-personas {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.85rem;
  margin: 0;
}

.chips-personas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.chip-persona {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--vp-bordure);
  background-color: var(--vp-fond-carte);
  font-size: 0.82rem;
  cursor: pointer;
  transition: var(--vp-transition);
}

.chip-persona.is-active {
  border-color: var(--vp-accent);
  background-color: var(--vp-accent-fond-leger);
  color: var(--vp-accent);
  font-weight: var(--vp-poids-medium);
}

.chip-persona:not(.is-active):hover {
  border-color: var(--vp-marque);
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

/* Zone de conversation — défilement interne dédié (le composeur, lui,
   reste fixe en bas de la carte), fond légèrement distinct pour se lire
   comme une "pièce" à part de l'en-tête/des contrôles. */
.zone-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 0.25rem 0.25rem 0.5rem;
  scroll-behavior: smooth;
}

.etat-vide {
  margin: auto;
  text-align: center;
  color: var(--vp-texte-secondaire);
  max-width: 22rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.etat-vide-icone {
  font-size: 1.8rem;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.tour-message {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  animation: apparition-message 220ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .tour-message {
    animation: none;
  }
}

@keyframes apparition-message {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bulle {
  border-radius: var(--vp-rayon-lg);
  padding: 0.7rem 1rem;
  max-width: 85%;
}

.etiquette-role {
  font-size: 0.72rem;
  font-weight: var(--vp-poids-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0 0 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.etiquette-mode {
  font-weight: var(--vp-poids-medium);
  text-transform: none;
  letter-spacing: normal;
  color: var(--vp-texte-secondaire);
  background-color: var(--vp-fond-page);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
}

.bulle-question {
  align-self: flex-end;
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border-bottom-right-radius: var(--vp-rayon-sm);
}

.bulle-question .etiquette-role {
  color: var(--vp-marque-bouton-texte);
  opacity: 0.75;
}

.bulle-reponse {
  align-self: flex-start;
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-bottom-left-radius: var(--vp-rayon-sm);
  box-shadow: var(--vp-ombre-sm);
}

.bulle-reponse .etiquette-role {
  color: var(--vp-texte-secondaire);
}

.texte-bulle {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
}

/* Réponse IA rendue en Markdown assaini (`rendreMarkdown.ts`) — l'IA peut
   produire un document structuré (titres, tableaux, listes, code), pas
   seulement un paragraphe de texte brut (demande explicite de
   l'utilisateur). `:deep()` obligatoire : le contenu inséré par `v-html`
   n'est jamais compilé par Vue et ne porte donc jamais l'attribut de
   portée du CSS scoped de ce composant. */
.reponse-markdown {
  line-height: 1.55;
  overflow-x: auto;
}

.reponse-markdown :deep(> :first-child) {
  margin-top: 0;
}

.reponse-markdown :deep(> :last-child) {
  margin-bottom: 0;
}

.reponse-markdown :deep(p) {
  margin: 0 0 0.7em;
}

.reponse-markdown :deep(h1),
.reponse-markdown :deep(h2),
.reponse-markdown :deep(h3),
.reponse-markdown :deep(h4) {
  font-family: var(--vp-police);
  font-weight: var(--vp-poids-semibold);
  line-height: 1.3;
  margin: 1em 0 0.4em;
}

.reponse-markdown :deep(h1) {
  font-size: 1.15em;
}

.reponse-markdown :deep(h2) {
  font-size: 1.08em;
}

.reponse-markdown :deep(h3) {
  font-size: 1.02em;
}

.reponse-markdown :deep(ul),
.reponse-markdown :deep(ol) {
  margin: 0 0 0.7em;
  padding-left: 1.3em;
}

.reponse-markdown :deep(ul) {
  list-style: disc;
}

.reponse-markdown :deep(ol) {
  list-style: decimal;
}

.reponse-markdown :deep(li) {
  margin: 0.2em 0;
}

.reponse-markdown :deep(li > ul),
.reponse-markdown :deep(li > ol) {
  margin: 0.2em 0;
}

.reponse-markdown :deep(strong) {
  font-weight: var(--vp-poids-semibold);
}

.reponse-markdown :deep(a) {
  color: var(--vp-marque);
}

.reponse-markdown :deep(blockquote) {
  margin: 0 0 0.7em;
  padding: 0.3em 0.9em;
  border-left: 3px solid var(--vp-bordure-forte);
  color: var(--vp-texte-secondaire);
}

.reponse-markdown :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.85em;
  background-color: var(--vp-fond-page);
  border-radius: var(--vp-rayon-sm);
  padding: 0.1em 0.35em;
}

.reponse-markdown :deep(pre) {
  margin: 0 0 0.7em;
  background-color: var(--vp-fond-page);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.7em 0.9em;
  overflow-x: auto;
}

.reponse-markdown :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 0.82em;
}

.reponse-markdown :deep(hr) {
  border: none;
  border-top: 1px solid var(--vp-bordure);
  margin: 0.9em 0;
}

/* Tableau — cas d'usage explicite de la demande ("faire des tableaux") :
   son propre conteneur défilant horizontalement, la bulle de conversation
   ne doit jamais elle-même s'élargir au-delà de `max-width` ni faire
   défiler la page entière. */
.reponse-markdown :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0 0 0.7em;
  font-size: 0.88em;
}

.reponse-markdown :deep(th),
.reponse-markdown :deep(td) {
  border: 1px solid var(--vp-bordure);
  padding: 0.4em 0.6em;
  text-align: left;
}

.reponse-markdown :deep(th) {
  background-color: var(--vp-fond-page);
  font-weight: var(--vp-poids-semibold);
}

.document-joint,
.citations {
  margin: 0.4rem 0 0;
  font-size: 0.82rem;
  opacity: 0.85;
}

.bulle-frappe {
  padding: 0.85rem 1rem;
}

.indicateur-frappe {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.indicateur-frappe span {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background-color: var(--vp-texte-secondaire);
  animation: frappe 1.1s infinite ease-in-out;
}

.indicateur-frappe span:nth-child(2) {
  animation-delay: 0.15s;
}

.indicateur-frappe span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes frappe {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .indicateur-frappe span {
    animation: none;
  }
}

.bandeau-erreur {
  color: var(--vp-danger);
  background-color: var(--vp-danger-fond-leger);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.85rem;
  margin: 0;
  font-size: 0.88rem;
}

/* Composeur — carte flottante fixée en bas, dans l'esprit d'un agent de
   conversation moderne : le bouton d'import de document vit désormais
   directement dans la barre de saisie plutôt que dans un `<select>`
   séparé au-dessus du bouton "Envoyer". */
.composeur {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.jeton-document {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
  border-radius: 999px;
  padding: 0.3rem 0.4rem 0.3rem 0.7rem;
  font-size: 0.82rem;
  font-weight: var(--vp-poids-medium);
}

.bouton-retirer-jeton {
  border: none;
  background: none;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  cursor: pointer;
}

.bouton-retirer-jeton:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.barre-saisie {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  padding: 0.5rem 0.6rem;
  box-shadow: var(--vp-ombre-md);
  transition: var(--vp-transition);
}

.barre-saisie:focus-within {
  border-color: var(--vp-marque);
  box-shadow: 0 0 0 3px var(--vp-marque-fond-leger);
}

.barre-saisie textarea {
  flex: 1;
  border: none;
  resize: none;
  padding: 0.45rem 0.2rem;
  max-height: 200px;
  background: transparent;
  font-size: 0.92rem;
  line-height: 1.4;
}

.barre-saisie textarea:focus-visible {
  outline: none;
  box-shadow: none;
  border-color: transparent;
}

.bouton-icone {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 999px;
  padding: 0;
  border: 1px solid var(--vp-bordure);
  background-color: var(--vp-fond-carte);
  color: var(--vp-texte-secondaire);
}

.bouton-icone svg {
  width: 1.1rem;
  height: 1.1rem;
}

.bouton-joindre.is-active {
  border-color: var(--vp-marque);
  color: var(--vp-marque);
  background-color: var(--vp-marque-fond-leger);
}

.bouton-envoyer {
  background-color: var(--vp-marque);
  border-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
}

.bouton-envoyer:hover:not(:disabled) {
  background-color: var(--vp-marque-survol);
  border-color: var(--vp-marque-survol);
  color: var(--vp-marque-bouton-texte);
}

.menu-joindre-conteneur {
  position: relative;
}

.menu-joindre {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 0;
  min-width: 16rem;
  max-width: 20rem;
  max-height: 14rem;
  overflow-y: auto;
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  box-shadow: var(--vp-ombre-lg);
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  z-index: 5;
}

.menu-joindre-item-vide {
  padding: 0.5rem 0.6rem;
  color: var(--vp-texte-secondaire);
  font-size: 0.82rem;
}

.menu-joindre li button {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.05rem;
  border: none;
  background: none;
  border-radius: var(--vp-rayon-sm);
  padding: 0.45rem 0.6rem;
  text-align: left;
}

.menu-joindre li button:hover {
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

.menu-joindre-projet {
  font-size: 0.72rem;
  color: var(--vp-texte-secondaire);
}

.menu-joindre li button:hover .menu-joindre-projet {
  color: var(--vp-marque);
  opacity: 0.8;
}

.menu-joindre-titre {
  font-size: 0.88rem;
  font-weight: var(--vp-poids-medium);
}

/* `.bouton-neutre` : dans la modale de confirmation d'envoi,
   « Annuler » avait le même poids visuel qu'« Continuer » (bouton nu
   hérité de la règle `button` ci-dessus, jamais différencié). */
.bouton-neutre {
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-principal);
  border: 1px solid var(--vp-bordure);
}

.bouton-neutre:hover {
  border-color: var(--vp-marque);
  color: var(--vp-marque);
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
  background-color: var(--vp-fond-carte);
  border-radius: var(--vp-rayon);
  padding: 1.5rem;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (max-width: 640px) {
  .panneau-chat {
    padding: 1rem;
    height: calc(100vh - 2rem);
  }

  .bulle {
    max-width: 92%;
  }
}
</style>

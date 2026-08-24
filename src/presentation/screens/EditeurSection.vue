<script setup lang="ts">
// Éditeur de section (FDS §2) — version minimale de cet incrément : un
// champ de contenu générique (le moteur de gabarits déclaratif complet
// avec ses types de champs par gabarit est backlog, tâche #12), les
// transitions de statut avec garde-fous fidèles (FDS §3.2/§3.3), la
// sauvegarde automatique (URS-F-009).
import { computed, onMounted, ref, watch } from 'vue'
import type { Section } from '../../logique-metier/domaine/types'
import { messageSysteme, type CodeMessageSysteme } from '../i18n/messages'
import { useSectionsStore, type ResultatActionSection } from '../stores/useSectionsStore'

const props = defineProps<{ projectId: string; sectionId: string }>()

const sectionsStore = useSectionsStore()
const section = ref<Section | undefined>(undefined)
const contenu = ref('')
const motifRejet = ref('')
const motifForcage = ref('')
const nouvelApprobateur = ref('')
const nouvelAvisRelecteurId = ref('')
const nouvelAvisRelecteurTexte = ref('')
const dernierResultat = ref<ResultatActionSection | undefined>(undefined)
let minuteurSauvegarde: ReturnType<typeof setTimeout> | undefined

async function recharger(): Promise<void> {
  await sectionsStore.chargerSectionsDuProjet(props.projectId)
  const trouvee = (sectionsStore.sectionsParProjet[props.projectId] ?? []).find(
    (s) => s.id === props.sectionId,
  )
  section.value = trouvee
  contenu.value = typeof trouvee?.values.contenu === 'string' ? trouvee.values.contenu : ''
}

onMounted(recharger)

// Sauvegarde automatique locale, debounce court (URS-F-009).
watch(contenu, (valeur) => {
  if (minuteurSauvegarde) clearTimeout(minuteurSauvegarde)
  minuteurSauvegarde = setTimeout(() => {
    void sectionsStore.mettreAJourValeurs(props.sectionId, { contenu: valeur })
  }, 400)
})

const messagesBlocage = computed<string[]>(() => {
  if (dernierResultat.value?.ok === false && 'blocagesFinalisation' in dernierResultat.value) {
    return dernierResultat.value.blocagesFinalisation.map((code: CodeMessageSysteme) =>
      messageSysteme(code, 'fr'),
    )
  }
  return []
})

const raisonTransitionBloquee = computed(() =>
  dernierResultat.value?.ok === false && 'raisonTransition' in dernierResultat.value
    ? dernierResultat.value.raisonTransition
    : undefined,
)

async function engagerVerification(): Promise<void> {
  dernierResultat.value = await sectionsStore.engagerVerification(props.sectionId)
  if (dernierResultat.value.ok) motifForcage.value = ''
  await recharger()
}

async function forcerEngagerVerification(): Promise<void> {
  dernierResultat.value = await sectionsStore.engagerVerification(
    props.sectionId,
    motifForcage.value,
  )
  await recharger()
}

async function transmettreApprobation(): Promise<void> {
  dernierResultat.value = await sectionsStore.transmettreApprobation(props.sectionId)
  await recharger()
}

async function approuver(): Promise<void> {
  dernierResultat.value = await sectionsStore.approuver(props.sectionId)
  await recharger()
}

async function forcerApprouver(): Promise<void> {
  dernierResultat.value = await sectionsStore.approuver(props.sectionId, motifForcage.value)
  await recharger()
}

async function rejeter(): Promise<void> {
  if (motifRejet.value.trim().length === 0) return
  dernierResultat.value = await sectionsStore.rejeter(props.sectionId, motifRejet.value)
  motifRejet.value = ''
  await recharger()
}

async function validerSectionIA(): Promise<void> {
  dernierResultat.value = await sectionsStore.validerSectionIA(props.sectionId)
  await recharger()
}

async function assignerApprobateur(): Promise<void> {
  if (nouvelApprobateur.value.trim().length === 0) return
  await sectionsStore.assignerApprobateurFinal(props.sectionId, nouvelApprobateur.value.trim())
  nouvelApprobateur.value = ''
  await recharger()
}

async function ajouterAvisRelecteur(): Promise<void> {
  if (
    nouvelAvisRelecteurId.value.trim().length === 0 ||
    nouvelAvisRelecteurTexte.value.trim().length === 0
  ) {
    return
  }
  await sectionsStore.ajouterAvisRelecteur(
    props.sectionId,
    nouvelAvisRelecteurId.value.trim(),
    nouvelAvisRelecteurTexte.value.trim(),
  )
  nouvelAvisRelecteurId.value = ''
  nouvelAvisRelecteurTexte.value = ''
  await recharger()
}
</script>

<template>
  <main v-if="section" class="editeur-section">
    <RouterLink :to="{ name: 'fiche-projet', params: { projectId: props.projectId } }">
      &larr; Fiche projet
    </RouterLink>
    <h1>{{ section.meta.titre }}</h1>
    <p class="meta">
      {{ section.template_type }} — statut : <strong>{{ section.status }}</strong>
    </p>

    <label class="champ-contenu">
      Contenu
      <textarea v-model="contenu" :disabled="section.status === 'valide_en_interne'" rows="10" />
    </label>

    <section v-if="section.status !== 'valide_en_interne'" class="workflow">
      <h2>Workflow (URS-F-011, URS-F-014ter/quater)</h2>
      <p>
        Approbateur final :
        <strong>{{ section.workflow.approver_final ?? 'non renseigné' }}</strong>
      </p>
      <div class="ligne-formulaire">
        <label>
          Identifiant approbateur final
          <input v-model="nouvelApprobateur" type="text" placeholder="ex. qa-1" />
        </label>
        <button type="button" @click="assignerApprobateur">Assigner</button>
      </div>

      <p>Avis relecteurs : {{ section.workflow.reviewers.length }}</p>
      <ul v-if="section.workflow.reviewers.length > 0" class="liste-avis">
        <li v-for="(avis, index) in section.workflow.reviewers" :key="index">
          {{ avis.user_id }} — {{ avis.avis }}
        </li>
      </ul>
      <div class="ligne-formulaire">
        <label>
          Identifiant relecteur
          <input v-model="nouvelAvisRelecteurId" type="text" placeholder="ex. revu-1" />
        </label>
        <label>
          Avis
          <input v-model="nouvelAvisRelecteurTexte" type="text" placeholder="ex. Favorable" />
        </label>
        <button type="button" @click="ajouterAvisRelecteur">Ajouter l'avis</button>
      </div>
    </section>

    <div v-if="messagesBlocage.length > 0" class="blocage" role="alert">
      <p v-for="message in messagesBlocage" :key="message">
        {{ message }}
      </p>
      <label>
        Motif du forçage (obligatoire)
        <input v-model="motifForcage" type="text" />
      </label>
      <button
        type="button"
        @click="
          section.status === 'en_approbation' ? forcerApprouver() : forcerEngagerVerification()
        "
      >
        Forcer
      </button>
    </div>

    <p v-if="raisonTransitionBloquee" class="blocage" role="alert">
      Transition refusée : {{ raisonTransitionBloquee }}
    </p>

    <div class="actions-cycle">
      <template v-if="section.status === 'brouillon_aide'">
        <button type="button" @click="engagerVerification">
          Engager le cycle « validé en interne »
        </button>
      </template>

      <template v-else-if="section.status === 'propose_par_ia_non_valide'">
        <button type="button" @click="validerSectionIA">
          Valider cette section (contenu proposé par IA)
        </button>
      </template>

      <template v-else-if="section.status === 'en_verification'">
        <button type="button" @click="transmettreApprobation">Transmettre à l'approbation</button>
        <label>
          Motif de rejet
          <input v-model="motifRejet" type="text" />
        </label>
        <button type="button" @click="rejeter">Rejeter</button>
      </template>

      <template v-else-if="section.status === 'en_approbation'">
        <button type="button" @click="approuver">Approuver</button>
        <label>
          Motif de rejet
          <input v-model="motifRejet" type="text" />
        </label>
        <button type="button" @click="rejeter">Rejeter</button>
      </template>

      <p v-else-if="section.status === 'valide_en_interne'" class="verrouille">
        Section verrouillée (validée en interne — pas une signature électronique opposable).
        Nouvelle révision : backlog.
      </p>
    </div>
  </main>
  <p v-else>Chargement…</p>
</template>

<style scoped>
.editeur-section {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}

.meta {
  color: var(--vp-texte-secondaire);
}

.champ-contenu {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

textarea,
input {
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
  align-self: flex-start;
}

.workflow {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.workflow h2 {
  font-size: 1rem;
  margin: 0;
}

.ligne-formulaire {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ligne-formulaire label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.liste-avis {
  margin: 0;
  padding-left: 1.25rem;
}

.blocage {
  border: 1px solid var(--vp-statut-requalification-en-retard);
  background-color: var(--vp-marque-fond-leger);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.actions-cycle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.verrouille {
  color: var(--vp-texte-secondaire);
}
</style>

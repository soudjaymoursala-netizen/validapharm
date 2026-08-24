<script setup lang="ts">
// Éditeur de section (FDS §2). Rédaction guidée par le moteur de gabarits
// déclaratif (FDS §4, tâche #12) quand une définition existe pour le
// template_type de la section ; repli sur un champ de contenu générique
// sinon (gabarits pas encore définis dans le catalogue — voir
// logique-metier/gabarits/catalogue/index.ts). Transitions de statut avec
// garde-fous fidèles (FDS §3.2/§3.3), sauvegarde automatique (URS-F-009).
import { computed, onMounted, ref, watch } from 'vue'
import { genererExportCSV } from '../../logique-metier/export/genererExportCSV'
import { genererExportJSON } from '../../logique-metier/export/genererExportJSON'
import { genererExportWord } from '../../logique-metier/export/genererExportWord'
import { verifierBlocageExport } from '../../logique-metier/export/verifierBlocageExport'
import { obtenirDefinitionGabarit } from '../../logique-metier/gabarits/catalogue'
import type { ChampTableauDynamique } from '../../logique-metier/gabarits/definitionGabarit'
import type { Section } from '../../logique-metier/domaine/types'
import RenduGabarit from '../composants/RenduGabarit.vue'
import { libelleStatut, messageSysteme, type CodeMessageSysteme } from '../i18n/messages'
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

const definitionGabarit = computed(() =>
  section.value ? obtenirDefinitionGabarit(section.value.template_type) : undefined,
)

async function recharger(): Promise<void> {
  await sectionsStore.chargerSectionsDuProjet(props.projectId)
  const trouvee = (sectionsStore.sectionsParProjet[props.projectId] ?? []).find(
    (s) => s.id === props.sectionId,
  )
  section.value = trouvee
  contenu.value = typeof trouvee?.values.contenu === 'string' ? trouvee.values.contenu : ''
}

onMounted(recharger)

// Sauvegarde automatique locale, debounce court (URS-F-009) — uniquement
// pour le repli générique (pas de gabarit défini pour ce template_type) ;
// RenduGabarit gère son propre debounce par champ pour un gabarit défini.
watch(contenu, (valeur) => {
  if (definitionGabarit.value) return
  if (minuteurSauvegarde) clearTimeout(minuteurSauvegarde)
  minuteurSauvegarde = setTimeout(() => {
    void sectionsStore.mettreAJourValeurs(props.sectionId, { contenu: valeur })
  }, 400)
})

async function majValeursGabarit(valeurs: Record<string, string | number | null>): Promise<void> {
  // `valeurs` est déjà l'instantané complet et à jour calculé par
  // RenduGabarit — jamais refusionné ici avec `section.value.values`, qui
  // pourrait être en retard d'un aller-retour de sauvegarde (course
  // trouvée en navigateur entre deux champs modifiés rapidement).
  await sectionsStore.mettreAJourValeurs(props.sectionId, valeurs)
  await recharger()
}

async function majTableGabarit(
  cleTable: string,
  lignes: Array<Record<string, string | number | null>>,
): Promise<void> {
  await sectionsStore.mettreAJourTable(props.sectionId, cleTable, lignes)
  await recharger()
}

// Export (FS §4.3, URS-F-020/021/022/027/028ter).
const blocageExport = computed(() =>
  section.value ? verifierBlocageExport(section.value) : { bloque: false as const },
)
const exportForce = ref(false)

const tableauxExportables = computed<ChampTableauDynamique[]>(() => {
  if (!definitionGabarit.value) return []
  return definitionGabarit.value.sections.flatMap((s) =>
    s.fields.filter((f): f is ChampTableauDynamique => f.type === 'tableau_dynamique'),
  )
})

function telechargerFichier(nomFichier: string, contenu: string, typeMime: string): void {
  const blob = new Blob([contenu], { type: typeMime })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(url)
}

async function journaliserEtReinitialiser(): Promise<void> {
  await sectionsStore.journaliserExport(props.sectionId, blocageExport.value.bloque)
  exportForce.value = false
  await recharger()
}

async function exporterJSON(): Promise<void> {
  if (!section.value) return
  telechargerFichier(
    `${section.value.meta.ref || section.value.id}.json`,
    genererExportJSON(section.value),
    'application/json',
  )
  await journaliserEtReinitialiser()
}

async function exporterWord(): Promise<void> {
  if (!section.value) return
  const html = genererExportWord(section.value, definitionGabarit.value, section.value.language)
  telechargerFichier(
    `${section.value.meta.ref || section.value.id}.doc`,
    html,
    'application/msword',
  )
  await journaliserEtReinitialiser()
}

async function exporterCSV(champ: ChampTableauDynamique): Promise<void> {
  if (!section.value) return
  const csv = genererExportCSV(
    champ.colonnes,
    section.value.tables[champ.field_key] ?? [],
    section.value.language,
  )
  telechargerFichier(
    `${section.value.meta.ref || section.value.id}-${champ.field_key}.csv`,
    csv,
    'text/csv',
  )
  await journaliserEtReinitialiser()
}

async function imprimer(): Promise<void> {
  await journaliserEtReinitialiser()
  window.print()
}

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
    <RouterLink
      :to="{ name: 'fiche-projet', params: { projectId: props.projectId } }"
      class="no-print"
    >
      &larr; Fiche projet
    </RouterLink>
    <h1>{{ section.meta.titre }}</h1>
    <p class="meta">
      {{ section.template_type }} — statut :
      <strong>{{ libelleStatut(section.status, section.language) }}</strong>
    </p>

    <RenduGabarit
      v-if="definitionGabarit"
      :key="section.id"
      :definition="definitionGabarit"
      :values="section.values"
      :tables="section.tables"
      :langue="section.language"
      :verrouille="section.status === 'valide_en_interne'"
      @maj-valeurs="majValeursGabarit"
      @maj-table="majTableGabarit"
    />
    <label v-else class="champ-contenu">
      Contenu
      <textarea v-model="contenu" :disabled="section.status === 'valide_en_interne'" rows="10" />
    </label>

    <section v-if="section.status !== 'valide_en_interne'" class="workflow no-print">
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

    <div v-if="messagesBlocage.length > 0" class="blocage no-print" role="alert">
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

    <p v-if="raisonTransitionBloquee" class="blocage no-print" role="alert">
      Transition refusée : {{ raisonTransitionBloquee }}
    </p>

    <div class="actions-cycle no-print">
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

    <section class="export no-print">
      <h2>Export (FS §4.3)</h2>

      <div v-if="blocageExport.bloque && !exportForce" class="blocage" role="alert">
        <p>{{ blocageExport.motif }}</p>
        <button type="button" @click="exportForce = true">
          Forcer l'export malgré l'avertissement
        </button>
      </div>

      <div v-else class="actions-export">
        <button type="button" @click="exporterJSON">Exporter en JSON</button>
        <button type="button" @click="exporterWord">Exporter en Word (.doc)</button>
        <button type="button" @click="imprimer">Imprimer / Exporter en PDF</button>
        <button
          v-for="champ in tableauxExportables"
          :key="champ.field_key"
          type="button"
          @click="exporterCSV(champ)"
        >
          Exporter « {{ champ.labels[section.language] ?? champ.labels.fr }} » en CSV
        </button>
      </div>
    </section>
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

.actions-export {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Impression / export PDF (FS §4.3) : uniquement le contenu du livrable,
   jamais le chrome applicatif (navigation, actions de workflow, export). */
@media print {
  .no-print {
    display: none !important;
  }
}
</style>

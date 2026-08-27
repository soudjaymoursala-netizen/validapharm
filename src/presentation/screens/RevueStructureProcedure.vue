<script setup lang="ts">
// Écran de revue de structure procédurale (Phase 25, `docs/convergence/
// PHASE_25_ECRAN_REVUE_STRUCTURE_PROCEDURE_SPEC.md`, TD-023) — point
// d'entrée humain pour `proposerStructureProcedureAvecRepli` (parseur
// déterministe Phases 21-22, repli IA Phase 24 seulement si strictement
// rien trouvé). Aucune proposition n'est jamais écrite dans
// `Procedure`/`ProcedureStep` sans confirmation explicite ici (TD-016) —
// l'humain retient/exclut chaque étape avant `confirmerProposition`.
import { computed, onMounted, reactive, ref } from 'vue'
import { extraireTableauxDocx, extraireTexteDocx } from '../../connecteurs/office/DocxNatifAdapter'
import { extraireTextePdf } from '../../connecteurs/pdf/PdfNatifAdapter'
import type { EtatConfianceIA, TableauDocx } from '../../logique-metier/domaine/types'
import { adaptateurAvecBascule, construireAdaptateursIA } from '../stores/construireAdaptateursIA'
import { useClientConfigStore } from '../stores/useClientConfigStore'
import { useConnexionRelaisIAStore } from '../stores/useConnexionRelaisIAStore'
import { NOMS_FOURNISSEURS } from '../stores/usePanneauChatStore'
import { useProcedureStore } from '../stores/useProcedureStore'

const props = defineProps<{ clientId: string }>()

const procedureStore = useProcedureStore()
const configStore = useClientConfigStore()
const relaisStore = useConnexionRelaisIAStore()

interface EtapeEditable {
  retenue: boolean
  description: string
  obligatoire: boolean
  condition: string
  responsable: string
  etatConfiance: EtatConfianceIA | null
}

const texteBrut = ref('')
const tableauxExtraits = ref<TableauDocx[]>([])
const nomFichierCharge = ref<string | null>(null)
const enExtraction = ref(false)
const erreurExtraction = ref<string | null>(null)

const enGeneration = ref(false)
const erreurGeneration = ref<string | null>(null)
const sourceProposition = ref<'deterministe' | 'ia' | null>(null)
const sectionsProposees = ref<
  Array<{ canon: string; titreDetecte: string; texte?: string; etat_confiance?: EtatConfianceIA }>
>([])
const texteReponseBrute = ref<string | null>(null)
const etapesEditables = ref<EtapeEditable[]>([])

const procedureInput = reactive({ reference: '', titre: '', effectiveDate: '' })

const nomFournisseurActuel = computed(
  () => NOMS_FOURNISSEURS[configStore.config?.ai_provider ?? 'claude'] ?? 'Claude',
)

const procedureExistantes = computed(() =>
  procedureStore.procedures.filter((p) => p.client_id === props.clientId),
)

const LIBELLES_CONFIANCE: Record<EtatConfianceIA, string> = {
  connu: 'Connu (vérifié)',
  infere: 'Inféré',
  inconnu: 'Inconnu',
  conflit: 'Conflit',
  a_verifier: 'À vérifier',
}

onMounted(async () => {
  await Promise.all([
    procedureStore.charger(props.clientId),
    configStore.charger(props.clientId),
    relaisStore.charger(),
  ])
})

async function importerFichier(evenement: Event): Promise<void> {
  erreurExtraction.value = null
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return

  enExtraction.value = true
  try {
    const tampon = await fichier.arrayBuffer()
    if (fichier.name.toLowerCase().endsWith('.pdf')) {
      const resultat = await extraireTextePdf(tampon)
      texteBrut.value = resultat.texte
      tableauxExtraits.value = []
    } else {
      const [{ texte }, tableaux] = await Promise.all([
        extraireTexteDocx(tampon),
        extraireTableauxDocx(tampon),
      ])
      texteBrut.value = texte
      tableauxExtraits.value = tableaux
    }
    nomFichierCharge.value = fichier.name
  } catch (e) {
    erreurExtraction.value =
      e instanceof Error ? e.message : "Erreur inconnue lors de l'extraction du fichier."
  } finally {
    enExtraction.value = false
    ;(evenement.target as HTMLInputElement).value = ''
  }
}

async function genererLaProposition(): Promise<void> {
  if (texteBrut.value.trim().length === 0) return
  erreurGeneration.value = null
  enGeneration.value = true
  try {
    const estFournisseurCloud = (configStore.config?.ai_provider ?? 'claude') !== 'local'
    const { principal, local } = construireAdaptateursIA({
      estFournisseurCloud,
      nomFournisseurActuel: nomFournisseurActuel.value,
      relayUrl: relaisStore.connexion?.relayUrl,
      jetonRelais: relaisStore.connexion?.jeton,
    })
    const proposition = await procedureStore.genererProposition(
      texteBrut.value,
      tableauxExtraits.value,
      adaptateurAvecBascule(principal, local),
    )

    sourceProposition.value = proposition.source
    sectionsProposees.value = proposition.sections
    texteReponseBrute.value = proposition.source === 'ia' ? proposition.texteReponseBrute : null
    etapesEditables.value = proposition.etapesProposees.map((etape) => ({
      retenue: true,
      description: etape.description,
      obligatoire: true,
      condition: 'conditionDetectee' in etape ? (etape.conditionDetectee ?? '') : '',
      responsable: 'responsableDetecte' in etape ? (etape.responsableDetecte ?? '') : '',
      etatConfiance: 'etat_confiance' in etape ? etape.etat_confiance : null,
    }))
  } catch (e) {
    erreurGeneration.value =
      e instanceof Error ? e.message : 'Erreur inconnue lors de la génération de la proposition.'
  } finally {
    enGeneration.value = false
  }
}

function reinitialiser(): void {
  sourceProposition.value = null
  sectionsProposees.value = []
  etapesEditables.value = []
  texteReponseBrute.value = null
  texteBrut.value = ''
  tableauxExtraits.value = []
  nomFichierCharge.value = null
  procedureInput.reference = ''
  procedureInput.titre = ''
  procedureInput.effectiveDate = ''
}

function annuler(): void {
  procedureStore.annulerProposition()
  reinitialiser()
}

async function confirmer(): Promise<void> {
  if (procedureInput.reference.trim().length === 0 || procedureInput.titre.trim().length === 0) {
    return
  }
  const etapesRetenues = etapesEditables.value
    .filter((etape) => etape.retenue)
    .map((etape) => ({
      description: etape.description,
      obligatoire: etape.obligatoire,
      condition: etape.condition.trim().length > 0 ? etape.condition : null,
      responsable: etape.responsable.trim().length > 0 ? etape.responsable : null,
    }))
  await procedureStore.confirmerProposition(props.clientId, { ...procedureInput }, etapesRetenues)
  reinitialiser()
}
</script>

<template>
  <main class="revue-structure-procedure">
    <header>
      <h1>Structuration de procédure</h1>
      <p>
        Collez le texte d'une SOP ou importez un fichier <code>.docx</code>/<code>.pdf</code> — une
        structure est proposée automatiquement (déterministe d'abord, IA seulement si aucune section
        ni étape n'est trouvée), à revoir et confirmer avant toute création réelle.
      </p>
    </header>

    <section class="saisie">
      <h2>Document source</h2>
      <label class="bouton-fichier">
        Importer un fichier (.docx / .pdf)
        <input type="file" accept=".docx,.pdf" @change="importerFichier" />
      </label>
      <p v-if="enExtraction">Extraction du fichier en cours…</p>
      <p v-if="nomFichierCharge" class="nom-fichier">Fichier chargé : {{ nomFichierCharge }}</p>
      <p v-if="erreurExtraction" class="bandeau-erreur" role="alert">{{ erreurExtraction }}</p>

      <textarea
        v-model="texteBrut"
        rows="10"
        placeholder="…ou collez ici le texte brut de la procédure"
      ></textarea>

      <button
        type="button"
        :disabled="enGeneration || texteBrut.trim().length === 0"
        @click="genererLaProposition"
      >
        {{ enGeneration ? 'Génération…' : 'Générer la proposition' }}
      </button>
      <p v-if="erreurGeneration" class="bandeau-erreur" role="alert">{{ erreurGeneration }}</p>
    </section>

    <section v-if="sourceProposition" class="proposition">
      <header>
        <h2>Proposition</h2>
        <span :class="['badge-source', `badge-source--${sourceProposition}`]">
          {{ sourceProposition === 'ia' ? 'Repli IA' : 'Parseur déterministe' }}
        </span>
      </header>

      <div v-if="sectionsProposees.length > 0" class="sections">
        <h3>Sections détectées</h3>
        <article v-for="(section, index) in sectionsProposees" :key="index" class="section">
          <header>
            <strong>{{ section.titreDetecte }}</strong>
            <span class="canon">({{ section.canon }})</span>
            <span
              v-if="section.etat_confiance"
              :class="['badge-confiance', `badge-confiance--${section.etat_confiance}`]"
            >
              {{ LIBELLES_CONFIANCE[section.etat_confiance] }}
            </span>
          </header>
          <p v-if="section.texte">{{ section.texte }}</p>
        </article>
      </div>

      <div class="etapes">
        <h3>Étapes proposées</h3>
        <p v-if="etapesEditables.length === 0">Aucune étape proposée — saisie manuelle requise.</p>
        <article v-for="(etape, index) in etapesEditables" :key="index" class="etape">
          <label class="retenue">
            <input v-model="etape.retenue" type="checkbox" />
            Retenir
          </label>
          <textarea v-model="etape.description" rows="2"></textarea>
          <label class="obligatoire">
            <input v-model="etape.obligatoire" type="checkbox" />
            Obligatoire
          </label>
          <input v-model="etape.condition" type="text" placeholder="Condition (facultatif)" />
          <input v-model="etape.responsable" type="text" placeholder="Responsable (facultatif)" />
          <span
            v-if="etape.etatConfiance"
            :class="['badge-confiance', `badge-confiance--${etape.etatConfiance}`]"
          >
            {{ LIBELLES_CONFIANCE[etape.etatConfiance] }}
          </span>
        </article>
      </div>

      <details v-if="texteReponseBrute">
        <summary>Réponse brute du modèle IA</summary>
        <pre>{{ texteReponseBrute }}</pre>
      </details>

      <form class="metadonnees" @submit.prevent="confirmer">
        <h3>Métadonnées de la procédure</h3>
        <label>
          Référence
          <input v-model="procedureInput.reference" type="text" required />
        </label>
        <label>
          Titre
          <input v-model="procedureInput.titre" type="text" required />
        </label>
        <label>
          Date d'effet
          <input v-model="procedureInput.effectiveDate" type="date" required />
        </label>
        <div class="actions">
          <button type="submit">Confirmer et créer la procédure</button>
          <button type="button" class="secondaire" @click="annuler">Annuler</button>
        </div>
      </form>
    </section>

    <section v-if="procedureExistantes.length > 0" class="procedures-existantes">
      <h2>Procédures déjà créées</h2>
      <article v-for="procedure in procedureExistantes" :key="procedure.id" class="procedure">
        <header>
          <strong>{{ procedure.titre }}</strong>
          <span>{{ procedure.reference }} — v{{ procedure.numero_version }}</span>
        </header>
        <ol>
          <li v-for="etape in procedureStore.etapesDeProcedure(procedure.id)" :key="etape.id">
            {{ etape.description }}
          </li>
        </ol>
      </article>
    </section>
  </main>
</template>

<style scoped>
.revue-structure-procedure {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 960px;
}

header p {
  color: var(--vp-texte-secondaire);
}

section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  background-color: var(--vp-fond-carte);
}

.proposition > header,
.procedure > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bouton-fichier {
  display: inline-block;
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  cursor: pointer;
  width: fit-content;
}

.bouton-fichier input {
  display: none;
}

.nom-fichier {
  color: var(--vp-texte-secondaire);
  font-size: 0.85rem;
}

textarea {
  width: 100%;
  font-family: inherit;
  padding: 0.5rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
}

.bandeau-erreur {
  color: var(--vp-statut-requalification-en-retard);
}

.section,
.etape,
.procedure {
  padding: 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.section header,
.etape {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.etape textarea {
  flex: 1 1 100%;
}

.canon {
  color: var(--vp-texte-secondaire);
  font-size: 0.8rem;
}

.metadonnees {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.metadonnees label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.actions .secondaire {
  background: transparent;
  border: 1px solid var(--vp-bordure);
  color: var(--vp-texte-principal);
}

.badge-source {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-source--deterministe {
  background-color: #dcfce7;
  color: #166534;
}

.badge-source--ia {
  background-color: #dbeafe;
  color: #1e40af;
}

/* Badge de confiance : même style que MissionWorkspace.vue (TD-010 —
   jamais les jetons --vp-statut-* de qualification_status). */
.badge-confiance {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-confiance--connu {
  background-color: #dcfce7;
  color: #166534;
}

.badge-confiance--infere {
  background-color: #dbeafe;
  color: #1e40af;
}

.badge-confiance--inconnu {
  background-color: #f3f4f6;
  color: #374151;
}

.badge-confiance--conflit {
  background-color: #fee2e2;
  color: #991b1b;
}

.badge-confiance--a_verifier {
  background-color: #fef3c7;
  color: #92400e;
}

ol {
  margin: 0;
  padding-left: 1.2rem;
}
</style>

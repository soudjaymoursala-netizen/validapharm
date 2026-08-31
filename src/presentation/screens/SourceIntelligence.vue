<script setup lang="ts">
// Écran Source → SourceVersion → Extraction → ExtractionItem → KnowledgeItem
// (+ Confirmation/KnowledgeRelation/Conflict) — Phase 8a de convergence
// architecturale. Gap trouvé en poursuivant l'inventaire de §5.31
// CONTEXTE-REPRISE-SESSION.md : le domaine, la persistance et le store
// existaient sans aucun écran, aucun point d'entrée UI pour le pipeline
// d'ingestion documentaire.
import { onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useSourceIntelligenceStore } from '../stores/useSourceIntelligenceStore'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import type {
  MethodeExtraction,
  SystemeLocalisationSource,
  TypeSource,
} from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const sourceStore = useSourceIntelligenceStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await sourceStore.charger(props.clientId)
})

function libelleSource(sourceId: string): string {
  const s = sourceStore.sources.find((s) => s.id === sourceId)
  return s ? s.titre : sourceId
}

function libelleVersion(sourceVersionId: string): string {
  const v = sourceStore.sourceVersions.find((v) => v.id === sourceVersionId)
  return v ? `${libelleSource(v.source_id)} v${v.numero_version}` : sourceVersionId
}

function libelleExtraction(extractionId: string): string {
  const e = sourceStore.extractions.find((e) => e.id === extractionId)
  return e ? libelleVersion(e.source_version_id) : extractionId
}

function libelleExtractionItem(extractionItemId: string): string {
  const i = sourceStore.extractionItems.find((i) => i.id === extractionItemId)
  return i ? i.contenu.slice(0, 40) : extractionItemId
}

function libelleKnowledgeItem(knowledgeItemId: string): string {
  const k = sourceStore.knowledgeItems.find((k) => k.id === knowledgeItemId)
  return k ? k.libelle : knowledgeItemId
}

// --- Sources ---
const typeSource = ref<TypeSource>('document')
const titreSource = ref('')

async function creerSource(): Promise<void> {
  if (titreSource.value.trim().length === 0) return
  await sourceStore.creerSource(props.clientId, {
    type: typeSource.value,
    titre: titreSource.value.trim(),
  })
  titreSource.value = ''
}

const sourcePourLocalisation = ref('')
const systemeLocalisation = ref<SystemeLocalisationSource>('github')
const referenceLocalisation = ref('')

async function ajouterLocalisation(): Promise<void> {
  if (!sourcePourLocalisation.value || referenceLocalisation.value.trim().length === 0) return
  await sourceStore.ajouterLocalisation(props.clientId, sourcePourLocalisation.value, {
    systeme: systemeLocalisation.value,
    reference: referenceLocalisation.value.trim(),
  })
  referenceLocalisation.value = ''
}

async function creerVersion(sourceId: string): Promise<void> {
  await sourceStore.creerSourceVersion(props.clientId, sourceId)
}

// --- Extractions ---
const versionPourExtraction = ref('')
const methodeExtraction = ref<MethodeExtraction>('saisie_manuelle')

async function enregistrerExtraction(): Promise<void> {
  if (!versionPourExtraction.value) return
  await sourceStore.enregistrerExtraction(props.clientId, versionPourExtraction.value, {
    methode: methodeExtraction.value,
  })
  versionPourExtraction.value = ''
}

// --- ExtractionItems ---
const extractionPourItem = ref('')
const contenuItem = ref('')
const positionItem = ref(1)

async function ajouterExtractionItem(): Promise<void> {
  if (!extractionPourItem.value || contenuItem.value.trim().length === 0) return
  await sourceStore.ajouterExtractionItem(props.clientId, extractionPourItem.value, {
    contenu: contenuItem.value.trim(),
    position: positionItem.value,
  })
  contenuItem.value = ''
  positionItem.value += 1
}

// --- KnowledgeItems ---
const extractionItemPourKnowledge = ref('')
const libelleKnowledgeInput = ref('')
const valeurInterpreteeInput = ref('')

async function creerKnowledgeItem(): Promise<void> {
  if (!extractionItemPourKnowledge.value || libelleKnowledgeInput.value.trim().length === 0) return
  await sourceStore.creerKnowledgeItem(props.clientId, extractionItemPourKnowledge.value, {
    libelle: libelleKnowledgeInput.value.trim(),
    valeurInterpretee: valeurInterpreteeInput.value.trim(),
  })
  libelleKnowledgeInput.value = ''
  valeurInterpreteeInput.value = ''
}

async function validerKnowledgeItem(knowledgeItemId: string): Promise<void> {
  await sourceStore.validerKnowledgeItem(
    props.clientId,
    knowledgeItemId,
    IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
  )
}

async function rejeterKnowledgeItem(knowledgeItemId: string): Promise<void> {
  await sourceStore.rejeterKnowledgeItem(
    props.clientId,
    knowledgeItemId,
    IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
  )
}

// --- Relations ---
const knowledgeSourceRelation = ref('')
const knowledgeCibleRelation = ref('')
const typeRelation = ref('')

async function declarerRelation(): Promise<void> {
  if (
    !knowledgeSourceRelation.value ||
    !knowledgeCibleRelation.value ||
    typeRelation.value.trim().length === 0
  )
    return
  await sourceStore.declarerRelation(props.clientId, {
    knowledgeItemSourceId: knowledgeSourceRelation.value,
    knowledgeItemCibleId: knowledgeCibleRelation.value,
    type: typeRelation.value.trim(),
  })
  typeRelation.value = ''
}

// --- Conflits ---
const knowledgeSourceConflit = ref('')
const knowledgeCibleConflit = ref('')
const descriptionConflit = ref('')
const resolutionsBrouillon = ref<Record<string, string>>({})

async function declarerConflit(): Promise<void> {
  if (
    !knowledgeSourceConflit.value ||
    !knowledgeCibleConflit.value ||
    descriptionConflit.value.trim().length === 0
  )
    return
  await sourceStore.declarerConflit(props.clientId, {
    knowledgeItemSourceId: knowledgeSourceConflit.value,
    knowledgeItemCibleId: knowledgeCibleConflit.value,
    description: descriptionConflit.value.trim(),
  })
  descriptionConflit.value = ''
}

async function resoudreConflit(conflictId: string): Promise<void> {
  const resolution = resolutionsBrouillon.value[conflictId]?.trim()
  if (!resolution) return
  await sourceStore.resoudreConflit(props.clientId, conflictId, resolution)
  resolutionsBrouillon.value[conflictId] = ''
}

const LIBELLES_STATUT_KNOWLEDGE: Record<string, string> = {
  a_valider: 'À valider',
  valide: 'Validé',
  rejete: 'Rejeté',
}
</script>

<template>
  <main class="source-intelligence">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Ingestion documentaire — {{ nomClient ?? props.clientId }}</h1>
    <p class="rappel">
      Un `KnowledgeItem` naît toujours `à valider` — jamais validé automatiquement. Aucun appel IA
      réel : la valeur interprétée est toujours saisie par l'utilisateur.
    </p>

    <section class="bloc-sources">
      <h2>Sources</h2>
      <form class="formulaire" @submit.prevent="creerSource">
        <label>
          Type
          <select v-model="typeSource">
            <option value="document">Document</option>
            <option value="image">Image</option>
          </select>
        </label>
        <label>
          Titre
          <input v-model="titreSource" type="text" required placeholder="ex. Manuel AC-104" />
        </label>
        <button type="submit">Créer la source</button>
      </form>
      <ul v-if="sourceStore.sources.length > 0">
        <li v-for="s in sourceStore.sources" :key="s.id">
          {{ s.titre }} ({{ s.type }})
          <button type="button" @click="creerVersion(s.id)">+ Nouvelle version</button>
        </li>
      </ul>
      <p v-else>Aucune source pour l'instant.</p>
    </section>

    <section class="bloc-localisation">
      <h2>Localisation de source</h2>
      <form class="formulaire" @submit.prevent="ajouterLocalisation">
        <label>
          Source
          <select v-model="sourcePourLocalisation" required>
            <option value="">— choisir —</option>
            <option v-for="s in sourceStore.sources" :key="s.id" :value="s.id">
              {{ s.titre }}
            </option>
          </select>
        </label>
        <label>
          Système
          <select v-model="systemeLocalisation">
            <option value="github">GitHub</option>
            <option value="drive">Drive</option>
            <option value="externe">Externe</option>
          </select>
        </label>
        <label>
          Référence
          <input v-model="referenceLocalisation" type="text" required />
        </label>
        <button type="submit">Ajouter la localisation</button>
      </form>
      <ul v-if="sourceStore.sourceLocations.length > 0">
        <li v-for="l in sourceStore.sourceLocations" :key="l.id">
          {{ libelleSource(l.source_id) }} — {{ l.systeme }} : {{ l.reference }}
        </li>
      </ul>
    </section>

    <section class="bloc-extractions">
      <h2>Extractions</h2>
      <form class="formulaire" @submit.prevent="enregistrerExtraction">
        <label>
          Version de source
          <select v-model="versionPourExtraction" required>
            <option value="">— choisir —</option>
            <option v-for="v in sourceStore.sourceVersions" :key="v.id" :value="v.id">
              {{ libelleVersion(v.id) }}
            </option>
          </select>
        </label>
        <label>
          Méthode
          <select v-model="methodeExtraction">
            <option value="saisie_manuelle">Saisie manuelle</option>
            <option value="ocr_azure">OCR (Azure)</option>
            <option value="docx_natif">Word natif</option>
            <option value="pdf_natif">PDF natif</option>
          </select>
        </label>
        <button type="submit">Enregistrer l'extraction</button>
      </form>
      <ul v-if="sourceStore.extractions.length > 0">
        <li v-for="e in sourceStore.extractions" :key="e.id">
          {{ libelleExtraction(e.id) }} — {{ e.methode }}
        </li>
      </ul>
    </section>

    <section class="bloc-extraction-items">
      <h2>Éléments extraits</h2>
      <form class="formulaire" @submit.prevent="ajouterExtractionItem">
        <label>
          Extraction
          <select v-model="extractionPourItem" required>
            <option value="">— choisir —</option>
            <option v-for="e in sourceStore.extractions" :key="e.id" :value="e.id">
              {{ libelleExtraction(e.id) }}
            </option>
          </select>
        </label>
        <label>
          Contenu
          <textarea v-model="contenuItem" rows="2" required />
        </label>
        <label>
          Position
          <input v-model.number="positionItem" type="number" min="1" />
        </label>
        <button type="submit">Ajouter l'élément (immutable)</button>
      </form>
      <ul v-if="sourceStore.extractionItems.length > 0">
        <li v-for="i in sourceStore.extractionItems" :key="i.id">
          #{{ i.position }} — {{ i.contenu }}
        </li>
      </ul>
    </section>

    <section class="bloc-knowledge-items">
      <h2>Éléments de connaissance</h2>
      <form class="formulaire" @submit.prevent="creerKnowledgeItem">
        <label>
          Élément extrait
          <select v-model="extractionItemPourKnowledge" required>
            <option value="">— choisir —</option>
            <option v-for="i in sourceStore.extractionItems" :key="i.id" :value="i.id">
              {{ libelleExtractionItem(i.id) }}
            </option>
          </select>
        </label>
        <label>
          Libellé
          <input v-model="libelleKnowledgeInput" type="text" required />
        </label>
        <label>
          Valeur interprétée
          <input v-model="valeurInterpreteeInput" type="text" />
        </label>
        <button type="submit">Créer (à valider)</button>
      </form>
      <ul v-if="sourceStore.knowledgeItems.length > 0" class="liste-knowledge">
        <li v-for="k in sourceStore.knowledgeItems" :key="k.id">
          <strong>{{ k.libelle }}</strong> = {{ k.valeur_interpretee }} —
          <strong>{{ LIBELLES_STATUT_KNOWLEDGE[k.statut] }}</strong>
          <template v-if="k.statut === 'a_valider'">
            <button type="button" @click="validerKnowledgeItem(k.id)">Valider</button>
            <button type="button" @click="rejeterKnowledgeItem(k.id)">Rejeter</button>
          </template>
        </li>
      </ul>
      <p v-else>Aucun élément de connaissance pour l'instant.</p>
    </section>

    <section class="bloc-relations">
      <h2>Relations entre éléments de connaissance</h2>
      <form class="formulaire" @submit.prevent="declarerRelation">
        <label>
          Depuis
          <select v-model="knowledgeSourceRelation" required>
            <option value="">— choisir —</option>
            <option v-for="k in sourceStore.knowledgeItems" :key="k.id" :value="k.id">
              {{ k.libelle }}
            </option>
          </select>
        </label>
        <label>
          Vers
          <select v-model="knowledgeCibleRelation" required>
            <option value="">— choisir —</option>
            <option v-for="k in sourceStore.knowledgeItems" :key="k.id" :value="k.id">
              {{ k.libelle }}
            </option>
          </select>
        </label>
        <label>
          Type de relation
          <input v-model="typeRelation" type="text" required placeholder="ex. précise" />
        </label>
        <button type="submit">Déclarer la relation</button>
      </form>
      <ul v-if="sourceStore.knowledgeRelations.length > 0">
        <li v-for="r in sourceStore.knowledgeRelations" :key="r.id">
          {{ libelleKnowledgeItem(r.knowledge_item_source_id) }} —{{ r.type }}→
          {{ libelleKnowledgeItem(r.knowledge_item_cible_id) }}
        </li>
      </ul>
    </section>

    <section class="bloc-conflits">
      <h2>Conflits</h2>
      <form class="formulaire" @submit.prevent="declarerConflit">
        <label>
          Depuis
          <select v-model="knowledgeSourceConflit" required>
            <option value="">— choisir —</option>
            <option v-for="k in sourceStore.knowledgeItems" :key="k.id" :value="k.id">
              {{ k.libelle }}
            </option>
          </select>
        </label>
        <label>
          Vers
          <select v-model="knowledgeCibleConflit" required>
            <option value="">— choisir —</option>
            <option v-for="k in sourceStore.knowledgeItems" :key="k.id" :value="k.id">
              {{ k.libelle }}
            </option>
          </select>
        </label>
        <label>
          Description
          <textarea v-model="descriptionConflit" rows="2" required />
        </label>
        <button type="submit">Déclarer le conflit</button>
      </form>
      <ul v-if="sourceStore.conflitsOuverts().length > 0" class="liste-conflits">
        <li v-for="c in sourceStore.conflitsOuverts()" :key="c.id">
          <p>
            {{ libelleKnowledgeItem(c.knowledge_item_source_id) }} vs
            {{ libelleKnowledgeItem(c.knowledge_item_cible_id) }} — {{ c.description }}
          </p>
          <input v-model="resolutionsBrouillon[c.id]" type="text" placeholder="Résolution" />
          <button type="button" @click="resoudreConflit(c.id)">Résoudre</button>
        </li>
      </ul>
      <p v-else>Aucun conflit ouvert.</p>
    </section>
  </main>
</template>

<style scoped>
.source-intelligence {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 52rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure, #ddd);
  padding: 1rem;
  border-radius: 0.5rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input[type='text'],
input[type='number'],
select,
textarea {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
}

.liste-conflits li {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

button {
  cursor: pointer;
}
</style>

<script setup lang="ts">
// Structure Système — référentiel d'actifs (FS §4.10, URS-F-100 à
// 100decies). Hiérarchie configurable + CRUD de nœuds avec absence de
// cycle et unicité du code, relations techniques (URS-F-240) et statut
// de qualification (URS-F-101/101bis). Hors périmètre : graphe
// `associated_nodes[]`, pull QMS, dossier vivant agrégé (voir
// `DossierVivantActif.vue`), liaison projet↔nœud.
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import {
  useStructureSystemeStore,
  type ResultatActionNoeud,
  type ResultatImportHierarchie,
} from '../stores/useStructureSystemeStore'
import type {
  AssetNode,
  QualificationStatus,
  TypeRelationTechnique,
} from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()

const nomClient = ref<string | null>(null)
const brouillonNiveau = reactive({ key: '', libelleFr: '', numbering_pattern: '' })
const brouillonNoeud = reactive({ level_key: '', name: '', code: '', parent_id: '' })
const resultatCreation = ref<ResultatActionNoeud | undefined>(undefined)
const reparentageEnErreur = reactive<Record<string, string>>({})

// --- Relations techniques (URS-F-240, Phase 18) — logique déjà présente
// dans le store depuis la Phase 18, jamais exposée à l'écran jusqu'ici
// (trouvé en simulant un vrai parcours de requalification, 31/08/2026).
const LIBELLES_TYPE_RELATION: Record<TypeRelationTechnique, string> = {
  controle_par: 'est contrôlé par',
  connecte_a: 'est connecté à',
  heberge_sur: 'est hébergé sur',
}
const brouillonRelation = reactive({
  type_relation: '' as TypeRelationTechnique | '',
  noeud_source_id: '',
  noeud_cible_id: '',
})
const erreurRelation = ref<string | null>(null)

async function creerRelation(): Promise<void> {
  erreurRelation.value = null
  if (
    !brouillonRelation.type_relation ||
    !brouillonRelation.noeud_source_id ||
    !brouillonRelation.noeud_cible_id
  ) {
    return
  }
  const resultat = await structureStore.creerRelationTechnique(
    props.clientId,
    brouillonRelation.type_relation,
    brouillonRelation.noeud_source_id,
    brouillonRelation.noeud_cible_id,
  )
  if (!resultat.ok) {
    erreurRelation.value =
      resultat.raison === 'noeud_introuvable'
        ? "L'un des deux nœuds sélectionnés est introuvable."
        : 'Les deux nœuds doivent appartenir au même client.'
    return
  }
  brouillonRelation.type_relation = ''
  brouillonRelation.noeud_source_id = ''
  brouillonRelation.noeud_cible_id = ''
}

const noeudEnDeploiement = ref<string | null>(null)
const chaineAffichee = computed(() =>
  noeudEnDeploiement.value
    ? structureStore.chaineTechniqueDepuisNoeud(noeudEnDeploiement.value)
    : [],
)

// --- Statut de qualification (URS-F-101, URS-F-101bis) — modélisé dans
// `AssetNode` depuis la conception mais jamais éditable après la création
// (toujours figé à `non_qualifie`, trouvé identique en simulant une
// requalification périodique réelle, 31/08/2026). Édition manuelle
// uniquement : jamais de transition automatique fabriquée par l'outil.
const LIBELLES_STATUT_QUALIFICATION: Record<QualificationStatus, string> = {
  non_qualifie: 'Non qualifié',
  en_cours_qualification_initiale: 'En cours de qualification initiale',
  qualifie: 'Qualifié',
  qualifie_ecart_ouvert: 'Qualifié — écart ouvert',
  requalification_requise: 'Requalification requise',
  requalification_en_retard: 'Requalification en retard',
  suspendu: 'Suspendu',
  declasse: 'Déclassé',
}
const statutChoisi = reactive<Record<string, QualificationStatus | ''>>({})
const periodiciteApplicable = reactive<Record<string, boolean>>({})
const periodiciteEcheance = reactive<Record<string, string>>({})

// Initialise les brouillons d'édition dès qu'un nœud apparaît (chargement
// initial ou création) — un `v-for` ne peut pas appeler un hook de cycle
// de vie par itération, d'où ce watcher plutôt qu'un `onMounted` par ligne.
watch(
  () => structureStore.noeuds,
  (noeuds) => {
    for (const noeud of noeuds) {
      if (statutChoisi[noeud.id] === undefined) statutChoisi[noeud.id] = noeud.qualification_status
      if (periodiciteApplicable[noeud.id] === undefined) {
        periodiciteApplicable[noeud.id] = noeud.periodic_qualification.applicable
      }
      if (periodiciteEcheance[noeud.id] === undefined) {
        periodiciteEcheance[noeud.id] = noeud.periodic_qualification.deadline ?? ''
      }
    }
  },
  { immediate: true, deep: true },
)

async function enregistrerQualification(noeud: AssetNode): Promise<void> {
  const statut = statutChoisi[noeud.id]
  if (!statut) return
  await structureStore.modifierQualificationNoeud(noeud.id, {
    qualification_status: statut,
    periodic_qualification: {
      applicable: periodiciteApplicable[noeud.id] ?? false,
      deadline: periodiciteApplicable[noeud.id] ? periodiciteEcheance[noeud.id] || null : null,
    },
  })
}

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await structureStore.charger(props.clientId)
})

async function ajouterNiveau(): Promise<void> {
  if (brouillonNiveau.key.trim().length === 0) return
  await structureStore.ajouterNiveau(props.clientId, {
    key: brouillonNiveau.key.trim(),
    label: {
      fr: brouillonNiveau.libelleFr,
      en: brouillonNiveau.libelleFr,
      de: brouillonNiveau.libelleFr,
    },
    numbering_pattern: brouillonNiveau.numbering_pattern,
  })
  brouillonNiveau.key = ''
  brouillonNiveau.libelleFr = ''
  brouillonNiveau.numbering_pattern = ''
}

// --- Import XLSX de la hiérarchie (Phase 36, TD-042) — lecteur natif
// minimal (`jszip`+`DOMParser`, jamais une librairie Excel généraliste),
// convention colonne=niveau documentée à l'utilisateur avant l'import.
const resultatImport = ref<ResultatImportHierarchie | undefined>(undefined)
const importEnCours = ref(false)
const champFichier = ref<HTMLInputElement | null>(null)

const MESSAGES_ERREUR_IMPORT: Record<string, string> = {
  fichier_illisible: "Le fichier fourni n'est pas un .xlsx valide ou n'a pas pu être lu.",
  grille_vide: 'Le fichier ne contient aucune ligne.',
}

function messageErreurImport(resultat: Extract<ResultatImportHierarchie, { ok: false }>): string {
  if (resultat.raison === 'colonne_niveau_inconnue') {
    return `La colonne "${resultat.entete}" ne correspond à aucun niveau connu — créez ce niveau dans la hiérarchie configurable ci-dessus avant de réimporter.`
  }
  if (resultat.raison === 'ordre_colonnes_incoherent') {
    return `La colonne "${resultat.entete}" est dans le mauvais ordre — les colonnes doivent suivre l'ordre des niveaux (du plus générique au plus spécifique).`
  }
  return MESSAGES_ERREUR_IMPORT[resultat.raison] ?? 'Import refusé.'
}

async function importerFichier(evenement: Event): Promise<void> {
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return

  importEnCours.value = true
  resultatImport.value = undefined
  try {
    const contenu = await fichier.arrayBuffer()
    resultatImport.value = await structureStore.importerHierarchieDepuisXlsx(
      props.clientId,
      contenu,
    )
  } finally {
    importEnCours.value = false
    if (champFichier.value) champFichier.value.value = ''
  }
}

async function creerNoeud(): Promise<void> {
  resultatCreation.value = await structureStore.creerNoeud(props.clientId, {
    level_key: brouillonNoeud.level_key,
    name: brouillonNoeud.name,
    code: brouillonNoeud.code,
    parent_id: brouillonNoeud.parent_id || null,
  })
  if (resultatCreation.value.ok) {
    brouillonNoeud.name = ''
    brouillonNoeud.code = ''
  }
}

const parentChoisi = reactive<Record<string, string>>({})

async function reparenter(noeud: AssetNode): Promise<void> {
  const nouveauParentId = parentChoisi[noeud.id] || null
  const resultat = await structureStore.reparenterNoeud(noeud.id, nouveauParentId)
  if (!resultat.ok) {
    reparentageEnErreur[noeud.id] =
      resultat.raison === 'cycle_introduit'
        ? 'Ce reparentage créerait un cycle — refusé.'
        : 'Reparentage refusé.'
  } else {
    reparentageEnErreur[noeud.id] = ''
  }
}

// Signal visuel seulement — jamais d'écriture automatique sur
// `qualification_status` (édition manuelle uniquement, cf. plus haut) :
// dérivé à l'affichage, recalculé à chaque rendu, jamais persisté.
function echeanceDepassee(noeud: AssetNode): boolean {
  const echeance = noeud.periodic_qualification.deadline
  if (!noeud.periodic_qualification.applicable || !echeance) return false
  return echeance < new Date().toISOString().slice(0, 10)
}

function nomNoeud(id: string | null): string {
  if (id === null) return '— racine —'
  return structureStore.noeuds.find((n) => n.id === id)?.name ?? id
}

const noeudsAffiches = computed(() =>
  [...structureStore.noeuds].sort((a, b) => a.name.localeCompare(b.name)),
)
</script>

<template>
  <main class="structure-systeme">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Clients</RouterLink>
    <h1>Structure Système — {{ nomClient ?? props.clientId }}</h1>

    <section class="bloc-hierarchie">
      <h2>Hiérarchie configurable (URS-F-100bis)</h2>
      <ul class="liste-niveaux">
        <li v-for="niveau in structureStore.schema?.levels ?? []" :key="niveau.key">
          {{ niveau.label.fr }} ({{ niveau.key }})
        </li>
      </ul>
      <form class="formulaire" @submit.prevent="ajouterNiveau">
        <label>
          Clé du niveau
          <input v-model="brouillonNiveau.key" type="text" required placeholder="ex. site" />
        </label>
        <label>
          Libellé
          <input v-model="brouillonNiveau.libelleFr" type="text" required placeholder="ex. Site" />
        </label>
        <label>
          Motif de numérotation
          <input v-model="brouillonNiveau.numbering_pattern" type="text" placeholder="ex. S-{n}" />
        </label>
        <div class="actions">
          <button type="submit">Ajouter le niveau</button>
        </div>
      </form>
    </section>

    <section class="bloc-import">
      <h2>Importer depuis un fichier Excel</h2>
      <p class="rappel">
        Convention attendue : la première ligne du tableau contient les en-têtes de niveau (dans
        l'ordre de la hiérarchie configurable ci-dessus, ex. « Bâtiment », « Ligne », « Équipement
        »), avec une colonne « Code » optionnelle. Chaque ligne suivante décrit un chemin depuis la
        racine — les valeurs répétées d'une ligne à l'autre (ex. le même bâtiment) ne créent le nœud
        qu'une seule fois.
      </p>
      <input
        ref="champFichier"
        type="file"
        accept=".xlsx"
        :disabled="importEnCours"
        @change="importerFichier"
      />
      <p v-if="importEnCours" class="etat-vide">Import en cours…</p>
      <template v-else-if="resultatImport">
        <p v-if="resultatImport.ok" class="confirmation">
          {{ resultatImport.noeudsCrees }} nœud(s) créé(s).
          <span v-if="resultatImport.erreurs.length > 0">
            {{ resultatImport.erreurs.length }} ligne(s) ignorée(s) —
            <template v-for="(erreur, i) in resultatImport.erreurs" :key="i">
              ligne {{ erreur.ligne }} ({{
                erreur.raison === 'case_vide_au_milieu'
                  ? 'case vide au milieu de la ligne'
                  : 'code déjà utilisé'
              }}){{ i < resultatImport.erreurs.length - 1 ? ', ' : '' }}
            </template>
          </span>
        </p>
        <p v-else class="erreur" role="alert">{{ messageErreurImport(resultatImport) }}</p>
      </template>
    </section>

    <section class="bloc-noeuds">
      <h2>Nœuds du référentiel</h2>

      <form class="formulaire" @submit.prevent="creerNoeud">
        <label>
          Niveau
          <select v-model="brouillonNoeud.level_key" required>
            <option value="" disabled>— choisir —</option>
            <option
              v-for="niveau in structureStore.schema?.levels ?? []"
              :key="niveau.key"
              :value="niveau.key"
            >
              {{ niveau.label.fr }}
            </option>
          </select>
        </label>
        <label>
          Nom
          <input v-model="brouillonNoeud.name" type="text" required />
        </label>
        <label>
          Code (unique pour ce client)
          <input v-model="brouillonNoeud.code" type="text" required />
        </label>
        <label>
          Nœud parent
          <select v-model="brouillonNoeud.parent_id">
            <option value="">— racine —</option>
            <option v-for="n in noeudsAffiches" :key="n.id" :value="n.id">{{ n.name }}</option>
          </select>
        </label>
        <div class="actions">
          <button type="submit">Créer le nœud</button>
        </div>
      </form>
      <p v-if="resultatCreation?.ok === false" class="erreur" role="alert">
        {{
          resultatCreation.raison === 'code_deja_utilise'
            ? 'Ce code est déjà utilisé par un autre nœud de ce client.'
            : 'Ce rattachement créerait un cycle — refusé.'
        }}
      </p>

      <ul class="liste-noeuds">
        <li v-for="noeud in noeudsAffiches" :key="noeud.id">
          <div class="ligne-noeud">
            <strong>{{ noeud.name }}</strong>
            <span class="meta">({{ noeud.code }}, {{ noeud.level_key }})</span>
            <span class="meta">parent : {{ nomNoeud(noeud.parent_id) }}</span>
            <span v-if="echeanceDepassee(noeud)" class="badge-alerte" role="alert">
              ⚠ échéance de requalification dépassée
            </span>
            <RouterLink
              :to="{
                name: 'dossier-vivant-actif',
                params: { clientId: props.clientId, noeudId: noeud.id },
              }"
              class="lien-dossier-vivant"
            >
              Dossier vivant
            </RouterLink>
          </div>
          <div class="reparentage">
            <select v-model="parentChoisi[noeud.id]">
              <option value="">— racine —</option>
              <option
                v-for="n in noeudsAffiches.filter((c) => c.id !== noeud.id)"
                :key="n.id"
                :value="n.id"
              >
                {{ n.name }}
              </option>
            </select>
            <button type="button" @click="reparenter(noeud)">Reparenter</button>
          </div>
          <p v-if="reparentageEnErreur[noeud.id]" class="erreur" role="alert">
            {{ reparentageEnErreur[noeud.id] }}
          </p>
          <div class="qualification">
            <label>
              Statut de qualification
              <select v-model="statutChoisi[noeud.id]">
                <option
                  v-for="(libelle, code) in LIBELLES_STATUT_QUALIFICATION"
                  :key="code"
                  :value="code"
                >
                  {{ libelle }}
                </option>
              </select>
            </label>
            <label class="case-periodicite">
              <input v-model="periodiciteApplicable[noeud.id]" type="checkbox" />
              Requalification périodique
            </label>
            <label v-if="periodiciteApplicable[noeud.id]">
              Échéance
              <input v-model="periodiciteEcheance[noeud.id]" type="date" />
            </label>
            <button type="button" @click="enregistrerQualification(noeud)">Enregistrer</button>
          </div>
        </li>
      </ul>
      <p v-if="noeudsAffiches.length === 0" class="etat-vide">Aucun nœud pour l'instant.</p>
    </section>

    <section class="bloc-relations">
      <h2>Relations techniques (URS-F-240)</h2>
      <p class="rappel">
        Relation typée et dirigée entre deux nœuds (ex. « le PLC-01 contrôle l'Isolateur-02 ») —
        permet de tracer une chaîne technique complète (composant → équipement → PLC → SCADA →
        serveur).
      </p>
      <form class="formulaire" @submit.prevent="creerRelation">
        <label>
          Nœud source
          <select v-model="brouillonRelation.noeud_source_id" required>
            <option value="" disabled>— choisir —</option>
            <option v-for="n in noeudsAffiches" :key="n.id" :value="n.id">{{ n.name }}</option>
          </select>
        </label>
        <label>
          Type de relation
          <select v-model="brouillonRelation.type_relation" required>
            <option value="" disabled>— choisir —</option>
            <option v-for="(libelle, type) in LIBELLES_TYPE_RELATION" :key="type" :value="type">
              {{ libelle }}
            </option>
          </select>
        </label>
        <label>
          Nœud cible
          <select v-model="brouillonRelation.noeud_cible_id" required>
            <option value="" disabled>— choisir —</option>
            <option v-for="n in noeudsAffiches" :key="n.id" :value="n.id">{{ n.name }}</option>
          </select>
        </label>
        <div class="actions">
          <button type="submit">Créer la relation</button>
        </div>
      </form>
      <p v-if="erreurRelation" class="erreur" role="alert">{{ erreurRelation }}</p>

      <ul class="liste-relations">
        <li v-for="relation in structureStore.relationsTechniques" :key="relation.id">
          {{ nomNoeud(relation.noeud_source_id) }}
          {{ LIBELLES_TYPE_RELATION[relation.type_relation] }}
          {{ nomNoeud(relation.noeud_cible_id) }}
        </li>
      </ul>
      <p v-if="structureStore.relationsTechniques.length === 0" class="etat-vide">
        Aucune relation technique pour l'instant.
      </p>

      <div class="chaine-technique">
        <label>
          Tracer la chaîne technique depuis
          <select v-model="noeudEnDeploiement">
            <option :value="null">— choisir un nœud —</option>
            <option v-for="n in noeudsAffiches" :key="n.id" :value="n.id">{{ n.name }}</option>
          </select>
        </label>
        <ol v-if="chaineAffichee.length > 0" class="liste-chaine">
          <li v-for="etape in chaineAffichee" :key="etape.relation.id">
            {{ LIBELLES_TYPE_RELATION[etape.relation.type_relation] }} {{ etape.noeud.name }}
          </li>
        </ol>
        <p v-else-if="noeudEnDeploiement" class="etat-vide">
          Aucune relation sortante depuis ce nœud.
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.structure-systeme {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 40rem;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.formulaire label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input,
select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

button {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.liste-niveaux,
.liste-noeuds {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-noeuds li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ligne-noeud {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.reparentage {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge-alerte {
  color: var(--vp-statut-requalification-en-retard);
  font-size: 0.8em;
  font-weight: 600;
}

.lien-dossier-vivant {
  font-size: 0.85em;
  color: var(--vp-marque);
}

.erreur {
  color: var(--vp-statut-requalification-en-retard);
  margin: 0;
}

.confirmation {
  color: var(--vp-marque);
  margin: 0;
}

.bloc-import {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.qualification {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  border-top: 1px solid var(--vp-bordure);
  padding-top: 0.5rem;
}

.qualification label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85em;
}

.case-periodicite {
  flex-direction: row !important;
  align-items: center;
  gap: 0.4rem !important;
}

.liste-relations {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.liste-relations li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem 0.75rem;
}

.chaine-technique {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-top: 1px solid var(--vp-bordure);
  padding-top: 0.75rem;
}

.chaine-technique label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.liste-chaine {
  padding-left: 1.25rem;
}
</style>

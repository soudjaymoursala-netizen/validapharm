<script setup lang="ts">
// Structure Système — référentiel d'actifs (FS §4.10, URS-F-100 à
// 100decies). Premier incrément : hiérarchie configurable + CRUD de
// nœuds avec absence de cycle et unicité du code. Hors périmètre :
// graphe `associated_nodes[]`, pull QMS, dossier vivant, suivi de
// périodicité, liaison projet↔nœud (backlog, voir tâche de suivi).
import { computed, onMounted, reactive, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import {
  useStructureSystemeStore,
  type ResultatActionNoeud,
} from '../stores/useStructureSystemeStore'
import type { AssetNode } from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()

const nomClient = ref<string | null>(null)
const brouillonNiveau = reactive({ key: '', libelleFr: '', numbering_pattern: '' })
const brouillonNoeud = reactive({ level_key: '', name: '', code: '', parent_id: '' })
const resultatCreation = ref<ResultatActionNoeud | undefined>(undefined)
const reparentageEnErreur = reactive<Record<string, string>>({})

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
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
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
        </li>
      </ul>
      <p v-if="noeudsAffiches.length === 0" class="etat-vide">Aucun nœud pour l'instant.</p>
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
  color: white;
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

.erreur {
  color: var(--vp-statut-requalification-en-retard);
  margin: 0;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

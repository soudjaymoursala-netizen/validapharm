<script setup lang="ts">
// Suivi de périodicité (tâche #31/#117) — tableau agrégé, tous nœuds
// confondus d'un client, des actifs soumis à requalification périodique.
// Comble un vrai manque trouvé en lisant `StructureSysteme.vue` : le seul
// signal existant (`echeanceDepassee`) est un badge par ligne, noyé dans une
// liste de tous les nœuds (qualifiés ou non, périodiques ou non) — rien
// n'agrégeait "quels actifs arrivent à échéance" pour ce client. Lecture
// seule : l'édition du statut/de l'échéance reste sur `StructureSysteme.vue`
// (édition manuelle uniquement, jamais de transition automatique fabriquée
// par l'outil — voir `useStructureSystemeStore.modifierQualificationNoeud`).
import { computed, onMounted, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { AssetNode } from '../../logique-metier/domaine/types'
import {
  comparerPourAffichage,
  evaluerPeriodicite,
  type StatutPeriodicite,
} from '../../logique-metier/structure-systeme/statutPeriodicite'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const structureStore = useStructureSystemeStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await structureStore.charger(props.clientId)
})

const LIBELLES_STATUT_PERIODICITE: Record<StatutPeriodicite, string> = {
  non_applicable: 'Non applicable',
  echeance_non_renseignee: 'Échéance non renseignée',
  en_retard: 'En retard',
  proche_echeance: 'Échéance proche',
  a_jour: 'À jour',
}

interface LigneSuivi {
  noeud: AssetNode
  statut: StatutPeriodicite
  joursRestants: number | null
}

const aujourdHui = computed(() => new Date().toISOString().slice(0, 10))

const lignes = computed<LigneSuivi[]>(() => {
  return structureStore.noeuds
    .filter((noeud) => noeud.periodic_qualification.applicable)
    .map((noeud) => {
      const evaluation = evaluerPeriodicite(noeud.periodic_qualification, aujourdHui.value)
      return { noeud, statut: evaluation.statut, joursRestants: evaluation.joursRestants }
    })
    .sort((a, b) => comparerPourAffichage(a, b))
})

const compteurs = computed(() => {
  const total: Record<StatutPeriodicite, number> = {
    non_applicable: 0,
    echeance_non_renseignee: 0,
    en_retard: 0,
    proche_echeance: 0,
    a_jour: 0,
  }
  for (const ligne of lignes.value) total[ligne.statut] += 1
  return total
})

function texteEcheance(ligne: LigneSuivi): string {
  const deadline = ligne.noeud.periodic_qualification.deadline
  if (!deadline || ligne.joursRestants === null) return 'Échéance non renseignée'
  if (ligne.joursRestants < 0) {
    return `${deadline} — en retard de ${Math.abs(ligne.joursRestants)} jour(s)`
  }
  return `${deadline} — dans ${ligne.joursRestants} jour(s)`
}
</script>

<template>
  <main class="suivi-periodicite">
    <RouterLink
      :to="{ name: 'structure-systeme', params: { clientId: props.clientId } }"
      class="lien-retour"
    >
      Structure Système
    </RouterLink>
    <h1>Suivi de périodicité — {{ nomClient ?? props.clientId }}</h1>
    <p class="rappel">
      Actifs soumis à requalification périodique pour ce client, triés par urgence. Écran de lecture
      seule — modifiez le statut ou l'échéance depuis Structure Système.
    </p>

    <ul class="compteurs">
      <li class="compteur compteur--en-retard">
        <strong>{{ compteurs.en_retard }}</strong> en retard
      </li>
      <li class="compteur compteur--proche-echeance">
        <strong>{{ compteurs.proche_echeance }}</strong> à échéance proche (≤ 90 j)
      </li>
      <li class="compteur compteur--non-renseignee">
        <strong>{{ compteurs.echeance_non_renseignee }}</strong> sans échéance renseignée
      </li>
      <li class="compteur compteur--a-jour">
        <strong>{{ compteurs.a_jour }}</strong> à jour
      </li>
    </ul>

    <ul v-if="lignes.length > 0" class="liste-suivi">
      <li v-for="ligne in lignes" :key="ligne.noeud.id" class="ligne-suivi">
        <div class="ligne-suivi__entete">
          <strong>{{ ligne.noeud.name }}</strong>
          <span class="meta">({{ ligne.noeud.code }}, {{ ligne.noeud.level_key }})</span>
          <span class="badge" :class="`badge--${ligne.statut}`">
            {{ LIBELLES_STATUT_PERIODICITE[ligne.statut] }}
          </span>
        </div>
        <p class="ligne-suivi__echeance">{{ texteEcheance(ligne) }}</p>
        <RouterLink
          :to="{
            name: 'dossier-vivant-actif',
            params: { clientId: props.clientId, noeudId: ligne.noeud.id },
          }"
          class="lien-dossier-vivant"
        >
          Dossier vivant
        </RouterLink>
      </li>
    </ul>
    <p v-else class="etat-vide">
      Aucun actif n'est soumis à requalification périodique pour ce client pour l'instant — activez
      « Requalification périodique » sur un nœud depuis Structure Système.
    </p>
  </main>
</template>

<style scoped>
.suivi-periodicite {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 40rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
  margin: 0;
}

.compteurs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.compteur {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.compteur strong {
  color: var(--vp-texte-principal);
  font-weight: var(--vp-poids-semibold);
}

.compteur--en-retard {
  background-color: var(--vp-danger-fond-leger);
  border-color: var(--vp-danger);
}

.compteur--proche-echeance {
  background-color: var(--vp-attention-fond-leger);
  border-color: var(--vp-attention);
}

.compteur--a-jour {
  background-color: var(--vp-succes-fond-leger);
  border-color: var(--vp-succes);
}

.liste-suivi {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ligne-suivi {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ligne-suivi__entete {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.ligne-suivi__echeance {
  margin: 0;
  font-size: 0.9em;
}

.badge {
  font-size: 0.78rem;
  font-weight: var(--vp-poids-semibold);
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}

.badge--en_retard {
  color: var(--vp-danger);
  background-color: var(--vp-danger-fond-leger);
}

.badge--proche_echeance {
  color: var(--vp-attention);
  background-color: var(--vp-attention-fond-leger);
}

.badge--echeance_non_renseignee {
  color: var(--vp-texte-secondaire);
  background-color: var(--vp-fond-page);
}

.badge--a_jour {
  color: var(--vp-succes);
  background-color: var(--vp-succes-fond-leger);
}

.lien-dossier-vivant {
  align-self: flex-start;
  font-size: 0.85em;
  color: var(--vp-marque);
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

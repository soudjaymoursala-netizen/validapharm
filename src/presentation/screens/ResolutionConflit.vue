<script setup lang="ts">
// Écran de résolution de conflit (FDS §3.6) — présente, pour chaque
// enregistrement en conflit détecté par `analyserConflit()`, les champs
// dont la valeur diverge réellement entre la copie locale et la copie
// distante, et impose un choix explicite par champ (garder local / garder
// distant / fusionner manuellement) avant de pouvoir confirmer. Aucun choix
// par défaut silencieux : le bouton de confirmation reste désactivé tant
// qu'un champ divergent n'a pas de décision.
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import type { ChoixResolutionChamp } from '../../logique-metier/resolution-conflit/diffChamps'
import {
  useSynchronisationStore,
  type ConflitEnregistrement,
} from '../stores/useSynchronisationStore'

type ChoixChamp = 'locale' | 'distante' | 'manuelle'

interface DecisionChamp {
  choix: ChoixChamp
  valeurManuelle: string
}

const router = useRouter()
const syncStore = useSynchronisationStore()

// `shallowRef` délibéré : chaque conflit est un instantané immuable renvoyé
// par `analyserConflit()`. Un `ref` profond envelopperait ses tableaux
// imbriqués (`links`, `audit_log`…) dans des Proxy réactifs, que
// `structuredClone` (utilisé par IndexedDB) ne sait pas sérialiser —
// `DataCloneError` au moment d'écrire l'enregistrement fusionné.
const conflits = shallowRef<ConflitEnregistrement[]>([])
const enChargement = ref(true)
const enConfirmation = ref(false)
const messageEtat = ref<string | null>(null)

// Une entrée par conflit, indexée par champ divergent -> décision en cours.
const decisions = reactive(new Map<string, Record<string, DecisionChamp>>())

function cleConflit(conflit: ConflitEnregistrement): string {
  return `${conflit.type}:${conflit.id}`
}

onMounted(async () => {
  await chargerConflits()
})

async function chargerConflits(): Promise<void> {
  enChargement.value = true
  conflits.value = await syncStore.analyserConflit()
  decisions.clear()
  for (const conflit of conflits.value) {
    const parChamp: Record<string, DecisionChamp> = {}
    for (const divergence of conflit.divergences) {
      parChamp[divergence.champ] = { choix: 'distante', valeurManuelle: '' }
    }
    decisions.set(cleConflit(conflit), parChamp)
  }
  enChargement.value = false
}

const toutesDecisionsPrises = computed(() =>
  conflits.value.every((conflit) => {
    const parChamp = decisions.get(cleConflit(conflit))
    if (parChamp === undefined) return false
    return conflit.divergences.every((d) => {
      const decision = parChamp[d.champ]
      if (decision === undefined) return false
      return decision.choix !== 'manuelle' || decision.valeurManuelle.trim().length > 0
    })
  }),
)

function formaterValeur(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return '(vide)'
  if (typeof valeur === 'string') return valeur.trim().length === 0 ? '(chaîne vide)' : valeur
  return JSON.stringify(valeur)
}

async function confirmer(): Promise<void> {
  enConfirmation.value = true
  messageEtat.value = null
  try {
    const resolutions = conflits.value.map((conflit) => {
      const parChamp = decisions.get(cleConflit(conflit))
      const choix: ChoixResolutionChamp[] = conflit.divergences.map((d) => {
        const decision = parChamp?.[d.champ]
        if (decision?.choix === 'manuelle') {
          return { champ: d.champ, choix: 'manuelle', valeur: decision.valeurManuelle }
        }
        if (decision?.choix === 'locale') {
          return { champ: d.champ, choix: 'locale' }
        }
        return { champ: d.champ, choix: 'distante' }
      })
      return { conflit, choix }
    })

    const resultat = await syncStore.confirmerResolutionConflits(resolutions)
    if (resultat.ok) {
      messageEtat.value = `Résolution appliquée et synchronisée (${resultat.nbFichiers} fichier(s)).`
      await router.push({ name: 'tableau-de-bord' })
      return
    }
    if ('conflit' in resultat && resultat.conflit) {
      messageEtat.value =
        'La branche distante a de nouveau changé pendant la résolution — relancez la résolution.'
      await chargerConflits()
      return
    }
    messageEtat.value = 'message' in resultat ? resultat.message : 'Erreur.'
  } finally {
    enConfirmation.value = false
  }
}
</script>

<template>
  <main class="resolution-conflit">
    <header>
      <h1>Résolution de conflit</h1>
      <RouterLink :to="{ name: 'tableau-de-bord' }">Retour au tableau de bord</RouterLink>
    </header>

    <p v-if="enChargement">Analyse des conflits…</p>

    <p v-else-if="conflits.length === 0" class="etat-vide">
      Aucun conflit de contenu détecté entre l'état local et l'état distant.
    </p>

    <template v-else>
      <p class="explication">
        Les enregistrements suivants ont été modifiés à la fois localement et sur GitHub depuis la
        dernière synchronisation. Pour chaque champ divergent, choisissez la version à conserver ou
        saisissez une valeur fusionnée manuellement.
      </p>

      <section
        v-for="conflit in conflits"
        :key="cleConflit(conflit)"
        class="conflit"
        :aria-label="`Conflit sur ${conflit.type} ${conflit.id}`"
      >
        <h2>{{ conflit.type === 'project' ? 'Projet' : 'Section' }} — {{ conflit.id }}</h2>

        <div v-for="divergence in conflit.divergences" :key="divergence.champ" class="champ">
          <p class="nom-champ">{{ divergence.champ }}</p>
          <div
            class="options"
            role="radiogroup"
            :aria-label="`Résolution du champ ${divergence.champ}`"
          >
            <label>
              <input
                type="radio"
                :name="`${cleConflit(conflit)}:${divergence.champ}`"
                :checked="
                  decisions.get(cleConflit(conflit))?.[divergence.champ]?.choix === 'locale'
                "
                @change="
                  () => {
                    const parChamp = decisions.get(cleConflit(conflit))
                    if (parChamp)
                      parChamp[divergence.champ] = { choix: 'locale', valeurManuelle: '' }
                  }
                "
              />
              Garder local — {{ formaterValeur(divergence.valeurLocale) }}
            </label>
            <label>
              <input
                type="radio"
                :name="`${cleConflit(conflit)}:${divergence.champ}`"
                :checked="
                  decisions.get(cleConflit(conflit))?.[divergence.champ]?.choix === 'distante'
                "
                @change="
                  () => {
                    const parChamp = decisions.get(cleConflit(conflit))
                    if (parChamp)
                      parChamp[divergence.champ] = { choix: 'distante', valeurManuelle: '' }
                  }
                "
              />
              Garder distant — {{ formaterValeur(divergence.valeurDistante) }}
            </label>
            <label>
              <input
                type="radio"
                :name="`${cleConflit(conflit)}:${divergence.champ}`"
                :checked="
                  decisions.get(cleConflit(conflit))?.[divergence.champ]?.choix === 'manuelle'
                "
                @change="
                  () => {
                    const parChamp = decisions.get(cleConflit(conflit))
                    const precedente = parChamp?.[divergence.champ]
                    if (parChamp)
                      parChamp[divergence.champ] = {
                        choix: 'manuelle',
                        valeurManuelle: precedente?.valeurManuelle ?? '',
                      }
                  }
                "
              />
              Fusionner manuellement
              <input
                v-if="decisions.get(cleConflit(conflit))?.[divergence.champ]?.choix === 'manuelle'"
                type="text"
                :value="decisions.get(cleConflit(conflit))?.[divergence.champ]?.valeurManuelle"
                @input="
                  (evenement: Event) => {
                    const parChamp = decisions.get(cleConflit(conflit))
                    const decision = parChamp?.[divergence.champ]
                    if (decision)
                      decision.valeurManuelle = (evenement.target as HTMLInputElement).value
                  }
                "
              />
            </label>
          </div>
        </div>
      </section>

      <div class="actions">
        <button
          type="button"
          :disabled="!toutesDecisionsPrises || enConfirmation"
          @click="confirmer"
        >
          {{ enConfirmation ? 'Confirmation…' : 'Confirmer la résolution et synchroniser' }}
        </button>
      </div>
    </template>

    <p v-if="messageEtat" role="alert" class="message-etat">{{ messageEtat }}</p>
  </main>
</template>

<style scoped>
.resolution-conflit {
  padding: 2rem;
  font-family: var(--vp-police);
  max-width: 48rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.explication {
  color: var(--vp-texte-secondaire);
  margin-bottom: 1.5rem;
}

.conflit {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.champ {
  margin-top: 1rem;
}

.nom-champ {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.actions {
  margin-top: 1.5rem;
}

button {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color var(--vp-transition);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: var(--vp-marque-survol);
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.message-etat {
  margin-top: 1rem;
  color: var(--vp-statut-requalification-en-retard);
}
</style>

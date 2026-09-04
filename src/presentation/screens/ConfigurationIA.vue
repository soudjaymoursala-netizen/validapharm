<script setup lang="ts">
// Configuration IA par client (FS §4.4, `client_config`) — choix du
// fournisseur, accusé des conditions de traitement des données
// (URS-F-032ter) et qualification de fiabilité (URS-F-032quater/quinquies).
// Isolé par client_id, comme la config Drive ; le relais lui-même
// (URL/jeton) est global à l'installation et se configure sur l'écran
// Configuration (voir ConfigurationClient.vue).
//
// Le modèle local (Ollama) ne quitte jamais le poste de l'utilisateur :
// les gardes URS-F-032ter/quater (conditions de traitement des données,
// qualification de fiabilité) ne visent explicitement que les
// « fournisseurs cloud » (texte URS-F-032ter/quater) — ce garde-fou n'a
// donc pas de sens à lui appliquer et il est délibérément exempté ici.
import { computed, onMounted, reactive, ref } from 'vue'
import { messageSysteme } from '../i18n/messages'
import type { ModeUsageIA } from '../../connecteurs/ia/ProviderAdapter'
import {
  conditionsTraitementAcquittees,
  peutActiverFournisseur,
} from '../../logique-metier/routeur-ia/qualificationFiabilite'
import { useClientsStore } from '../stores/useClientsStore'
import { useClientConfigStore } from '../stores/useClientConfigStore'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const configStore = useClientConfigStore()

const nomClient = ref<string | null>(null)

const FOURNISSEURS_CLOUD = [
  { id: 'claude', nom: 'Claude' },
  { id: 'openai', nom: 'OpenAI' },
  { id: 'copilot', nom: 'Copilot' },
  { id: 'deepseek', nom: 'DeepSeek' },
] as const
const FOURNISSEUR_LOCAL = { id: 'local', nom: 'Modèle local (Ollama)' } as const

/**
 * Qualification de fiabilité séparée par mode d'usage (URS-F-038bis,
 * Phase 32) — chat normatif et audit simulé n'ont pas le même profil de
 * risque, jamais une qualification unique réputée valable pour les deux.
 */
const MODES_USAGE: ReadonlyArray<{ id: ModeUsageIA; nom: string }> = [
  { id: 'chat_normatif', nom: 'Chat normatif' },
  { id: 'audit_simule', nom: 'Audit simulé' },
]

const fournisseurChoisi = ref<string>('claude')
const modeQualificationChoisi = ref<ModeUsageIA>('chat_normatif')

const qualificationBrouillon = reactive({
  date: new Date().toISOString().slice(0, 10),
  resultat: '',
  qualification_test_set_id: '',
  qualification_test_set_version: '',
  moteur_version_qualifiee: '',
})

const estFournisseurCloud = computed(() => fournisseurChoisi.value !== FOURNISSEUR_LOCAL.id)

const conditionsAcquittees = computed(() =>
  conditionsTraitementAcquittees(
    configStore.config?.ai_provider_conditions_acquittees ?? null,
    fournisseurChoisi.value,
  ),
)

const qualificationModeChoisi = computed(
  () =>
    configStore.config?.ai_provider_reliability_qualification[modeQualificationChoisi.value] ??
    null,
)

const peutActiverUsageReel = computed(() => peutActiverFournisseur(qualificationModeChoisi.value))

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null

  await configStore.charger(props.clientId)
  if (configStore.config) {
    fournisseurChoisi.value = configStore.config.ai_provider
  }
})

async function changerFournisseur(): Promise<void> {
  await configStore.definirFournisseur(props.clientId, fournisseurChoisi.value)
}

async function acquitterConditions(): Promise<void> {
  await configStore.acquitterConditions(props.clientId, fournisseurChoisi.value)
}

async function enregistrerQualification(): Promise<void> {
  await configStore.enregistrerQualification(props.clientId, modeQualificationChoisi.value, {
    ...qualificationBrouillon,
    moteur_version_qualifiee: qualificationBrouillon.moteur_version_qualifiee.trim() || null,
  })
}
</script>

<template>
  <main class="configuration-ia">
    <RouterLink :to="{ name: 'gestion-clients' }" class="lien-retour">Clients</RouterLink>
    <h1>Configuration IA — {{ nomClient ?? props.clientId }}</h1>

    <section class="bloc-fournisseur">
      <h2>Fournisseur</h2>
      <p class="rappel">
        Le chat expert n'a jamais accès par défaut au contenu des livrables ; l'accès à un document
        précis reste une action explicite lors de l'envoi d'une question.
      </p>

      <form class="formulaire" @submit.prevent="changerFournisseur">
        <fieldset>
          <label v-for="fournisseur in FOURNISSEURS_CLOUD" :key="fournisseur.id">
            <input v-model="fournisseurChoisi" type="radio" :value="fournisseur.id" />
            {{ fournisseur.nom }}
          </label>
          <label>
            <input v-model="fournisseurChoisi" type="radio" :value="FOURNISSEUR_LOCAL.id" />
            {{ FOURNISSEUR_LOCAL.nom }}
          </label>
        </fieldset>
        <p v-if="fournisseurChoisi !== configStore.config?.ai_provider" class="avertissement">
          Changer de fournisseur réinitialise l'accusé des conditions de traitement des données et
          la qualification de fiabilité déjà enregistrés (propres à l'ancien fournisseur).
        </p>
        <div class="actions">
          <button type="submit">Changer de fournisseur</button>
        </div>
      </form>
    </section>

    <template v-if="estFournisseurCloud">
      <section class="bloc-conditions">
        <h2>Conditions de traitement des données</h2>
        <p class="rappel">
          Les conditions de rétention, d'entraînement sur les données et de localisation diffèrent
          selon le fournisseur — à vérifier vous-même avant d'acquitter.
        </p>
        <p v-if="conditionsAcquittees" class="etat-favorable">
          Conditions acquittées pour « {{ fournisseurChoisi }} » le
          {{
            new Date(configStore.config!.ai_provider_conditions_acquittees!.date).toLocaleString()
          }}.
        </p>
        <button v-else type="button" @click="acquitterConditions">
          J'ai vérifié et j'accepte les conditions de traitement des données de «
          {{ fournisseurChoisi }} »
        </button>
      </section>

      <section class="bloc-qualification">
        <h2>Qualification de fiabilité (URS-F-032quater/quinquies)</h2>
        <p class="rappel">
          Une qualification distincte est requise pour chaque mode d'usage (URS-F-038bis) — le chat
          normatif et le mode audit simulé n'ont pas le même profil de risque.
        </p>
        <fieldset>
          <label v-for="m in MODES_USAGE" :key="m.id">
            <input v-model="modeQualificationChoisi" type="radio" :value="m.id" />
            {{ m.nom }}
          </label>
        </fieldset>
        <p v-if="!peutActiverUsageReel" class="avertissement" role="alert">
          {{ messageSysteme('U-05', 'fr') }}
        </p>
        <p v-else class="etat-favorable">
          Qualifié le {{ qualificationModeChoisi!.date }} — résultat :
          {{ qualificationModeChoisi!.resultat }}
          <template v-if="qualificationModeChoisi!.moteur_version_qualifiee">
            (version moteur {{ qualificationModeChoisi!.moteur_version_qualifiee }})
          </template>
        </p>

        <form class="formulaire" @submit.prevent="enregistrerQualification">
          <label>
            Date
            <input v-model="qualificationBrouillon.date" type="date" required />
          </label>
          <label>
            Résultat
            <input
              v-model="qualificationBrouillon.resultat"
              type="text"
              required
              placeholder="ex. favorable"
            />
          </label>
          <label>
            Identifiant de l'échantillon de qualification
            <input
              v-model="qualificationBrouillon.qualification_test_set_id"
              type="text"
              required
              placeholder="ex. echantillon-pharma-fr-v1"
            />
          </label>
          <label>
            Version de l'échantillon
            <input
              v-model="qualificationBrouillon.qualification_test_set_version"
              type="text"
              required
              placeholder="ex. 1.0.0"
            />
          </label>
          <label>
            Version de moteur qualifiée (si exposée par le fournisseur)
            <input
              v-model="qualificationBrouillon.moteur_version_qualifiee"
              type="text"
              placeholder="ex. claude-sonnet-5"
            />
          </label>
          <div class="actions">
            <button type="submit">Enregistrer la qualification</button>
          </div>
        </form>
      </section>
    </template>

    <p v-else class="rappel">
      Le modèle local ne transmet aucune donnée à un tiers : ni accusé de conditions de traitement,
      ni qualification de fiabilité cloud ne s'appliquent (URS-F-032ter/quater).
    </p>
  </main>
</template>

<style scoped>
.configuration-ia {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 32rem;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
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

fieldset {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
}

fieldset label {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

input[type='text'],
input[type='date'] {
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
  align-self: flex-start;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.avertissement {
  color: var(--vp-statut-requalification-en-retard);
}

.etat-favorable {
  color: var(--vp-statut-qualifie);
}
</style>

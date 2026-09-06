<script setup lang="ts">
// Garde d'archivage (§4.31) — double confirmation délibérément
// demandée pour se protéger d'une suppression accidentelle : (1) retaper
// le nom exact du client/projet (pattern GitHub "type the repo name to
// confirm"), (2) re-saisir le **vrai** mot de passe de connexion.
//
// Décision explicite de l'utilisateur (« Remplacer par
// la vraie session ») : le verrou local (mot de passe vérifié
// uniquement côté navigateur) est retiré, remplacé par une
// ré-authentification serveur (`useAuthStore.verifierMotDePasse`,
// `POST /auth/verify-password`) — un seul système d'identité désormais,
// jamais deux mécanismes de mot de passe parallèles.
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'

const props = withDefaults(
  defineProps<{
    nom: string
    titre?: string
    message?: string
    libelleBouton?: string
  }>(),
  {
    titre: "Confirmer l'archivage",
    message:
      "Cette action archive « {nom} » — les données ne sont jamais supprimées, l'élément reste restaurable depuis les archives.",
    libelleBouton: 'Archiver',
  },
)
const emit = defineEmits<{ confirme: [identiteDeclaree: string]; annule: [] }>()

const messageAffiche = computed(() => props.message.replace('{nom}', props.nom))

const authStore = useAuthStore()
const nomSaisi = ref('')
const motDePasseSaisi = ref('')
const erreur = ref<string | null>(null)
const verificationEnCours = ref(false)

async function confirmer(): Promise<void> {
  erreur.value = null
  if (nomSaisi.value.trim() !== props.nom.trim()) {
    erreur.value = 'Le nom saisi ne correspond pas.'
    return
  }
  verificationEnCours.value = true
  try {
    const motDePasseValide = await authStore.verifierMotDePasse(motDePasseSaisi.value)
    if (!motDePasseValide) {
      erreur.value = 'Mot de passe incorrect.'
      return
    }
  } finally {
    verificationEnCours.value = false
  }
  const utilisateur = authStore.utilisateur
  emit(
    'confirme',
    utilisateur ? `${utilisateur.prenom} ${utilisateur.nom} (${utilisateur.email})` : 'inconnu',
  )
}
</script>

<template>
  <div class="fond-modale" role="dialog" aria-modal="true">
    <div class="modale">
      <h2>{{ titre }}</h2>

      <p>{{ messageAffiche }}</p>
      <form class="formulaire" @submit.prevent="confirmer">
        <label>
          Retapez le nom pour confirmer
          <input v-model="nomSaisi" type="text" required autofocus />
        </label>
        <label>
          Votre mot de passe
          <input
            v-model="motDePasseSaisi"
            type="password"
            required
            autocomplete="current-password"
          />
        </label>
        <p v-if="erreur" class="bandeau-erreur" role="alert">{{ erreur }}</p>
        <div class="actions">
          <button type="button" @click="emit('annule')">Annuler</button>
          <button type="submit" class="bouton-danger" :disabled="verificationEnCours">
            {{ verificationEnCours ? 'Vérification…' : libelleBouton }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.fond-modale {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modale {
  background: var(--vp-fond-carte, white);
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-width: 26rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.bandeau-erreur {
  color: var(--vp-danger);
}

.bouton-danger {
  background-color: var(--vp-danger);
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
}

button {
  cursor: pointer;
}
</style>

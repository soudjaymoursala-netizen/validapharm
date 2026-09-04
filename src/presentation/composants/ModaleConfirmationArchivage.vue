<script setup lang="ts">
// Garde d'archivage (§4.31) — double confirmation délibérément
// demandée pour se protéger d'une suppression accidentelle : (1) retaper
// le nom exact du client/projet (pattern GitHub "type the repo name to
// confirm"), (2) re-saisir le **vrai** mot de passe de connexion.
//
// TD-046 (Phase 39, décision explicite de l'utilisateur — « Remplacer par
// la vraie session ») : le verrou local (TD-033, mot de passe vérifié
// uniquement côté navigateur) est retiré, remplacé par une
// ré-authentification serveur (`useAuthStore.verifierMotDePasse`,
// `POST /auth/verify-password`) — un seul système d'identité désormais,
// jamais deux mécanismes de mot de passe parallèles.
import { ref } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'

const props = defineProps<{ nom: string }>()
const emit = defineEmits<{ confirme: [identiteDeclaree: string]; annule: [] }>()

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
      <h2>Confirmer l'archivage</h2>

      <p>
        Cette action archive <strong>« {{ nom }} »</strong> — les données ne sont jamais supprimées,
        l'élément reste restaurable depuis les archives.
      </p>
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
            {{ verificationEnCours ? 'Vérification…' : 'Archiver' }}
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

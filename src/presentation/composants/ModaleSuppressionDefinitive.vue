<script setup lang="ts">
// Suppression DÉFINITIVE (TD-046, Phase 39) — jamais pour un rôle
// non-admin (vérifié côté serveur, `DELETE /clients/:id`), jamais sans
// justification, jamais sans re-saisie du vrai mot de passe. Contrairement
// à `ModaleConfirmationArchivage.vue` (réversible), cette action est
// irréversible côté serveur — triple garde volontairement plus stricte :
// (1) retaper le nom, (2) justification obligatoire non vide, (3) mot de
// passe re-vérifié.
import { ref } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'

const props = defineProps<{ nom: string }>()
const emit = defineEmits<{ confirme: [justification: string]; annule: [] }>()

const authStore = useAuthStore()
const nomSaisi = ref('')
const justification = ref('')
const motDePasseSaisi = ref('')
const erreur = ref<string | null>(null)
const verificationEnCours = ref(false)

async function confirmer(): Promise<void> {
  erreur.value = null
  if (nomSaisi.value.trim() !== props.nom.trim()) {
    erreur.value = 'Le nom saisi ne correspond pas.'
    return
  }
  if (justification.value.trim().length === 0) {
    erreur.value = 'La justification est obligatoire pour une suppression définitive.'
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
  emit('confirme', justification.value.trim())
}
</script>

<template>
  <div class="fond-modale" role="dialog" aria-modal="true">
    <div class="modale">
      <h2>Suppression définitive</h2>
      <p class="bandeau-erreur" role="alert">
        Action <strong>irréversible</strong> — « {{ nom }} » et toutes ses données seront
        définitivement supprimés, jamais restaurables. Tracée dans le journal d'audit (qui vous a
        supprimé quoi, quand, pourquoi).
      </p>
      <form class="formulaire" @submit.prevent="confirmer">
        <label>
          Retapez le nom pour confirmer
          <input v-model="nomSaisi" type="text" required autofocus />
        </label>
        <label>
          Justification (obligatoire)
          <textarea
            v-model="justification"
            required
            rows="2"
            placeholder="ex. Client fermé, demande écrite du 04/09/2026"
          />
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
            {{ verificationEnCours ? 'Vérification…' : 'Supprimer définitivement' }}
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

input,
textarea {
  padding: 0.4rem;
  border: 1px solid var(--vp-bordure, #ccc);
  border-radius: 0.25rem;
  font-family: inherit;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.bandeau-erreur {
  color: var(--vp-couleur-erreur, #b00020);
}

.bouton-danger {
  background-color: var(--vp-couleur-erreur, #b00020);
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
}

button {
  cursor: pointer;
}
</style>

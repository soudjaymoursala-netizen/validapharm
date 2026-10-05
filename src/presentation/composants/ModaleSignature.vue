<script setup lang="ts">
/**
 * Signature d'un geste d'approbation ou de clôture (décision utilisateur du
 * 26/09/2026) : ressaisie du mot de passe, vérifiée par le serveur au moment
 * même de l'action — jamais seulement dans le navigateur. Le parent envoie
 * l'action avec le mot de passe et renvoie un éventuel refus dans `erreur`.
 */
import { ref } from 'vue'
import { usePiegeFocus } from '../composables/usePiegeFocus'

const props = defineProps<{
  titre: string
  /** Ce que la signature engage, affiché avant la saisie (signification). */
  signification: string
  libelleBouton: string
  /** Avertissement supplémentaire (ex. incohérence de verdict). */
  avertissement?: string | null
  erreur?: string | null
  enCours?: boolean
}>()
const emit = defineEmits<{ confirme: [motDePasse: string]; annule: [] }>()

const motDePasse = ref('')
const fenetre = ref<HTMLElement | null>(null)

// Focus sur le mot de passe, Tab gardé dans la fenêtre, Échap ferme où que
// soit le focus (il peut l'avoir quittée quand le bouton se désactive
// pendant la vérification), retour au déclencheur à la fermeture.
usePiegeFocus(fenetre, () => emit('annule'))

function confirmer(): void {
  if (motDePasse.value.length === 0 || props.enCours) return
  emit('confirme', motDePasse.value)
}
</script>

<template>
  <div class="fond-modale">
    <div
      ref="fenetre"
      class="modale"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titre-signature"
    >
      <h2 id="titre-signature">{{ titre }}</h2>
      <p class="signification">{{ signification }}</p>
      <p v-if="avertissement" class="avertissement" role="alert">{{ avertissement }}</p>
      <form class="formulaire" @submit.prevent="confirmer">
        <label>
          Votre mot de passe (signature)
          <input v-model="motDePasse" type="password" required autocomplete="current-password" />
        </label>
        <p v-if="erreur" class="erreur" role="alert">{{ erreur }}</p>
        <div class="actions">
          <button type="button" @click="emit('annule')">Annuler</button>
          <button type="submit" :disabled="enCours || motDePasse.length === 0">
            {{ enCours ? 'Vérification…' : libelleBouton }}
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
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modale {
  background: var(--vp-fond-carte);
  color: var(--vp-texte-principal);
  border-radius: var(--vp-rayon);
  box-shadow: var(--vp-ombre-lg);
  padding: 1.5rem;
  max-width: 28rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

h2 {
  margin: 0;
  font-size: 1.15rem;
}

.signification {
  margin: 0;
  color: var(--vp-texte-secondaire);
}

.avertissement {
  margin: 0;
  padding: 0.6rem 0.75rem;
  border-radius: var(--vp-rayon-sm);
  background: var(--vp-attention-fond-leger);
  color: var(--vp-texte-principal);
  border-left: 3px solid var(--vp-attention);
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.erreur {
  margin: 0;
  color: var(--vp-danger);
  font-weight: var(--vp-poids-semibold);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>

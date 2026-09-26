<script setup lang="ts">
// « Définir mon mot de passe » (décisions utilisateur du 26/09/2026) :
// page ouverte depuis un lien d'activation (nouveau compte) ou de
// réinitialisation. Le lien porte l'adresse du serveur qui l'a émis, pour
// fonctionner même sur un poste où l'application n'a jamais été
// configurée ; cette adresse est affichée avant toute saisie.
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AuthApiClient } from '../../connecteurs/auth/AuthApiClient'
import { useConnexionAuthentificationStore } from '../stores/useConnexionAuthentificationStore'

defineOptions({ name: 'EcranDefinirMotDePasse' })

const route = useRoute()
const connexionStore = useConnexionAuthentificationStore()

const jeton = computed(() => (typeof route.query.jeton === 'string' ? route.query.jeton : ''))
const estActivation = computed(() => route.query.type !== 'reinitialisation')
const serveurDuLien = computed(() =>
  typeof route.query.serveur === 'string' ? route.query.serveur.replace(/\/+$/, '') : '',
)
const serveur = computed(() => serveurDuLien.value || connexionStore.connexion?.relayUrl || '')
const hoteServeur = computed(() => {
  try {
    return new URL(serveur.value).host
  } catch {
    return ''
  }
})

const motDePasse = ref('')
const confirmation = ref('')
const enCours = ref(false)
const erreur = ref<string | null>(null)
const emailDefini = ref<string | null>(null)

onMounted(() => connexionStore.charger())

async function definir(): Promise<void> {
  erreur.value = null
  if (motDePasse.value.length < 8) {
    erreur.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }
  if (motDePasse.value !== confirmation.value) {
    erreur.value = 'Les deux saisies ne correspondent pas.'
    return
  }
  enCours.value = true
  try {
    const resultat = await new AuthApiClient(serveur.value).definirMotDePasse(
      jeton.value,
      motDePasse.value,
    )
    if (!resultat.ok) {
      erreur.value =
        resultat.erreur === 'lien_invalide'
          ? 'Ce lien n’est plus valable (déjà utilisé ou expiré). Demandez-en un nouveau à un administrateur ou via « Mot de passe oublié ».'
          : resultat.erreur === 'mot_de_passe_trop_court'
            ? 'Le mot de passe doit contenir au moins 8 caractères.'
            : 'Le mot de passe n’a pas pu être enregistré.'
      return
    }
    // Premier usage de l'application sur ce poste : mémoriser le serveur.
    if (!connexionStore.connexion?.relayUrl && serveur.value) {
      await connexionStore.enregistrer({ relayUrl: serveur.value })
    }
    emailDefini.value = resultat.donnees.email
  } catch {
    erreur.value = 'Serveur injoignable : réessayez dans un instant.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <main class="page-compte">
    <div class="carte">
      <h1>{{ estActivation ? 'Activer mon compte' : 'Nouveau mot de passe' }}</h1>
      <p v-if="!jeton || !serveur" class="erreur" role="alert">
        Ce lien est incomplet. Ouvrez le lien reçu par e-mail tel quel, ou demandez-en un nouveau.
      </p>
      <template v-else-if="emailDefini">
        <p role="status">
          Mot de passe enregistré pour {{ emailDefini }}. Vous pouvez maintenant vous connecter.
        </p>
        <RouterLink :to="{ name: 'connexion' }" class="lien-principal">Se connecter</RouterLink>
      </template>
      <form v-else class="formulaire" @submit.prevent="definir">
        <p>
          Choisissez votre mot de passe ValidaPharm (8 caractères minimum). Serveur :
          <strong>{{ hoteServeur }}</strong>
        </p>
        <label>
          Nouveau mot de passe
          <input
            v-model="motDePasse"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </label>
        <label>
          Confirmez le mot de passe
          <input
            v-model="confirmation"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </label>
        <p v-if="erreur" class="erreur" role="alert">{{ erreur }}</p>
        <button type="submit" :disabled="enCours">
          {{ enCours ? 'Enregistrement…' : 'Enregistrer mon mot de passe' }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.page-compte {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-principal);
  font-family: var(--vp-police);
}

.carte {
  width: 100%;
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  box-shadow: var(--vp-ombre-md);
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

p {
  margin: 0;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.erreur {
  color: var(--vp-danger);
  font-weight: var(--vp-poids-semibold);
}

.lien-principal {
  align-self: flex-start;
  padding: 0.55rem 1rem;
  border-radius: var(--vp-rayon-sm);
  background: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  text-decoration: none;
  font-weight: var(--vp-poids-semibold);
}
</style>

<script setup lang="ts">
// « Mot de passe oublié » (décision utilisateur du 26/09/2026) : demande
// d'un lien de réinitialisation par e-mail. La réponse est toujours la
// même, que l'adresse corresponde à un compte ou non — l'écran ne révèle
// jamais qui a un compte.
import { onMounted, ref } from 'vue'
import { AuthApiClient } from '../../connecteurs/auth/AuthApiClient'
import { useConnexionAuthentificationStore } from '../stores/useConnexionAuthentificationStore'

defineOptions({ name: 'EcranMotDePasseOublie' })

const connexionStore = useConnexionAuthentificationStore()
const email = ref('')
const enCours = ref(false)
const envoye = ref(false)
const erreur = ref<string | null>(null)

onMounted(() => connexionStore.charger())

async function demander(): Promise<void> {
  erreur.value = null
  const relayUrl = connexionStore.connexion?.relayUrl
  if (!relayUrl) {
    erreur.value =
      "Cet appareil ne connaît pas encore le serveur de l'application : demandez à un administrateur de vous envoyer un lien de réinitialisation."
    return
  }
  enCours.value = true
  try {
    const resultat = await new AuthApiClient(relayUrl).demanderReinitialisationMotDePasse(
      email.value.trim(),
    )
    if (resultat.ok) envoye.value = true
    else
      erreur.value =
        resultat.erreur === 'trop_de_tentatives'
          ? 'Trop de demandes pour cette adresse : réessayez dans 15 minutes.'
          : 'Adresse e-mail invalide.'
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
      <h1>Mot de passe oublié</h1>
      <template v-if="envoye">
        <p role="status">
          Si un compte actif correspond à {{ email }}, un e-mail vient de lui être envoyé avec un
          lien pour choisir un nouveau mot de passe (valable 2 heures). Pensez à vérifier les
          courriers indésirables.
        </p>
        <p>
          Rien reçu ? Un administrateur peut aussi vous envoyer ce lien depuis « Gestion des comptes
          ».
        </p>
      </template>
      <form v-else class="formulaire" @submit.prevent="demander">
        <p>
          Saisissez l'adresse e-mail de votre compte : vous recevrez un lien de réinitialisation.
        </p>
        <label>
          Email
          <input v-model="email" type="email" required autocomplete="username" />
        </label>
        <p v-if="erreur" class="erreur" role="alert">{{ erreur }}</p>
        <button type="submit" :disabled="enCours">
          {{ enCours ? 'Envoi…' : 'Recevoir un lien' }}
        </button>
      </form>
      <RouterLink :to="{ name: 'connexion' }">Retour à la connexion</RouterLink>
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
</style>

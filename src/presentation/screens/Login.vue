<script setup lang="ts">
// Écran de connexion — remplace le verrou local comme
// porte d'entrée de l'application entière : toute route, sauf celle-ci et
// « Configuration client » (Worker d'authentification à indiquer avant de
// pouvoir se connecter), exige une session valide — voir la garde
// `router.beforeEach` dans `router/index.ts`.
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { useConnexionAuthentificationStore } from '../stores/useConnexionAuthentificationStore'

defineOptions({ name: 'EcranConnexion' })
const authStore = useAuthStore()
const connexionStore = useConnexionAuthentificationStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const motDePasse = ref('')
const enCours = ref(false)
const erreur = ref<string | null>(null)

const LIBELLES_ERREUR: Record<string, string> = {
  identifiants_invalides: 'Email ou mot de passe incorrect.',
  trop_de_tentatives:
    'Trop de tentatives de connexion échouées : réessayez dans 15 minutes ou contactez un administrateur.',
  relais_non_configure:
    "Worker d'authentification non configuré — voir « Configuration client » ci-dessous.",
  erreur_inconnue: 'Une erreur inattendue est survenue.',
}

onMounted(async () => {
  await connexionStore.charger()
  // Une session déjà active (retour arrière du navigateur, onglet resté
  // ouvert après connexion) ne doit pas ré-afficher le formulaire — sans
  // ce garde, rien dans le routeur ne redirige un utilisateur déjà
  // connecté qui revient sur « /connexion » (route volontairement exclue
  // de la garde globale, voir `router/index.ts`).
  if (authStore.estConnecte) {
    const destination = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(destination)
  }
})

async function seConnecter(): Promise<void> {
  erreur.value = null
  enCours.value = true
  try {
    const resultat = await authStore.login(email.value.trim(), motDePasse.value)
    if (!resultat.ok) {
      erreur.value = LIBELLES_ERREUR[resultat.erreur] ?? LIBELLES_ERREUR.erreur_inconnue ?? null
      return
    }
    const destination = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(destination)
  } catch (e) {
    // Panne de connectivité réelle (Worker injoignable, délai dépassé,
    // 5xx, réponse illisible) — `authStore.login` lève dans ce cas plutôt
    // que de renvoyer `{ ok: false }` (voir `AuthApiClient`/`erreurs.ts`).
    // Sans ce `catch`, l'échec était totalement silencieux : le bouton se
    // réactivait sans aucun message, comme si rien ne s'était passé.
    erreur.value = e instanceof Error ? e.message : 'Une erreur inattendue est survenue.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <main class="connexion">
    <div class="carte">
      <div class="marque">
        <span class="logo" aria-hidden="true">VP</span>
        <span class="nom-produit">ValidaPharm</span>
      </div>
      <h1>Se connecter</h1>

      <p v-if="!connexionStore.connexion" class="bandeau-info" role="status">
        Aucun Worker d'authentification configuré sur cet appareil.
        <RouterLink :to="{ name: 'configuration-client' }">Configurer</RouterLink> avant de vous
        connecter.
      </p>

      <form class="formulaire" @submit.prevent="seConnecter">
        <label>
          Email
          <input v-model="email" type="email" required autocomplete="username" />
        </label>
        <label>
          Mot de passe
          <input v-model="motDePasse" type="password" required autocomplete="current-password" />
        </label>
        <p v-if="route.query.expiree === '1' && !erreur" class="bandeau-info" role="status">
          Votre session a expiré ou a été fermée (mot de passe changé, compte modifié) :
          reconnectez-vous pour continuer.
        </p>
        <p v-if="erreur" class="bandeau-erreur" role="alert">{{ erreur }}</p>
        <button type="submit" :disabled="enCours">
          {{ enCours ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <p class="rappel">
        Aucune inscription libre — un administrateur crée votre compte (« Gestion des comptes »).
      </p>
    </div>
  </main>
</template>

<style scoped>
.connexion {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--vp-fond-page);
  background-image: radial-gradient(
    circle at 50% -10%,
    var(--vp-marque-fond-leger),
    transparent 60%
  );
}

.carte {
  width: 100%;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2.25rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  background-color: var(--vp-fond-carte);
  box-shadow: var(--vp-ombre-lg);
}

.marque {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--vp-rayon-sm);
  background-color: var(--vp-marque);
  background-image: linear-gradient(160deg, var(--vp-marque), var(--vp-marque-survol));
  box-shadow: var(--vp-ombre-sm);
  color: var(--vp-marque-bouton-texte);
  font-size: 0.75rem;
  font-weight: var(--vp-poids-bold);
}

.nom-produit {
  font-family: var(--vp-police-affichage);
  font-weight: var(--vp-poids-semibold);
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  color: var(--vp-texte-principal);
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.formulaire label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.formulaire input {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-sm);
  padding: 0.6rem 0.75rem;
  font-family: inherit;
  color: var(--vp-texte-principal);
  background-color: var(--vp-fond-carte);
  transition: var(--vp-transition);
}

.formulaire input:focus-visible {
  outline: none;
  border-color: var(--vp-marque);
  box-shadow: 0 0 0 3px var(--vp-marque-fond-leger);
}

.formulaire button {
  margin-top: 0.4rem;
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon-sm);
  padding: 0.65rem;
  font-weight: var(--vp-poids-medium);
  cursor: pointer;
  transition: var(--vp-transition);
}

.formulaire button:hover:not(:disabled) {
  background-color: var(--vp-marque-survol);
}

.formulaire button:disabled {
  opacity: 0.6;
  cursor: default;
}

.bandeau-info {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: var(--vp-rayon-sm);
  background: var(--vp-info-fond-leger);
  color: var(--vp-texte-principal);
}

.bandeau-erreur {
  margin: 0;
  color: var(--vp-danger);
  font-size: 0.85rem;
}

.bandeau-info {
  margin: 0;
  padding: 0.6rem 0.75rem;
  border-radius: var(--vp-rayon-sm);
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-texte-principal);
  font-size: 0.82rem;
}

/* Sans classe, ce lien inline retombait sur le bleu par défaut du
   navigateur (#0000EE) — seul lien de l'app dans ce cas, tous les autres
   passent soit par `.lien-retour` (tokens.css), soit par une couleur de
   marque explicite. Peu lisible sur le fond sombre de `.bandeau-info`. */
.bandeau-info a {
  color: var(--vp-marque);
  font-weight: var(--vp-poids-medium);
  text-decoration: underline;
}

.bandeau-info a:hover {
  color: var(--vp-marque-survol);
}

.bandeau-info a:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--vp-marque-fond-leger);
  border-radius: 2px;
}

.rappel {
  margin: 0;
  color: var(--vp-texte-secondaire);
  font-size: 0.78rem;
  text-align: center;
}
</style>

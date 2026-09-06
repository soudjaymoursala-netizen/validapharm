<script setup lang="ts">
// Profil du compte réel (§2 du parcours utilisateur donné par
// l'utilisateur, 06/09/2026) — remplace `/profil-local` dans la navigation
// principale : `ProfilLocal.vue` restait l'écran du verrou de confirmation
// local d'avant l'authentification réelle (Phase 39), déjà remplacé par la
// vraie session pour l'archivage/la suppression définitive
// (`ModaleConfirmationArchivage.vue`/`ModaleSuppressionDefinitive.vue`,
// `authStore.verifierMotDePasse`). Cet écran expose enfin nom/prénom/rôle
// du compte réel et permet de les modifier et de changer le mot de passe
// réel — les deux endpoints (`/auth/me` PATCH, `/auth/change-password`)
// et le store (`useAuthStore.modifierProfil`/`changerMotDePasse`)
// existaient déjà, sans écran pour les consommer.
import { reactive, ref } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'

defineOptions({ name: 'EcranProfil' })
const authStore = useAuthStore()

const LIBELLES_ROLE: Record<'admin' | 'utilisateur', string> = {
  admin: 'Administrateur',
  utilisateur: 'Utilisateur',
}

const modeEditionIdentite = ref(false)
const brouillonIdentite = reactive({ nom: '', prenom: '' })
const enregistrementIdentiteEnCours = ref(false)
const erreurIdentite = ref<string | null>(null)
const confirmationIdentiteAffichee = ref(false)

function ouvrirEditionIdentite(): void {
  brouillonIdentite.nom = authStore.utilisateur?.nom ?? ''
  brouillonIdentite.prenom = authStore.utilisateur?.prenom ?? ''
  erreurIdentite.value = null
  modeEditionIdentite.value = true
}

async function enregistrerIdentite(): Promise<void> {
  if (brouillonIdentite.nom.trim().length === 0 || brouillonIdentite.prenom.trim().length === 0) {
    erreurIdentite.value = 'Le nom et le prénom sont obligatoires.'
    return
  }
  erreurIdentite.value = null
  enregistrementIdentiteEnCours.value = true
  try {
    const ok = await authStore.modifierProfil({
      nom: brouillonIdentite.nom.trim(),
      prenom: brouillonIdentite.prenom.trim(),
    })
    if (!ok) {
      erreurIdentite.value = "Échec de l'enregistrement — réessayez."
      return
    }
    modeEditionIdentite.value = false
    confirmationIdentiteAffichee.value = true
    setTimeout(() => (confirmationIdentiteAffichee.value = false), 3000)
  } finally {
    enregistrementIdentiteEnCours.value = false
  }
}

const motDePasseActuel = ref('')
const nouveauMotDePasse = ref('')
const confirmationNouveauMotDePasse = ref('')
const erreurMotDePasse = ref<string | null>(null)
const changementMotDePasseEnCours = ref(false)
const confirmationMotDePasseAffichee = ref(false)

async function changerMotDePasse(): Promise<void> {
  erreurMotDePasse.value = null
  if (nouveauMotDePasse.value.length < 8) {
    erreurMotDePasse.value = 'Le nouveau mot de passe doit contenir au moins 8 caractères.'
    return
  }
  if (nouveauMotDePasse.value !== confirmationNouveauMotDePasse.value) {
    erreurMotDePasse.value = 'La confirmation ne correspond pas au nouveau mot de passe saisi.'
    return
  }
  changementMotDePasseEnCours.value = true
  try {
    const resultat = await authStore.changerMotDePasse(
      motDePasseActuel.value,
      nouveauMotDePasse.value,
    )
    if (!resultat.ok) {
      erreurMotDePasse.value = resultat.erreur
      return
    }
    motDePasseActuel.value = ''
    nouveauMotDePasse.value = ''
    confirmationNouveauMotDePasse.value = ''
    confirmationMotDePasseAffichee.value = true
    setTimeout(() => (confirmationMotDePasseAffichee.value = false), 3000)
  } finally {
    changementMotDePasseEnCours.value = false
  }
}
</script>

<template>
  <main class="profil">
    <RouterLink :to="{ name: 'accueil' }" class="lien-retour">Accueil</RouterLink>
    <h1>Mon profil</h1>

    <section v-if="authStore.utilisateur" class="bloc">
      <h2>Identité</h2>
      <div v-if="!modeEditionIdentite" class="bloc-lecture">
        <p><strong>Prénom :</strong> {{ authStore.utilisateur.prenom }}</p>
        <p><strong>Nom :</strong> {{ authStore.utilisateur.nom }}</p>
        <p><strong>Email (identifiant) :</strong> {{ authStore.utilisateur.email }}</p>
        <p>
          <strong>Rôle :</strong>
          <span class="pastille-role" :class="`pastille-role--${authStore.utilisateur.role}`">
            {{ LIBELLES_ROLE[authStore.utilisateur.role] }}
          </span>
        </p>
        <button type="button" @click="ouvrirEditionIdentite">Modifier nom / prénom</button>
      </div>
      <form v-else class="formulaire" @submit.prevent="enregistrerIdentite">
        <label>
          Prénom
          <input v-model="brouillonIdentite.prenom" type="text" required />
        </label>
        <label>
          Nom
          <input v-model="brouillonIdentite.nom" type="text" required />
        </label>
        <p v-if="erreurIdentite" class="bandeau-erreur" role="alert">{{ erreurIdentite }}</p>
        <div class="actions">
          <button type="button" @click="modeEditionIdentite = false">Annuler</button>
          <button type="submit" :disabled="enregistrementIdentiteEnCours">Enregistrer</button>
        </div>
      </form>
      <p v-if="confirmationIdentiteAffichee" class="confirmation" role="status">✓ Enregistré.</p>
    </section>

    <section class="bloc">
      <h2>Mot de passe</h2>
      <form class="formulaire" @submit.prevent="changerMotDePasse">
        <label>
          Mot de passe actuel
          <input
            v-model="motDePasseActuel"
            type="password"
            required
            autocomplete="current-password"
          />
        </label>
        <label>
          Nouveau mot de passe
          <input
            v-model="nouveauMotDePasse"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </label>
        <label>
          Confirmer le nouveau mot de passe
          <input
            v-model="confirmationNouveauMotDePasse"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </label>
        <p v-if="erreurMotDePasse" class="bandeau-erreur" role="alert">{{ erreurMotDePasse }}</p>
        <div class="actions">
          <button type="submit" :disabled="changementMotDePasseEnCours">
            {{ changementMotDePasseEnCours ? 'Changement en cours…' : 'Changer le mot de passe' }}
          </button>
        </div>
      </form>
      <p v-if="confirmationMotDePasseAffichee" class="confirmation" role="status">
        ✓ Mot de passe changé.
      </p>
    </section>

    <p class="rappel">
      La gestion des comptes (création, désactivation, changement de rôle) se fait sur l'écran «
      Gestion des comptes », réservé aux administrateurs.
    </p>
  </main>
</template>

<style scoped>
.profil {
  padding: 2.5rem;
  max-width: 36rem;
  margin: 0 auto;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: var(--vp-poids-bold);
}

.bloc {
  background-color: var(--vp-fond-carte);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-lg);
  box-shadow: var(--vp-ombre-sm);
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.bloc h2 {
  margin: 0;
  font-size: 1.02rem;
}

.bloc-lecture {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-start;
}

.bloc-lecture p {
  margin: 0;
}

.pastille-role {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: var(--vp-poids-semibold);
}

.pastille-role--admin {
  background-color: var(--vp-accent-fond-leger);
  color: var(--vp-accent);
}

.pastille-role--utilisateur {
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
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
  font-size: 0.9rem;
}

input {
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  font-family: inherit;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.bandeau-erreur {
  color: var(--vp-danger);
  margin: 0;
}

.confirmation {
  color: var(--vp-succes);
  font-weight: 600;
  margin: 0;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.85rem;
}

button {
  cursor: pointer;
}
</style>

<script setup lang="ts">
// Profil utilisateur local (§4.31/URS-F-310bis, TD-033 ; §8.1 du prompt
// maître du 03/09/2026, Phase 40 — nom/prénom ajoutés). Porte le verrou
// de confirmation (mot de passe haché localement) requis pour archiver un
// client/projet. Ce n'est PAS un compte, PAS une authentification de
// session, PAS une signature électronique : dérogation explicite et
// documentée au principe "jamais de mot de passe" du cadrage §5 (TD-011
// interdit tout RBAC/e-signature de façade — ce verrou n'est jamais
// présenté comme tel, ici ni ailleurs dans l'app).
//
// Volontairement SANS champ « rôle » : le §8.1 du prompt maître le
// mentionne, mais aucun rôle n'est appliqué nulle part dans l'app (aucune
// permission réellement vérifiée par rôle) — l'ajouter ici créerait
// exactement la fausse capacité que TD-011 interdit (un sélecteur qui ne
// protège rien). Le rôle réel dépend d'une authentification serveur
// (Phase 39, en attente de confirmation) — voir `docs/convergence/
// ARCHITECTURE_CONFLICTS.md` CONFLICT-004.
import { onMounted, ref } from 'vue'
import { useProfilLocalStore } from '../stores/useProfilLocalStore'

const store = useProfilLocalStore()

const modeEdition = ref(false)
const nom = ref('')
const prenom = ref('')
const email = ref('')
const visa = ref('')
const motDePasseActuelSaisi = ref('')
const nouveauMotDePasse = ref('')
const confirmationMotDePasse = ref('')
const erreur = ref<string | null>(null)
const confirmationAffichee = ref(false)

onMounted(async () => {
  await store.charger()
  if (!store.profil) modeEdition.value = true
})

function ouvrirEdition(): void {
  nom.value = store.profil?.nom ?? ''
  prenom.value = store.profil?.prenom ?? ''
  email.value = store.profil?.email ?? ''
  visa.value = store.profil?.visa ?? ''
  motDePasseActuelSaisi.value = ''
  nouveauMotDePasse.value = ''
  confirmationMotDePasse.value = ''
  erreur.value = null
  modeEdition.value = true
}

async function enregistrer(): Promise<void> {
  erreur.value = null
  if (email.value.trim().length === 0 || visa.value.trim().length === 0) return
  if (nouveauMotDePasse.value.length < 8) {
    erreur.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }
  if (nouveauMotDePasse.value !== confirmationMotDePasse.value) {
    erreur.value = 'La confirmation ne correspond pas au mot de passe saisi.'
    return
  }
  if (store.profil) {
    const motDePasseValide = await store.verifierMotDePasseActuel(motDePasseActuelSaisi.value)
    if (!motDePasseValide) {
      erreur.value = 'Mot de passe actuel incorrect.'
      return
    }
  }

  await store.definirProfil({
    nom: nom.value.trim(),
    prenom: prenom.value.trim(),
    email: email.value.trim(),
    visa: visa.value.trim(),
    motDePasse: nouveauMotDePasse.value,
  })
  modeEdition.value = false
  confirmationAffichee.value = true
}
</script>

<template>
  <main class="profil-local">
    <RouterLink :to="{ name: 'accueil' }">&larr; Accueil</RouterLink>
    <h1>Profil</h1>
    <p class="rappel">
      Ce mot de passe est un <strong>verrou local de confirmation</strong> — requis pour archiver un
      client ou un projet — jamais une authentification, une session, ou une signature électronique
      réglementaire. Il est stocké haché sur cet appareil uniquement et n'offre aucune protection
      contre quelqu'un ayant déjà accès à ce navigateur.
    </p>

    <section v-if="!modeEdition && store.profil" class="bloc-profil">
      <p v-if="store.profil.nom || store.profil.prenom">
        <strong>Nom :</strong> {{ store.profil.prenom }} {{ store.profil.nom }}
      </p>
      <p><strong>Email :</strong> {{ store.profil.email }}</p>
      <p><strong>Visa :</strong> {{ store.profil.visa }}</p>
      <button type="button" @click="ouvrirEdition">Modifier le profil</button>
    </section>

    <form v-if="modeEdition" class="formulaire" @submit.prevent="enregistrer">
      <p v-if="!store.profil" class="rappel" role="alert">
        Aucun profil local configuré pour l'instant — création initiale.
      </p>
      <label>
        Prénom
        <input v-model="prenom" type="text" />
      </label>
      <label>
        Nom
        <input v-model="nom" type="text" />
      </label>
      <label>
        Email
        <input v-model="email" type="email" required />
      </label>
      <label>
        Visa (initiales)
        <input v-model="visa" type="text" required placeholder="ex. QLD" />
      </label>
      <label v-if="store.profil">
        Mot de passe actuel
        <input v-model="motDePasseActuelSaisi" type="password" required />
      </label>
      <label>
        {{ store.profil ? 'Nouveau mot de passe' : 'Mot de passe' }}
        <input v-model="nouveauMotDePasse" type="password" required minlength="8" />
      </label>
      <label>
        Confirmer le mot de passe
        <input v-model="confirmationMotDePasse" type="password" required minlength="8" />
      </label>
      <p v-if="erreur" class="bandeau-erreur" role="alert">{{ erreur }}</p>
      <div class="actions">
        <button v-if="store.profil" type="button" @click="modeEdition = false">Annuler</button>
        <button type="submit">Enregistrer</button>
      </div>
    </form>

    <p v-if="confirmationAffichee" class="confirmation" role="status">Profil enregistré.</p>
  </main>
</template>

<style scoped>
.profil-local {
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

.bloc-profil {
  border: 1px solid var(--vp-bordure, #ddd);
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure, #ddd);
  padding: 1rem;
  border-radius: 0.5rem;
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

.confirmation {
  color: var(--vp-marque);
  font-weight: 600;
}

button {
  cursor: pointer;
}
</style>

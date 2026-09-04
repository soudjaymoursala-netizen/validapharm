<script setup lang="ts">
// Gestion des comptes (TD-046, §9 du prompt maître) — réservé au rôle
// admin (garde de routeur, `router/index.ts`) : créer un compte (aucune
// inscription libre), changer un rôle, désactiver un compte. Le premier
// admin est créé hors de cette UI (`/auth/bootstrap-admin`, voir
// `workers/auth-worker/README.md`) — cet écran ne gère que les comptes
// suivants.
import { onMounted, reactive, ref } from 'vue'
import type { UtilisateurWire } from '../../connecteurs/auth/AuthApiClient'
import { useAuthStore } from '../stores/useAuthStore'

const authStore = useAuthStore()
const utilisateurs = ref<UtilisateurWire[]>([])
const enChargement = ref(false)
const erreur = ref<string | null>(null)

const formulaireOuvert = ref(false)
const brouillon = reactive({
  email: '',
  motDePasse: '',
  nom: '',
  prenom: '',
  role: 'utilisateur' as 'admin' | 'utilisateur',
})

const LIBELLES_ERREUR: Record<string, string> = {
  email_deja_utilise: 'Cet email est déjà utilisé par un autre compte.',
  email_invalide: 'Adresse email invalide.',
  mot_de_passe_trop_court: 'Le mot de passe doit contenir au moins 8 caractères.',
  nom_obligatoire: 'Le nom est obligatoire.',
  prenom_obligatoire: 'Le prénom est obligatoire.',
}

async function charger(): Promise<void> {
  enChargement.value = true
  erreur.value = null
  try {
    const api = await authStore.client()
    if (!api || !authStore.jeton) return
    const resultat = await api.listerUtilisateurs(authStore.jeton)
    if (resultat.ok) utilisateurs.value = resultat.donnees.utilisateurs
  } finally {
    enChargement.value = false
  }
}

onMounted(charger)

async function creerUtilisateur(): Promise<void> {
  erreur.value = null
  const api = await authStore.client()
  if (!api || !authStore.jeton) return

  const resultat = await api.creerUtilisateur(authStore.jeton, {
    email: brouillon.email.trim(),
    motDePasse: brouillon.motDePasse,
    nom: brouillon.nom.trim(),
    prenom: brouillon.prenom.trim(),
    role: brouillon.role,
  })
  if (!resultat.ok) {
    erreur.value = LIBELLES_ERREUR[resultat.erreur] ?? 'Erreur inattendue.'
    return
  }
  formulaireOuvert.value = false
  brouillon.email = ''
  brouillon.motDePasse = ''
  brouillon.nom = ''
  brouillon.prenom = ''
  brouillon.role = 'utilisateur'
  await charger()
}

async function basculerRole(u: UtilisateurWire): Promise<void> {
  const api = await authStore.client()
  if (!api || !authStore.jeton) return
  await api.modifierUtilisateur(authStore.jeton, u.id, {
    role: u.role === 'admin' ? 'utilisateur' : 'admin',
  })
  await charger()
}

async function basculerStatut(u: UtilisateurWire): Promise<void> {
  const api = await authStore.client()
  if (!api || !authStore.jeton) return
  await api.modifierUtilisateur(authStore.jeton, u.id, {
    statut: u.statut === 'actif' ? 'desactive' : 'actif',
  })
  await charger()
}
</script>

<template>
  <main class="admin-utilisateurs">
    <RouterLink :to="{ name: 'accueil' }" class="lien-retour">Accueil</RouterLink>
    <header>
      <h1>Gestion des comptes</h1>
      <button type="button" class="bouton-principal" @click="formulaireOuvert = true">
        Nouveau compte
      </button>
    </header>
    <p class="rappel">
      Aucune inscription libre — seul un admin crée un compte. La désactivation empêche
      immédiatement toute nouvelle connexion (TD-046).
    </p>

    <form v-if="formulaireOuvert" class="formulaire-compte" @submit.prevent="creerUtilisateur">
      <label>
        Prénom
        <input v-model="brouillon.prenom" type="text" required />
      </label>
      <label>
        Nom
        <input v-model="brouillon.nom" type="text" required />
      </label>
      <label>
        Email
        <input v-model="brouillon.email" type="email" required />
      </label>
      <label>
        Mot de passe initial
        <input v-model="brouillon.motDePasse" type="password" required minlength="8" />
      </label>
      <label>
        Rôle
        <select v-model="brouillon.role">
          <option value="utilisateur">Utilisateur</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <p v-if="erreur" class="bandeau-erreur" role="alert">{{ erreur }}</p>
      <div class="actions">
        <button type="button" @click="formulaireOuvert = false">Annuler</button>
        <button type="submit" class="bouton-principal">Créer le compte</button>
      </div>
    </form>

    <p v-if="enChargement" class="etat-vide">Chargement…</p>
    <ul v-else class="liste-comptes">
      <li v-for="u in utilisateurs" :key="u.id">
        <div class="identite">
          <span class="nom">{{ u.prenom }} {{ u.nom }}</span>
          <span class="email">{{ u.email }}</span>
        </div>
        <span class="badge" :class="`badge--${u.role}`">{{ u.role }}</span>
        <span class="badge" :class="`badge--${u.statut}`">{{ u.statut }}</span>
        <div class="actions-compte">
          <button type="button" @click="basculerRole(u)">
            {{ u.role === 'admin' ? 'Rétrograder' : 'Promouvoir admin' }}
          </button>
          <button type="button" class="bouton-danger" @click="basculerStatut(u)">
            {{ u.statut === 'actif' ? 'Désactiver' : 'Réactiver' }}
          </button>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.admin-utilisateurs {
  padding: 2rem;
  font-family: var(--vp-police);
  max-width: 40rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* `.bouton-principal` seulement (Phase 41, même bug que GestionClients.vue) :
   un `button` nu (Annuler, Promouvoir/Rétrograder) doit rester une action
   neutre — la base globale de `tokens.css` s'en charge. */
.bouton-principal {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: var(--vp-transition);
}

.bouton-principal:hover {
  background-color: var(--vp-marque-survol);
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
  margin: 0;
}

.formulaire-compte {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
}

.formulaire-compte label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--vp-texte-secondaire);
}

.formulaire-compte input,
.formulaire-compte select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem;
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

.liste-comptes {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-comptes li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.6rem 0.9rem;
}

.identite {
  display: flex;
  flex-direction: column;
  margin-right: auto;
}

.nom {
  font-weight: var(--vp-poids-medium);
}

.email {
  font-size: 0.8rem;
  color: var(--vp-texte-secondaire);
}

.badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

.badge--desactive {
  background-color: color-mix(in srgb, var(--vp-danger) 15%, transparent);
  color: var(--vp-danger);
}

.actions-compte {
  display: flex;
  gap: 0.4rem;
}

.actions-compte button {
  background-color: var(--vp-fond-page);
  color: var(--vp-texte-principal);
  border: 1px solid var(--vp-bordure);
  font-size: 0.78rem;
  padding: 0.35rem 0.6rem;
}

.bouton-danger {
  color: var(--vp-danger) !important;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

<script setup lang="ts">
// Gestion des comptes (§9 du prompt maître) — réservé au rôle
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
// Refus d'une action sur un compte existant (rôle, statut) — affiché
// au-dessus de la liste, jamais dans le formulaire de création fermé.
const erreurAction = ref<string | null>(null)

const formulaireOuvert = ref(false)
const brouillon = reactive({
  email: '',
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
  compte_desactive: 'Ce compte est désactivé : réactivez-le avant de lui envoyer un lien.',
  dernier_admin:
    "Impossible : c'est le dernier administrateur actif. Nommez d'abord un autre administrateur, sinon plus personne ne pourrait administrer l'application.",
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

  // Aucun mot de passe saisi par l'admin (décision du 26/09/2026) : la
  // personne choisit le sien via le lien d'activation.
  const resultat = await api.creerUtilisateur(authStore.jeton, {
    email: brouillon.email.trim(),
    nom: brouillon.nom.trim(),
    prenom: brouillon.prenom.trim(),
    role: brouillon.role,
  })
  if (!resultat.ok) {
    erreur.value = LIBELLES_ERREUR[resultat.erreur] ?? 'Erreur inattendue.'
    return
  }
  lienEmis.value = {
    titre: `Compte créé pour ${resultat.donnees.utilisateur.email}`,
    email: resultat.donnees.utilisateur.email,
    emailEnvoye: resultat.donnees.emailEnvoye,
    lien: resultat.donnees.lienActivation,
    validite: '24 heures',
  }
  formulaireOuvert.value = false
  brouillon.email = ''
  brouillon.nom = ''
  brouillon.prenom = ''
  brouillon.role = 'utilisateur'
  await charger()
}

/**
 * Applique la modification puis recharge la liste — et affiche le refus du
 * serveur s'il y en a un (avant : ignoré, la liste rechargée ne changeait
 * simplement pas, sans explication).
 */
async function modifier(
  u: UtilisateurWire,
  changements: { role?: 'admin' | 'utilisateur'; statut?: 'actif' | 'desactive' },
): Promise<void> {
  const api = await authStore.client()
  if (!api || !authStore.jeton) return
  erreurAction.value = null
  const resultat = await api.modifierUtilisateur(authStore.jeton, u.id, changements)
  await charger()
  if (!resultat.ok) erreurAction.value = LIBELLES_ERREUR[resultat.erreur] ?? 'Erreur inattendue.'
}

async function basculerRole(u: UtilisateurWire): Promise<void> {
  if (
    u.role === 'admin' &&
    !window.confirm(`Retirer les droits d'administrateur à ${u.prenom} ${u.nom} ?`)
  ) {
    return
  }
  await modifier(u, { role: u.role === 'admin' ? 'utilisateur' : 'admin' })
}

async function basculerStatut(u: UtilisateurWire): Promise<void> {
  if (
    u.statut === 'actif' &&
    !window.confirm(
      `Désactiver le compte de ${u.prenom} ${u.nom} ? Ses sessions sont fermées immédiatement.`,
    )
  ) {
    return
  }
  await modifier(u, { statut: u.statut === 'actif' ? 'desactive' : 'actif' })
}

const LIBELLES_ROLE: Record<UtilisateurWire['role'], string> = {
  admin: 'Administrateur',
  utilisateur: 'Utilisateur',
}
const LIBELLES_STATUT: Record<UtilisateurWire['statut'], string> = {
  actif: 'Actif',
  desactive: 'Désactivé',
}

/** Lien d'activation ou de réinitialisation qui vient d'être émis — affiché pour être transmis si l'e-mail n'a pas pu partir. */
const lienEmis = ref<{
  titre: string
  email: string
  emailEnvoye: boolean
  lien: string
  validite: string
} | null>(null)
const lienCopie = ref(false)

async function reinitialiserMotDePasse(u: UtilisateurWire): Promise<void> {
  if (
    !window.confirm(
      `Envoyer à ${u.email} un lien pour choisir un nouveau mot de passe ? Son mot de passe actuel reste valable jusqu'à l'utilisation du lien.`,
    )
  ) {
    return
  }
  const api = await authStore.client()
  if (!api || !authStore.jeton) return
  erreurAction.value = null
  const resultat = await api.reinitialiserMotDePasseUtilisateur(authStore.jeton, u.id)
  if (!resultat.ok) {
    erreurAction.value = LIBELLES_ERREUR[resultat.erreur] ?? 'Erreur inattendue.'
    return
  }
  lienEmis.value = {
    titre: `Lien de réinitialisation pour ${u.email}`,
    email: u.email,
    emailEnvoye: resultat.donnees.emailEnvoye,
    lien: resultat.donnees.lienReinitialisation,
    validite: '2 heures',
  }
}

async function copierLien(): Promise<void> {
  if (!lienEmis.value) return
  try {
    await navigator.clipboard.writeText(lienEmis.value.lien)
    lienCopie.value = true
    setTimeout(() => (lienCopie.value = false), 2000)
  } catch {
    lienCopie.value = false
  }
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
      immédiatement toute nouvelle connexion.
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
      <p class="rappel">
        Aucun mot de passe à saisir : la personne reçoit un lien d'activation (valable 24 heures)
        pour choisir le sien.
      </p>
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

    <section v-if="lienEmis" class="lien-emis" role="status">
      <h2>{{ lienEmis.titre }}</h2>
      <p v-if="lienEmis.emailEnvoye">
        Un e-mail contenant ce lien a été envoyé à {{ lienEmis.email }}.
      </p>
      <p v-else class="avertissement">
        L'e-mail n'a pas pu être envoyé : transmettez ce lien à {{ lienEmis.email }} par un autre
        moyen (messagerie interne…).
      </p>
      <p class="rappel">
        Valable {{ lienEmis.validite }}, utilisable une seule fois. Ne le partagez qu'avec son
        destinataire.
      </p>
      <div class="ligne-lien">
        <input :value="lienEmis.lien" type="text" readonly aria-label="Lien à transmettre" />
        <button type="button" @click="copierLien">{{ lienCopie ? 'Copié' : 'Copier' }}</button>
        <button type="button" @click="lienEmis = null">Fermer</button>
      </div>
    </section>

    <p v-if="erreurAction" class="bandeau-erreur" role="alert">{{ erreurAction }}</p>
    <p v-if="enChargement" class="etat-vide">Chargement…</p>
    <ul v-else class="liste-comptes">
      <li v-for="u in utilisateurs" :key="u.id">
        <div class="identite">
          <span class="nom">{{ u.prenom }} {{ u.nom }}</span>
          <span class="email">{{ u.email }}</span>
        </div>
        <span class="badge" :class="`badge--${u.role}`">{{ LIBELLES_ROLE[u.role] }}</span>
        <span class="badge" :class="`badge--${u.statut}`">{{ LIBELLES_STATUT[u.statut] }}</span>
        <div class="actions-compte">
          <button v-if="u.statut === 'actif'" type="button" @click="reinitialiserMotDePasse(u)">
            Réinitialiser le mot de passe
          </button>
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
.lien-emis {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  background: var(--vp-fond-carte);
}

.lien-emis h2 {
  margin: 0;
  font-size: 1rem;
}

.lien-emis p {
  margin: 0;
}

.lien-emis .avertissement {
  color: var(--vp-attention);
  font-weight: var(--vp-poids-semibold);
}

.ligne-lien {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ligne-lien input {
  flex: 1 1 16rem;
  min-width: 0;
}

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
  flex-wrap: wrap;
  gap: 1rem;
}

/* `.bouton-principal` seulement (même bug que GestionClients.vue) :
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
  flex-wrap: wrap;
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

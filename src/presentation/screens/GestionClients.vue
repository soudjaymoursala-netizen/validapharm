<script setup lang="ts">
// Mes clients (§4/§13 du prompt maître du 03/09/2026) — chaque
// client représente un site industriel pour lequel l'utilisateur travaille
// (nom, adresse, secteur, détails). Cliquer sur un client ouvre sa Fiche
// (`FicheClient.vue`), qui expose les 5 branches (Architecture, Process,
// Procédures, Templates & Formulaires, Projets) — cet écran ne liste donc
// plus directement les outils (auparavant : 8 liens par ligne), il ne
// fait que créer/archiver/désarchiver l'identité du client.
//
// Archivage (§4.31) : jamais une suppression physique (ALCOA+)
// — voir `ModaleConfirmationArchivage.vue` pour la double garde (nom
// retapé + vraie session). Suppression **définitive** (admin
// uniquement, justification obligatoire) : voir `ModaleSuppressionDefinitive.vue` — jamais pour un rôle non-admin.
import { onMounted, ref } from 'vue'
import ModaleConfirmationArchivage from '../composants/ModaleConfirmationArchivage.vue'
import ModaleSuppressionDefinitive from '../composants/ModaleSuppressionDefinitive.vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useClientsStore } from '../stores/useClientsStore'
import type { Client, SecteurClient } from '../../logique-metier/domaine/types'

const store = useClientsStore()
const authStore = useAuthStore()
const formulaireOuvert = ref(false)
const brouillon = ref({ name: '', adresse: '', secteur: '' as SecteurClient | '', details: '' })
const afficherArchives = ref(false)
const clientAArchiver = ref<Client | null>(null)
const clientASupprimer = ref<Client | null>(null)
const erreurCreation = ref<string | null>(null)
const erreurAction = ref<string | null>(null)

const LIBELLES_SECTEUR: Record<SecteurClient, string> = {
  pharmaceutique: 'Pharmaceutique',
  dispositif_medical: 'Dispositif médical',
  autre: 'Autre',
}

// Codes métier renvoyés par le Worker (`routeur.ts`, gererCreerClient/
// gererModifierClient/gererSupprimerClientDefinitivement) — un message par
// défaut couvre tout code inconnu ou une panne de connectivité réelle
// (`IndisponibleAuthError`/`TimeoutAuthError`/`ReponseInvalideAuthError`,
// levées par `AuthApiClient` plutôt que renvoyées, d'où le `catch` sur
// chaque action ci-dessous).
const LIBELLES_ERREUR: Record<string, string> = {
  nom_obligatoire: "Le nom de l'entreprise est obligatoire.",
  deja_archive: 'Ce client a déjà été archivé entre-temps (probablement depuis un autre onglet).',
  deja_actif: 'Ce client a déjà été désarchivé entre-temps (probablement depuis un autre onglet).',
  non_autorise: "Vous n'avez pas les droits nécessaires pour cette action.",
  introuvable: "Ce client n'existe plus (probablement supprimé entre-temps).",
  mot_de_passe_incorrect: 'Mot de passe incorrect : la suppression définitive a été refusée.',
  corps_invalide: 'Les informations envoyées sont incomplètes ou invalides.',
  client_non_vide:
    'Suppression refusée : ce client a encore des données (projets, évaluations, tests…). Il reste archivé, ses données sont conservées.',
}

function libelleErreur(e: unknown): string {
  if (e && typeof e === 'object' && 'erreur' in e && typeof e.erreur === 'string') {
    return LIBELLES_ERREUR[e.erreur] ?? `Échec (${e.erreur}).`
  }
  return e instanceof Error ? e.message : 'Erreur inconnue.'
}

onMounted(async () => {
  await store.chargerClients()
})

async function creerClient(): Promise<void> {
  if (brouillon.value.name.trim().length === 0) return
  erreurCreation.value = null
  try {
    const resultat = await store.creerClient({
      name: brouillon.value.name.trim(),
      adresse: brouillon.value.adresse.trim() || null,
      secteur: brouillon.value.secteur || null,
      details: brouillon.value.details.trim() || null,
    })
    // Avant ce correctif, ce résultat n'était jamais vérifié : un échec
    // métier (ex. nom vide côté serveur) fermait quand même le formulaire
    // et effaçait le brouillon saisi, exactement comme un succès — aucun
    // moyen de savoir que la création avait échoué.
    if ('erreur' in resultat) {
      erreurCreation.value = libelleErreur(resultat)
      return
    }
    formulaireOuvert.value = false
    brouillon.value = { name: '', adresse: '', secteur: '', details: '' }
  } catch (e) {
    erreurCreation.value = libelleErreur(e)
  }
}

async function confirmerArchivage(): Promise<void> {
  if (!clientAArchiver.value) return
  erreurAction.value = null
  try {
    const resultat = await store.archiverClient(clientAArchiver.value.id)
    if ('erreur' in resultat) erreurAction.value = libelleErreur(resultat)
  } catch (e) {
    erreurAction.value = libelleErreur(e)
  } finally {
    clientAArchiver.value = null
  }
}

async function desarchiver(client: Client): Promise<void> {
  erreurAction.value = null
  try {
    const resultat = await store.desarchiverClient(client.id)
    if ('erreur' in resultat) erreurAction.value = libelleErreur(resultat)
  } catch (e) {
    erreurAction.value = libelleErreur(e)
  }
}

async function confirmerSuppressionDefinitive(
  justification: string,
  motDePasse: string,
): Promise<void> {
  if (!clientASupprimer.value) return
  erreurAction.value = null
  try {
    const resultat = await store.supprimerDefinitivement(
      clientASupprimer.value.id,
      justification,
      motDePasse,
    )
    if ('erreur' in resultat) erreurAction.value = libelleErreur(resultat)
  } catch (e) {
    erreurAction.value = libelleErreur(e)
  } finally {
    clientASupprimer.value = null
  }
}
</script>

<template>
  <main class="gestion-clients">
    <header>
      <RouterLink :to="{ name: 'accueil' }" class="lien-retour">Accueil</RouterLink>
      <h1>Mes clients</h1>
      <button type="button" class="bouton-principal" @click="formulaireOuvert = true">
        Nouveau client
      </button>
    </header>

    <form v-if="formulaireOuvert" class="formulaire-client" @submit.prevent="creerClient">
      <label>
        Nom de l'entreprise
        <input v-model="brouillon.name" type="text" required autofocus />
      </label>
      <label>
        Adresse
        <input v-model="brouillon.adresse" type="text" />
      </label>
      <label>
        Secteur
        <select v-model="brouillon.secteur">
          <option value="">— non renseigné —</option>
          <option value="pharmaceutique">Pharmaceutique</option>
          <option value="dispositif_medical">Dispositif médical</option>
          <option value="autre">Autre</option>
        </select>
      </label>
      <label>
        Détails (produits fabriqués, contexte industriel…)
        <textarea v-model="brouillon.details" rows="2" />
      </label>
      <p v-if="erreurCreation" class="bandeau-erreur" role="alert">{{ erreurCreation }}</p>
      <div class="actions">
        <button type="button" @click="formulaireOuvert = false">Annuler</button>
        <button type="submit" class="bouton-principal">Créer le client</button>
      </div>
    </form>

    <p v-if="erreurAction" class="bandeau-erreur" role="alert">{{ erreurAction }}</p>

    <p v-if="!store.enChargement && store.clientsActifs.length === 0" class="etat-vide">
      Aucun client actif pour l'instant — créez le premier avec le bouton ci-dessus.
    </p>

    <ul v-else class="liste-clients">
      <li v-for="client in store.clientsActifs" :key="client.id">
        <RouterLink
          :to="{ name: 'fiche-client', params: { clientId: client.id } }"
          class="lien-client"
        >
          <span class="nom-client">{{ client.name }}</span>
          <span v-if="client.secteur" class="badge-secteur">{{
            LIBELLES_SECTEUR[client.secteur]
          }}</span>
        </RouterLink>
        <button type="button" class="bouton-archiver" @click="clientAArchiver = client">
          Archiver
        </button>
      </li>
    </ul>

    <section class="bloc-archives">
      <button type="button" class="lien-archives" @click="afficherArchives = !afficherArchives">
        {{ afficherArchives ? 'Masquer' : 'Afficher' }} les clients archivés ({{
          store.clientsArchives.length
        }})
      </button>
      <ul v-if="afficherArchives" class="liste-clients liste-clients--archives">
        <li v-for="client in store.clientsArchives" :key="client.id">
          {{ client.name }}
          <span class="meta">archivé le {{ client.archived_at }} par {{ client.archived_by }}</span>
          <div class="actions-archive">
            <button type="button" @click="desarchiver(client)">Désarchiver</button>
            <button
              v-if="authStore.estAdmin"
              type="button"
              class="bouton-danger"
              @click="clientASupprimer = client"
            >
              Supprimer définitivement
            </button>
          </div>
        </li>
      </ul>
    </section>

    <ModaleConfirmationArchivage
      v-if="clientAArchiver"
      :nom="clientAArchiver.name"
      @confirme="confirmerArchivage"
      @annule="clientAArchiver = null"
    />
    <ModaleSuppressionDefinitive
      v-if="clientASupprimer"
      :nom="clientASupprimer.name"
      @confirme="confirmerSuppressionDefinitive"
      @annule="clientASupprimer = null"
    />
  </main>
</template>

<style scoped>
.gestion-clients {
  padding: 2rem;
  font-family: var(--vp-police);
  max-width: 32rem;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

/* `.bouton-principal` seulement (jamais un `button` nu) : un `button`
   sans classe (Annuler, Désarchiver) doit rester une action neutre/
   secondaire — la base globale de `tokens.css` s'en charge — et non
   hériter par erreur de l'apparence d'une action primaire (bug trouvé
   pendant la vérification navigateur : « Annuler » avait
   exactement la même couleur que « Créer le client »). */
.bouton-principal {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: var(--vp-transition);
}

.bouton-principal:hover {
  background-color: var(--vp-marque-survol);
}

.formulaire-client {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.formulaire-client label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.formulaire-client input,
.formulaire-client select,
.formulaire-client textarea {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon-sm);
  padding: 0.5rem;
  font-family: inherit;
  color: var(--vp-texte-principal);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.liste-clients {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-clients li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  background-color: var(--vp-fond-carte);
  box-shadow: var(--vp-ombre-sm);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: var(--vp-transition);
}

.liste-clients:not(.liste-clients--archives) li:hover {
  border-color: var(--vp-marque);
  box-shadow: var(--vp-ombre-md);
}

.lien-client {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-right: auto;
  color: var(--vp-texte-principal);
  text-decoration: none;
}

.lien-client:hover .nom-client {
  color: var(--vp-marque);
}

.nom-client {
  font-weight: var(--vp-poids-medium);
}

.badge-secteur {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background-color: var(--vp-marque-fond-leger);
  color: var(--vp-marque);
}

/* `color`/`border` explicites, indispensables : sans eux, ce bouton
   n'hérite que `background-color` ici et retombe pour le reste sur la base
   globale (`tokens.css`) — `color: var(--vp-texte-principal)` (encre
   quasi noire) au repos sur fond rouge plein (contraste limite), puis
   `color: var(--vp-marque)` (violet) + `border-color: var(--vp-marque)`
   au survol (`button:hover`) : texte violet sur fond rouge, incohérent
   trouvé en testant réellement le survol dans le navigateur. `--vp-danger`
   ne change pas entre thèmes clair/sombre (contrairement à `--vp-marque`),
   d'où le blanc fixe plutôt qu'un token de thème. */
.bouton-archiver {
  background-color: var(--vp-danger);
  color: white;
  border: none;
  flex-shrink: 0;
}

.bouton-archiver:hover:not(:disabled) {
  background-color: var(--vp-danger);
  color: white;
  border-color: transparent;
  filter: brightness(0.9);
}

.actions-archive {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}

.bouton-danger {
  background-color: transparent;
  color: var(--vp-danger);
  border: 1px solid var(--vp-danger);
}

/* Même défaut que `.bouton-archiver` ci-dessus : sans ce survol propre, ce
   bouton de suppression définitive passait en violet de marque au survol
   (`button:hover` global) — perd tout son sens de "action dangereuse"
   juste au moment où l'utilisateur s'apprête à cliquer dessus. */
.bouton-danger:hover:not(:disabled) {
  background-color: var(--vp-danger);
  color: white;
  border-color: var(--vp-danger);
}

.bloc-archives {
  margin-top: 1.5rem;
}

.lien-archives {
  background: none;
  color: var(--vp-marque);
  border: none;
  padding: 0;
  text-decoration: underline;
}

.liste-clients--archives {
  margin-top: 0.75rem;
}

.liste-clients--archives li {
  opacity: 0.75;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.bandeau-erreur {
  margin: 0 0 0.75rem;
  color: var(--vp-danger);
  font-size: 0.85rem;
}
</style>

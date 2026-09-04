<script setup lang="ts">
// Configuration des connecteurs QMS/documentaires tiers —
// écran manquant trouvé le 31/08/2026 (FDS §12) : le type de
// domaine `Connector` et sa table Dexie existent depuis la Phase 10, sans
// jamais avoir eu de store ni d'écran. CRUD de configuration uniquement,
// cf. `useConnecteursQMSStore.ts` pour le détail du périmètre.
import { computed, onMounted, reactive, ref } from 'vue'
import { useClientsStore } from '../stores/useClientsStore'
import { useConnecteursQMSStore } from '../stores/useConnecteursQMSStore'
import type { TypeConnector } from '../../logique-metier/domaine/types'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const connecteursStore = useConnecteursQMSStore()

const nomClient = ref<string | null>(null)

onMounted(async () => {
  const client = await clientsStore.obtenirClient(props.clientId)
  nomClient.value = client?.name ?? null
  await connecteursStore.charger(props.clientId)
})

const LIBELLES_TYPE: Record<TypeConnector, string> = {
  github: 'GitHub (dépôt de stockage ValidaPharm)',
  google_drive: 'Google Drive (miroir ValidaPharm)',
  veeva_vault: 'Veeva Vault',
  sharepoint: 'SharePoint',
  dossier_reseau: 'Dossier réseau',
  edms_generique: 'EDMS générique',
}

const ADAPTATEUR_NON_IMPLEMENTE: Partial<Record<TypeConnector, true>> = {
  veeva_vault: true,
  sharepoint: true,
  dossier_reseau: true,
  edms_generique: true,
}

const brouillon = reactive({
  nom: '',
  type: '' as TypeConnector | '',
  owner: '',
  repo: '',
  branche: '',
  jeton: '',
  dossierId: '',
  vaultDns: '',
  nomUtilisateur: '',
  motDePasse: '',
  siteUrl: '',
  chemin: '',
  url: '',
})

const formulaireComplet = computed(() => {
  if (brouillon.nom.trim().length === 0 || !brouillon.type) return false
  switch (brouillon.type) {
    case 'github':
      return brouillon.owner.trim().length > 0 && brouillon.repo.trim().length > 0
    case 'google_drive':
      return brouillon.dossierId.trim().length > 0
    case 'veeva_vault':
      return brouillon.vaultDns.trim().length > 0 && brouillon.nomUtilisateur.trim().length > 0
    case 'sharepoint':
      return brouillon.siteUrl.trim().length > 0
    case 'dossier_reseau':
      return brouillon.chemin.trim().length > 0
    case 'edms_generique':
      return brouillon.url.trim().length > 0
    default:
      return false
  }
})

async function creerConnecteur(): Promise<void> {
  if (!formulaireComplet.value || !brouillon.type) return
  const nom = brouillon.nom.trim()
  switch (brouillon.type) {
    case 'github':
      await connecteursStore.creerConnecteur(props.clientId, {
        nom,
        actif: true,
        type: 'github',
        config: {
          owner: brouillon.owner.trim(),
          repo: brouillon.repo.trim(),
          branche: brouillon.branche.trim() || null,
          jeton: brouillon.jeton,
        },
      })
      break
    case 'google_drive':
      await connecteursStore.creerConnecteur(props.clientId, {
        nom,
        actif: true,
        type: 'google_drive',
        config: { dossierId: brouillon.dossierId.trim(), jeton: brouillon.jeton },
      })
      break
    case 'veeva_vault':
      await connecteursStore.creerConnecteur(props.clientId, {
        nom,
        actif: true,
        type: 'veeva_vault',
        config: {
          vaultDns: brouillon.vaultDns.trim(),
          nomUtilisateur: brouillon.nomUtilisateur.trim(),
          motDePasse: brouillon.motDePasse,
        },
      })
      break
    case 'sharepoint':
      await connecteursStore.creerConnecteur(props.clientId, {
        nom,
        actif: true,
        type: 'sharepoint',
        config: { siteUrl: brouillon.siteUrl.trim(), jeton: brouillon.jeton },
      })
      break
    case 'dossier_reseau':
      await connecteursStore.creerConnecteur(props.clientId, {
        nom,
        actif: true,
        type: 'dossier_reseau',
        config: { chemin: brouillon.chemin.trim() },
      })
      break
    case 'edms_generique':
      await connecteursStore.creerConnecteur(props.clientId, {
        nom,
        actif: true,
        type: 'edms_generique',
        config: { url: brouillon.url.trim(), jeton: brouillon.jeton },
      })
      break
  }
  brouillon.nom = ''
  brouillon.type = ''
  brouillon.owner = ''
  brouillon.repo = ''
  brouillon.branche = ''
  brouillon.jeton = ''
  brouillon.dossierId = ''
  brouillon.vaultDns = ''
  brouillon.nomUtilisateur = ''
  brouillon.motDePasse = ''
  brouillon.siteUrl = ''
  brouillon.chemin = ''
  brouillon.url = ''
}
</script>

<template>
  <main class="connecteurs-qms">
    <RouterLink :to="{ name: 'gestion-clients' }">&larr; Clients</RouterLink>
    <h1>Connecteurs QMS/documentaires — {{ nomClient ?? props.clientId }}</h1>
    <p class="bandeau-disclaimer">
      Configuration uniquement. Les adaptateurs Veeva Vault, SharePoint, dossier réseau et EDMS
      générique ne sont pas encore implémentés — aucun test de connexion réel n'est possible depuis
      cet écran pour ces types.
    </p>

    <form class="formulaire" @submit.prevent="creerConnecteur">
      <label>
        Nom du connecteur
        <input
          v-model="brouillon.nom"
          type="text"
          required
          placeholder="ex. Veeva Vault site Rennes"
        />
      </label>
      <label>
        Type
        <select v-model="brouillon.type" required>
          <option value="" disabled>— choisir —</option>
          <option v-for="(libelle, type) in LIBELLES_TYPE" :key="type" :value="type">
            {{ libelle }}
          </option>
        </select>
      </label>
      <p v-if="brouillon.type && ADAPTATEUR_NON_IMPLEMENTE[brouillon.type]" class="rappel">
        Type reconnu et modélisé — adaptateur non implémenté (configuration consignée, aucune
        connexion réelle possible pour l'instant).
      </p>

      <template v-if="brouillon.type === 'github'">
        <label>Propriétaire <input v-model="brouillon.owner" type="text" required /></label>
        <label>Dépôt <input v-model="brouillon.repo" type="text" required /></label>
        <label>Branche (optionnel) <input v-model="brouillon.branche" type="text" /></label>
        <label>Jeton <input v-model="brouillon.jeton" type="password" /></label>
      </template>
      <template v-else-if="brouillon.type === 'google_drive'">
        <label
          >Identifiant du dossier <input v-model="brouillon.dossierId" type="text" required
        /></label>
        <label>Jeton <input v-model="brouillon.jeton" type="password" /></label>
      </template>
      <template v-else-if="brouillon.type === 'veeva_vault'">
        <label>DNS du Vault <input v-model="brouillon.vaultDns" type="text" required /></label>
        <label
          >Nom d'utilisateur <input v-model="brouillon.nomUtilisateur" type="text" required
        /></label>
        <label>Mot de passe <input v-model="brouillon.motDePasse" type="password" /></label>
      </template>
      <template v-else-if="brouillon.type === 'sharepoint'">
        <label>URL du site <input v-model="brouillon.siteUrl" type="text" required /></label>
        <label>Jeton <input v-model="brouillon.jeton" type="password" /></label>
      </template>
      <template v-else-if="brouillon.type === 'dossier_reseau'">
        <label>Chemin <input v-model="brouillon.chemin" type="text" required /></label>
      </template>
      <template v-else-if="brouillon.type === 'edms_generique'">
        <label>URL <input v-model="brouillon.url" type="text" required /></label>
        <label>Jeton <input v-model="brouillon.jeton" type="password" /></label>
      </template>

      <div class="actions">
        <button type="submit" :disabled="!formulaireComplet">Créer le connecteur</button>
      </div>
    </form>

    <ul class="liste-connecteurs">
      <li v-for="c in connecteursStore.connecteurs" :key="c.id">
        <div class="ligne-connecteur">
          <strong>{{ c.nom }}</strong>
          <span class="meta">({{ LIBELLES_TYPE[c.type] }})</span>
          <span :class="['statut', c.actif ? 'actif' : 'inactif']">{{
            c.actif ? 'actif' : 'inactif'
          }}</span>
        </div>
        <div class="actions-connecteur">
          <button type="button" @click="connecteursStore.basculerActif(c.id)">
            {{ c.actif ? 'Désactiver' : 'Activer' }}
          </button>
          <button type="button" @click="connecteursStore.supprimerConnecteur(c.id)">
            Supprimer
          </button>
        </div>
      </li>
    </ul>
    <p v-if="connecteursStore.connecteurs.length === 0" class="etat-vide">
      Aucun connecteur configuré pour l'instant.
    </p>
  </main>
</template>

<style scoped>
.connecteurs-qms {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 40rem;
}

.bandeau-disclaimer {
  font-style: italic;
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.formulaire label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input,
select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

button {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.liste-connecteurs {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.liste-connecteurs li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ligne-connecteur {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}

.statut {
  font-size: 0.8em;
  font-weight: 600;
  border-radius: var(--vp-rayon);
  padding: 0.1rem 0.5rem;
}

.statut.actif {
  color: var(--vp-marque);
}

.statut.inactif {
  color: var(--vp-texte-secondaire);
}

.actions-connecteur {
  display: flex;
  gap: 0.5rem;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}
</style>

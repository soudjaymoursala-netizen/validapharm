<script setup lang="ts">
// Garde d'archivage (§4.31/URS-F-310, TD-033) — double confirmation
// délibérément demandée pour se protéger d'une suppression accidentelle :
// (1) retaper le nom exact du client/projet (pattern GitHub "type the repo
// name to confirm"), (2) saisir le mot de passe du profil local. Aucun des
// deux n'est une authentification — le nom est visible à l'écran juste
// au-dessus (il ne prouve rien, il ralentit un clic impulsif), et le mot
// de passe est un verrou local (voir `ProfilLocal.vue`/TD-033), pas une
// signature électronique.
import { onMounted, ref } from 'vue'
import { useProfilLocalStore } from '../stores/useProfilLocalStore'

const props = defineProps<{ nom: string }>()
const emit = defineEmits<{ confirme: [identiteDeclaree: string]; annule: [] }>()

const profilLocalStore = useProfilLocalStore()
const nomSaisi = ref('')
const motDePasseSaisi = ref('')
const erreur = ref<string | null>(null)

// Chargement explicite ici (pas seulement dans `ProfilLocal.vue`) : cette
// modale peut s'ouvrir sur un écran qui n'a jamais chargé `profilLocal`
// (ex. `GestionClients.vue` juste après un rechargement de page complet —
// l'état Pinia ne survit pas à une navigation, contrairement à un simple
// changement de route) — sans ce chargement, la garde affichait toujours
// "aucun profil configuré" même quand un profil existait réellement.
onMounted(async () => {
  await profilLocalStore.charger()
})

async function confirmer(): Promise<void> {
  erreur.value = null
  if (nomSaisi.value.trim() !== props.nom.trim()) {
    erreur.value = 'Le nom saisi ne correspond pas.'
    return
  }
  const motDePasseValide = await profilLocalStore.verifierMotDePasseActuel(motDePasseSaisi.value)
  if (!motDePasseValide) {
    erreur.value = 'Mot de passe incorrect.'
    return
  }
  const profil = profilLocalStore.profil
  emit('confirme', profil ? `${profil.visa} (${profil.email})` : 'inconnu')
}
</script>

<template>
  <div class="fond-modale" role="dialog" aria-modal="true">
    <div class="modale">
      <h2>Confirmer l'archivage</h2>

      <p v-if="!profilLocalStore.profil" class="bandeau-erreur" role="alert">
        Aucun profil local configuré. Configurez d'abord votre profil (email, visa, mot de passe)
        pour pouvoir archiver un client ou un projet.
        <RouterLink :to="{ name: 'profil-local' }">Configurer mon profil</RouterLink>
      </p>

      <template v-else>
        <p>
          Cette action archive <strong>« {{ nom }} »</strong> — les données ne sont jamais
          supprimées, l'élément reste restaurable depuis les archives.
        </p>
        <form class="formulaire" @submit.prevent="confirmer">
          <label>
            Retapez le nom pour confirmer
            <input v-model="nomSaisi" type="text" required autofocus />
          </label>
          <label>
            Mot de passe
            <input v-model="motDePasseSaisi" type="password" required />
          </label>
          <p v-if="erreur" class="bandeau-erreur" role="alert">{{ erreur }}</p>
          <div class="actions">
            <button type="button" @click="emit('annule')">Annuler</button>
            <button type="submit" class="bouton-danger">Archiver</button>
          </div>
        </form>
      </template>

      <button v-if="!profilLocalStore.profil" type="button" @click="emit('annule')">Fermer</button>
    </div>
  </div>
</template>

<style scoped>
.fond-modale {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modale {
  background: var(--vp-fond-carte, white);
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-width: 26rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  color: var(--vp-couleur-erreur, #b00020);
}

.bouton-danger {
  background-color: var(--vp-couleur-erreur, #b00020);
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
}

button {
  cursor: pointer;
}
</style>

import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * État de joignabilité du Worker, alimenté par l'observateur de
 * `AuthApiClient` (voir `useAuthStore.client`). Les stores gardent leur
 * repli « jamais une exception non gérée » (listes vides en cas de panne),
 * mais l'interface peut désormais dire que ces listes vides ne sont PAS la
 * réalité : un bandeau global prévient tant que le serveur est injoignable
 * (ex. « Aucune méthode configurée » affiché à tort, qui inciterait à
 * ressaisir une méthode existante).
 */
export const useConnectiviteServeurStore = defineStore('connectiviteServeur', () => {
  const serveurInjoignable = ref(false)

  function signaler(joignable: boolean): void {
    serveurInjoignable.value = !joignable
  }

  return { serveurInjoignable, signaler }
})

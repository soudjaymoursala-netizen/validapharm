import { defineStore } from 'pinia'
import { ref } from 'vue'

const CLE_LOCALSTORAGE = 'validapharm.client_actif_id'

/**
 * Mémoire de navigation du dernier client visité (`docs/
 * convergence/PHASE_16_COQUILLE_UX_SPEC.md` §2) — une commodité de
 * navigation côté navigateur, **jamais une donnée métier persistée en
 * base** (`localStorage`, pas Dexie). Sert uniquement à ce que la
 * `Sidebar` propose un accès direct aux outils du dernier client visité,
 * plutôt que de refabriquer un concept global de "client actif" côté
 * domaine sans besoin réel démontré.
 */
export const useClientActifStore = defineStore('clientActif', () => {
  const clientActifId = ref<string | null>(lireDepuisStockage())

  function definirClientActif(clientId: string): void {
    clientActifId.value = clientId
    try {
      localStorage.setItem(CLE_LOCALSTORAGE, clientId)
    } catch {
      // Stockage indisponible (navigation privée, quota) — la préférence
      // reste valide pour la session en cours, jamais une erreur bloquante.
    }
  }

  function reinitialiser(): void {
    clientActifId.value = null
    try {
      localStorage.removeItem(CLE_LOCALSTORAGE)
    } catch {
      // Voir ci-dessus.
    }
  }

  return { clientActifId, definirClientActif, reinitialiser }
})

function lireDepuisStockage(): string | null {
  try {
    return localStorage.getItem(CLE_LOCALSTORAGE)
  } catch {
    return null
  }
}

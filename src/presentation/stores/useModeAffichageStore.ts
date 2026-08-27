import { defineStore } from 'pinia'
import { ref } from 'vue'

const CLE_LOCALSTORAGE = 'validapharm.mode_affichage'

export type ModeAffichage = 'expert' | 'assistant'
const MODE_PAR_DEFAUT: ModeAffichage = 'expert'

/**
 * Bascule Mode Expert / Mode Assistant (Phase 16, `docs/convergence/
 * PHASE_16_COQUILLE_UX_SPEC.md` §3) — préférence d'affichage côté
 * navigateur (`localStorage`), pas une donnée métier. "Coexistants sur le
 * même moteur" (vision produit) : aucun nouveau moteur n'est créé pour le
 * mode Assistant. **Limite assumée** : ce store ne fait, dans ce lot,
 * qu'exposer et persister la préférence — aucun écran existant n'en
 * modifie encore son comportement (différencier réellement les deux modes
 * suppose la Phase 17, Mission workspace, qui n'existe pas encore).
 */
export const useModeAffichageStore = defineStore('modeAffichage', () => {
  const mode = ref<ModeAffichage>(lireDepuisStockage())

  function definirMode(nouveauMode: ModeAffichage): void {
    mode.value = nouveauMode
    try {
      localStorage.setItem(CLE_LOCALSTORAGE, nouveauMode)
    } catch {
      // Stockage indisponible — la préférence reste valide pour la session en cours.
    }
  }

  return { mode, definirMode }
})

function lireDepuisStockage(): ModeAffichage {
  try {
    const valeur = localStorage.getItem(CLE_LOCALSTORAGE)
    return valeur === 'expert' || valeur === 'assistant' ? valeur : MODE_PAR_DEFAUT
  } catch {
    return MODE_PAR_DEFAUT
  }
}

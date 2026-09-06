import { defineStore } from 'pinia'
import { ref } from 'vue'

const CLE_STOCKAGE = 'validapharm.raccourcis_epingles'

export interface RaccourciEpingle {
  id: string
  libelle: string
  routeName: string
  routeParams: Record<string, string>
}

function lireRaccourcis(): RaccourciEpingle[] {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    if (!brut) return []
    const valeur: unknown = JSON.parse(brut)
    return Array.isArray(valeur) ? (valeur as RaccourciEpingle[]) : []
  } catch {
    return []
  }
}

function ecrireRaccourcis(raccourcis: RaccourciEpingle[]): void {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(raccourcis))
  } catch {
    // Stockage indisponible — la préférence reste valide pour la session en cours.
  }
}

/**
 * Épinglage de raccourcis (§5 du parcours utilisateur donné par
 * l'utilisateur, 06/09/2026 — « Possibilité de pouvoir épingler une autre
 * section ou sous-section ») — préférence de poste, comme le thème/la
 * police (`usePreferencesAffichageStore`), jamais une donnée de projet :
 * un raccourci épinglé n'est qu'un lien vers une route déjà accessible par
 * la navigation normale, jamais une nouvelle capacité.
 */
export const useEpinglageStore = defineStore('epinglage', () => {
  const raccourcis = ref<RaccourciEpingle[]>(lireRaccourcis())

  function estEpingle(id: string): boolean {
    return raccourcis.value.some((r) => r.id === id)
  }

  function epingler(raccourci: RaccourciEpingle): void {
    if (estEpingle(raccourci.id)) return
    raccourcis.value = [...raccourcis.value, raccourci]
    ecrireRaccourcis(raccourcis.value)
  }

  function desepingler(id: string): void {
    raccourcis.value = raccourcis.value.filter((r) => r.id !== id)
    ecrireRaccourcis(raccourcis.value)
  }

  function basculer(raccourci: RaccourciEpingle): void {
    if (estEpingle(raccourci.id)) desepingler(raccourci.id)
    else epingler(raccourci)
  }

  return { raccourcis, estEpingle, epingler, desepingler, basculer }
})

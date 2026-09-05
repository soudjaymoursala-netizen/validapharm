import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const CLE_THEME = 'validapharm.theme'
const CLE_POLICE = 'validapharm.police'

export type ThemeAffichage = 'clair' | 'sombre' | 'systeme'
export type PoliceAffichage = 'systeme' | 'serif'

const PILES_POLICE: Record<PoliceAffichage, string> = {
  systeme: "'Inter', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
}

/**
 * Préférences d'affichage (§9 du prompt maître du 03/09/2026, écran
 * Paramètres) — thème et police uniquement : les deux seules
 * préférences réellement câblées de bout en bout (jetons `tokens.css`
 * modifiés via l'attribut `data-theme`/`--vp-police`). La langue d'interface
 * et une densité d'affichage ne sont volontairement PAS proposées ici —
 * aucun mécanisme d'i18n de l'interface (distinct de `Langue` sur `Section`,
 * qui porte la langue du *contenu* rédigé, pas celle de l'écran) ni de
 * grille de densité paramétrable n'existe dans le code : les construire à
 * moitié produirait un sélecteur qui ne change rien, ce que ce projet
 * interdit explicitement (jamais une capacité de façade).
 */
export const usePreferencesAffichageStore = defineStore('preferencesAffichage', () => {
  const theme = ref<ThemeAffichage>(lireTheme())
  const police = ref<PoliceAffichage>(lirePolice())

  function appliquerTheme(valeur: ThemeAffichage): void {
    const racine = document.documentElement
    if (valeur === 'systeme') {
      delete racine.dataset.theme
      return
    }
    racine.dataset.theme = valeur
  }

  function appliquerPolice(valeur: PoliceAffichage): void {
    document.documentElement.style.setProperty('--vp-police', PILES_POLICE[valeur])
  }

  function definirTheme(valeur: ThemeAffichage): void {
    theme.value = valeur
    try {
      localStorage.setItem(CLE_THEME, valeur)
    } catch {
      // Stockage indisponible — la préférence reste valide pour la session en cours.
    }
  }

  function definirPolice(valeur: PoliceAffichage): void {
    police.value = valeur
    try {
      localStorage.setItem(CLE_POLICE, valeur)
    } catch {
      // Stockage indisponible — la préférence reste valide pour la session en cours.
    }
  }

  // `flush: 'sync'` : applique le thème/la police au DOM immédiatement au
  // changement, jamais différé au prochain tick (évite un flash de l'ancien
  // thème le temps que Vue vide sa file d'attente de rendu).
  watch(theme, appliquerTheme, { immediate: true, flush: 'sync' })
  watch(police, appliquerPolice, { immediate: true, flush: 'sync' })

  return { theme, police, definirTheme, definirPolice }
})

function lireTheme(): ThemeAffichage {
  try {
    const valeur = localStorage.getItem(CLE_THEME)
    return valeur === 'clair' || valeur === 'sombre' || valeur === 'systeme' ? valeur : 'systeme'
  } catch {
    return 'systeme'
  }
}

function lirePolice(): PoliceAffichage {
  try {
    const valeur = localStorage.getItem(CLE_POLICE)
    return valeur === 'systeme' || valeur === 'serif' ? valeur : 'systeme'
  } catch {
    return 'systeme'
  }
}

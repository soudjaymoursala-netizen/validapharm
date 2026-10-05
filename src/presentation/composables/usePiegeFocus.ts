import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue'

const FOCALISABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Gestion du focus d'une fenêtre modale (audit UX du 25/09/2026,
 * constat 15 : `aria-modal` était posé mais le focus restait sur la page,
 * Tab parcourait l'arrière-plan et Échap ne fermait rien).
 *
 * - à l'ouverture, focus sur le premier champ de la fenêtre ;
 * - Tab et Maj+Tab restent dans la fenêtre ;
 * - Échap appelle `fermer` ;
 * - à la fermeture, le focus revient sur l'élément qui l'avait ouverte.
 */
export function usePiegeFocus(conteneur: Ref<HTMLElement | null>, fermer: () => void): void {
  let declencheur: HTMLElement | null = null

  function elementsFocalisables(): HTMLElement[] {
    return Array.from(conteneur.value?.querySelectorAll<HTMLElement>(FOCALISABLES) ?? [])
  }

  function surTouche(evenement: KeyboardEvent): void {
    if (evenement.key === 'Escape') {
      evenement.preventDefault()
      fermer()
      return
    }
    if (evenement.key !== 'Tab') return
    const elements = elementsFocalisables()
    const premier = elements[0]
    const dernier = elements[elements.length - 1]
    if (!premier || !dernier) {
      evenement.preventDefault()
      return
    }
    const actif = document.activeElement
    if (evenement.shiftKey && (actif === premier || !conteneur.value?.contains(actif))) {
      evenement.preventDefault()
      dernier.focus()
    } else if (!evenement.shiftKey && (actif === dernier || !conteneur.value?.contains(actif))) {
      evenement.preventDefault()
      premier.focus()
    }
  }

  onMounted(async () => {
    declencheur = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.addEventListener('keydown', surTouche)
    await nextTick()
    const champ =
      conteneur.value?.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
      ) ?? elementsFocalisables()[0]
    champ?.focus()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', surTouche)
    if (declencheur?.isConnected) declencheur.focus()
  })
}

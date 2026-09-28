import { ref } from 'vue'

/**
 * Un seul envoi à la fois pour un formulaire ou un bouton (audit
 * d'intégrité M2 : deux clics dans le même instant créaient deux
 * évaluations). Tant qu'un envoi est en cours, un nouvel appel est ignoré ;
 * `enCours` sert à désactiver le bouton. L'erreur éventuelle est remontée
 * à l'appelant (et, faute de gestion, au bandeau global).
 */
export function useEnvoiUnique() {
  const enCours = ref(false)

  async function executer<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (enCours.value) return undefined
    enCours.value = true
    try {
      return await action()
    } finally {
      enCours.value = false
    }
  }

  return { enCours, executer }
}

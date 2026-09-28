import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ErreurGlobale {
  id: number
  message: string
}

/**
 * Filet global des erreurs non gérées (audit d'intégrité M1) : environ 60
 * gestionnaires d'écriture laissaient passer l'exception d'un store (refus
 * du serveur, panne réseau) sans aucun message à l'écran — l'utilisateur
 * croyait avoir enregistré, ou recliquait. `main.ts` branche ce store sur
 * `app.config.errorHandler` et `unhandledrejection` ; `CoquilleApplication`
 * affiche les messages. Un gestionnaire qui gère lui-même son erreur (la
 * plupart des formulaires) n'y arrive jamais.
 */
export const useErreursGlobalesStore = defineStore('erreursGlobales', () => {
  const erreurs = ref<ErreurGlobale[]>([])
  let prochainId = 1

  function signaler(erreur: unknown): void {
    const brut = erreur instanceof Error ? erreur.message : String(erreur ?? '')
    const message = brut.trim() || 'Une action a échoué sans message du serveur.'
    // Même message déjà affiché : pas de doublon (plusieurs clics, plusieurs appels).
    if (erreurs.value.some((e) => e.message === message)) return
    erreurs.value = [...erreurs.value.slice(-2), { id: prochainId++, message }]
  }

  function fermer(id: number): void {
    erreurs.value = erreurs.value.filter((e) => e.id !== id)
  }

  function toutFermer(): void {
    erreurs.value = []
  }

  return { erreurs, signaler, fermer, toutFermer }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  genererSel,
  hacherMotDePasse,
  verifierMotDePasse,
} from '../../logique-metier/securite/verrouLocal'
import { db, type EnregistrementProfilLocal } from '../../persistance/db'

const IDENTIFIANT_ENREGISTREMENT_UNIQUE = 'unique'

export interface DefinirProfilInput {
  nom: string
  prenom: string
  email: string
  visa: string
  motDePasse: string
}

/**
 * Store du profil utilisateur local (§4.31/URS-F-310bis, TD-033) — un
 * enregistrement unique par installation, pas un compte multi-utilisateur.
 * Porte le verrou de confirmation (mot de passe haché localement, jamais
 * une authentification ni une signature électronique — voir
 * `verrouLocal.ts` et TD-011/TD-033) requis pour archiver un client/projet.
 *
 * @requirement URS-F-310bis, TD-033
 */
export const useProfilLocalStore = defineStore('profilLocal', () => {
  const profil = ref<EnregistrementProfilLocal | null>(null)
  const enChargement = ref(false)

  async function charger(): Promise<void> {
    enChargement.value = true
    try {
      profil.value = (await db.profilLocal.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)) ?? null
    } finally {
      enChargement.value = false
    }
  }

  /**
   * Crée le profil s'il n'existe pas encore. Pour le modifier, l'appelant
   * DOIT avoir déjà vérifié le mot de passe actuel via
   * `verifierMotDePasseActuel` — cette fonction ne le revérifie pas
   * elle-même (séparation des responsabilités, cohérente avec le reste de
   * l'app : les gardes-fous sont explicites côté appelant, jamais cachés).
   */
  async function definirProfil(input: DefinirProfilInput): Promise<EnregistrementProfilLocal> {
    const sel = genererSel()
    const motDePasseHash = await hacherMotDePasse(input.motDePasse, sel)
    const maintenant = new Date().toISOString()
    const enregistrement: EnregistrementProfilLocal = {
      id: IDENTIFIANT_ENREGISTREMENT_UNIQUE,
      nom: input.nom,
      prenom: input.prenom,
      email: input.email,
      visa: input.visa,
      motDePasseHash,
      motDePasseSel: sel,
      created_at: profil.value?.created_at ?? maintenant,
      updated_at: maintenant,
    }
    await db.profilLocal.put(enregistrement)
    profil.value = enregistrement
    return enregistrement
  }

  /** `false` si aucun profil n'existe encore — jamais une exception. */
  async function verifierMotDePasseActuel(motDePasse: string): Promise<boolean> {
    if (!profil.value) return false
    return verifierMotDePasse(motDePasse, profil.value.motDePasseSel, profil.value.motDePasseHash)
  }

  return { profil, enChargement, charger, definirProfil, verifierMotDePasseActuel }
})

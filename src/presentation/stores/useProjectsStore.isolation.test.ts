import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from './useAuthStore'
import { useProjectsStore } from './useProjectsStore'

/**
 * Isolation des comptes non-admin — un compte créé par un admin pour un
 * collaborateur/testeur ne doit jamais voir, par défaut, les projets
 * préexistants de l'admin qui a créé son compte. Reproduit un vrai
 * enchaînement bout en bout (admin connecté → crée un projet → crée un
 * compte utilisateur → l'utilisateur se connecte) plutôt que de mocker
 * `useAuthStore` directement, pour exercer la vraie résolution
 * d'identité (`resoudreIdentiteCourante`/`identifiantActeurCourant`).
 */
describe('useProjectsStore — isolation des comptes non-admin', () => {
  let demonterFauxWorker: () => void

  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.projects.clear()
    await reinitialiserAuthDeTest()
    demonterFauxWorker = installerFauxWorkerAuth().demonter
  })

  afterEach(async () => {
    demonterFauxWorker()
    await reinitialiserAuthDeTest()
  })

  async function creerCompteUtilisateur(email: string, motDePasse: string): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) throw new Error('session admin absente en préparation de test')
    const resultat = await api.creerUtilisateur(authStore.jeton, {
      email,
      motDePasse,
      nom: 'Test',
      prenom: 'Collègue',
      role: 'utilisateur',
    })
    if (!resultat.ok) throw new Error(`création du compte a échoué : ${resultat.erreur}`)
  }

  test("un nouveau compte non-admin ne voit aucun projet de l'admin qui a créé son compte", async () => {
    await connecterAdminDeTest()
    const projets = useProjectsStore()
    const projetAdmin = await projets.creerProjet({
      name: 'Projet de l’admin',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })
    expect(projetAdmin.owner_id).toBe('admin@pharmatech.example')

    await creerCompteUtilisateur('collegue@ex.com', 'MotDePasse!2026')
    const resultatLogin = await useAuthStore().login('collegue@ex.com', 'MotDePasse!2026')
    expect(resultatLogin.ok).toBe(true)

    await projets.chargerProjets()
    expect(projets.projects).toHaveLength(0)
    expect(await projets.obtenirProjet(projetAdmin.id)).toBeUndefined()
  })

  test('un projet explicitement partagé redevient visible pour le compte partagé', async () => {
    await connecterAdminDeTest()
    const projets = useProjectsStore()
    const projetAdmin = await projets.creerProjet({
      name: 'Projet partagé',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })
    await projets.partagerProjet(projetAdmin.id, 'collegue@ex.com', 'lecture')
    await creerCompteUtilisateur('collegue@ex.com', 'MotDePasse!2026')

    await useAuthStore().login('collegue@ex.com', 'MotDePasse!2026')
    await projets.chargerProjets()

    expect(projets.projects.map((p) => p.id)).toEqual([projetAdmin.id])
    expect(await projets.obtenirProjet(projetAdmin.id)).toMatchObject({ id: projetAdmin.id })
  })

  test('un projet créé par le compte non-admin lui reste visible, et à lui seul', async () => {
    await connecterAdminDeTest()
    await creerCompteUtilisateur('collegue@ex.com', 'MotDePasse!2026')

    await useAuthStore().login('collegue@ex.com', 'MotDePasse!2026')
    const projets = useProjectsStore()
    const projetCollegue = await projets.creerProjet({
      name: 'Projet du collègue',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })
    expect(projetCollegue.owner_id).toBe('collegue@ex.com')

    await projets.chargerProjets()
    expect(projets.projects.map((p) => p.id)).toEqual([projetCollegue.id])
  })

  test('un compte admin continue de tout voir, sans régression', async () => {
    await connecterAdminDeTest()
    const projets = useProjectsStore()
    const projetAdmin = await projets.creerProjet({
      name: 'Projet admin',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })
    await creerCompteUtilisateur('collegue@ex.com', 'MotDePasse!2026')
    await useAuthStore().login('collegue@ex.com', 'MotDePasse!2026')
    const projetCollegue = await projets.creerProjet({
      name: 'Projet collègue',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: null,
    })

    // Deuxième connexion comme admin : `connecterAdminDeTest` ne peut être
    // rappelée (le bootstrap-admin est à usage unique) — on se reconnecte
    // directement avec les identifiants déjà créés par le premier appel.
    await useAuthStore().login('admin@pharmatech.example', 'CoffreFort!2026')
    await projets.chargerProjets()
    expect(projets.projects.map((p) => p.id).sort()).toEqual(
      [projetAdmin.id, projetCollegue.id].sort(),
    )
  })
})

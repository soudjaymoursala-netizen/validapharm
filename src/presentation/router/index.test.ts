import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useAuthStore } from '../stores/useAuthStore'
import { router } from './index'

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await router.push('/')
})

afterEach(() => {
  demonter()
})

describe('garde de routeur globale', () => {
  test('non connecté : une route protégée redirige vers /connexion avec ?redirect=', async () => {
    await router.push('/clients')
    expect(router.currentRoute.value.name).toBe('connexion')
    expect(router.currentRoute.value.query.redirect).toBe('/clients')
  })

  test('/connexion et /configuration restent atteignables sans session', async () => {
    await router.push('/connexion')
    expect(router.currentRoute.value.name).toBe('connexion')

    await router.push('/configuration')
    expect(router.currentRoute.value.name).toBe('configuration-client')
  })

  test('connecté : une route protégée est atteignable', async () => {
    await connecterAdminDeTest()
    await router.push('/clients')
    expect(router.currentRoute.value.name).toBe('gestion-clients')
  })

  test('/admin/utilisateurs est réservée au rôle admin — un utilisateur non-admin est renvoyé à l’accueil', async () => {
    await connecterAdminDeTest()
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) throw new Error('préparation de test échouée')
    await api.creerUtilisateur(authStore.jeton, {
      email: 'employe@pharmatech.example',
      motDePasse: 'MotDePasse!1',
      nom: 'Dupont',
      prenom: 'Alice',
      role: 'utilisateur',
    })
    await authStore.deconnecter()
    await authStore.login('employe@pharmatech.example', 'MotDePasse!1')

    await router.push('/admin/utilisateurs')
    expect(router.currentRoute.value.name).toBe('accueil')
  })

  test('/admin/utilisateurs est atteignable pour un admin', async () => {
    await connecterAdminDeTest()
    await router.push('/admin/utilisateurs')
    expect(router.currentRoute.value.name).toBe('admin-utilisateurs')
  })
})

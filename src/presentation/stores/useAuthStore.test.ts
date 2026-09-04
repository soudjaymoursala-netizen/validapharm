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
import { useConnexionAuthentificationStore } from './useConnexionAuthentificationStore'

let demonter: () => void

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
})

afterEach(() => {
  demonter()
})

describe('useAuthStore (TD-046)', () => {
  test('login réussi peuple utilisateur/jeton et persiste la session', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const store = useAuthStore()

    expect(store.estConnecte).toBe(true)
    expect(store.estAdmin).toBe(true)
    expect(store.utilisateur?.email).toBe('admin@pharmatech.example')

    const session = await db.sessionAuthentification.get('unique')
    expect(session?.jeton).toBe(store.jeton)
  })

  test('login avec un mauvais mot de passe renvoie { ok: false }, ne connecte pas', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    await useAuthStore().deconnecter()

    const resultat = await useAuthStore().login('admin@pharmatech.example', 'mauvais')
    expect(resultat).toEqual({ ok: false, erreur: 'identifiants_invalides' })
    expect(useAuthStore().estConnecte).toBe(false)
  })

  test('login sans relais configuré renvoie relais_non_configure', async () => {
    const resultat = await useAuthStore().login('q@example.com', 'x')
    expect(resultat).toEqual({ ok: false, erreur: 'relais_non_configure' })
  })

  test('charger() relit une session déjà persistée (survit à un rechargement)', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const jetonAvant = useAuthStore().jeton

    setActivePinia(createPinia())
    const store2 = useAuthStore()
    expect(store2.sessionInitialisee).toBe(false)
    await store2.charger()
    expect(store2.sessionInitialisee).toBe(true)
    expect(store2.jeton).toBe(jetonAvant)
    expect(store2.estConnecte).toBe(true)
  })

  test('deconnecter() efface état et session persistée', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    await useAuthStore().deconnecter()

    expect(useAuthStore().estConnecte).toBe(false)
    expect(useAuthStore().utilisateur).toBeNull()
    expect(await db.sessionAuthentification.get('unique')).toBeUndefined()
  })

  test('verifierMotDePasse confirme le vrai mot de passe, infirme un mauvais', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const store = useAuthStore()

    expect(await store.verifierMotDePasse('CoffreFort!2026')).toBe(true)
    expect(await store.verifierMotDePasse('mauvais')).toBe(false)
  })

  test('modifierProfil met à jour nom/prénom et la session persistée', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const store = useAuthStore()

    const ok = await store.modifierProfil({ nom: 'Nouveau', prenom: 'Prénom' })
    expect(ok).toBe(true)
    expect(store.utilisateur?.nom).toBe('Nouveau')
    expect(store.utilisateur?.prenom).toBe('Prénom')

    const session = await db.sessionAuthentification.get('unique')
    expect(session?.utilisateur.nom).toBe('Nouveau')
  })

  test('changerMotDePasse échoue avec le mauvais mot de passe actuel', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const resultat = await useAuthStore().changerMotDePasse('mauvais', 'NouveauMdp!99')
    expect(resultat).toEqual({ ok: false, erreur: 'mot_de_passe_actuel_incorrect' })
  })

  test('changerMotDePasse réussi permet une reconnexion avec le nouveau mot de passe', async () => {
    await connecterAdminDeTest('admin@pharmatech.example', 'CoffreFort!2026')
    const resultat = await useAuthStore().changerMotDePasse('CoffreFort!2026', 'NouveauMdp!99')
    expect(resultat).toEqual({ ok: true })

    await useAuthStore().deconnecter()
    const relogin = await useAuthStore().login('admin@pharmatech.example', 'NouveauMdp!99')
    expect(relogin.ok).toBe(true)
  })

  test('client() renvoie null tant qu’aucun relais n’est configuré', async () => {
    expect(await useAuthStore().client()).toBeNull()
    await useConnexionAuthentificationStore().enregistrer({
      relayUrl: 'https://auth-test.workers.dev',
    })
    expect(await useAuthStore().client()).not.toBeNull()
  })
})

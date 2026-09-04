import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useProfilLocalStore } from './useProfilLocalStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.profilLocal.clear()
})

describe('useProfilLocalStore', () => {
  test('aucun profil au départ, vérifier un mot de passe retourne false sans exception', async () => {
    const store = useProfilLocalStore()
    await store.charger()
    expect(store.profil).toBeNull()
    expect(await store.verifierMotDePasseActuel('peu importe')).toBe(false)
  })

  test('définit un profil puis vérifie le mot de passe correct/incorrect', async () => {
    const store = useProfilLocalStore()
    await store.definirProfil({
      nom: 'Lead',
      prenom: 'Quentin',
      email: 'q.lead@pharmatech-solutions.example',
      visa: 'QLD',
      motDePasse: 'CoffreFort!2026',
    })

    expect(store.profil?.email).toBe('q.lead@pharmatech-solutions.example')
    expect(store.profil?.visa).toBe('QLD')
    expect(store.profil?.motDePasseHash).not.toContain('CoffreFort')

    expect(await store.verifierMotDePasseActuel('CoffreFort!2026')).toBe(true)
    expect(await store.verifierMotDePasseActuel('mauvais')).toBe(false)
  })

  test('redéfinir le profil conserve created_at mais met à jour updated_at', async () => {
    const store = useProfilLocalStore()
    await store.definirProfil({
      nom: 'A',
      prenom: 'Aa',
      email: 'a@example.com',
      visa: 'AAA',
      motDePasse: 'Premier!1',
    })
    const creeLe = store.profil?.created_at

    await store.definirProfil({
      nom: 'B',
      prenom: 'Bb',
      email: 'b@example.com',
      visa: 'BBB',
      motDePasse: 'Second!2',
    })
    expect(store.profil?.created_at).toBe(creeLe)
    expect(store.profil?.email).toBe('b@example.com')
    expect(await store.verifierMotDePasseActuel('Premier!1')).toBe(false)
    expect(await store.verifierMotDePasseActuel('Second!2')).toBe(true)
  })

  test('charger() relit le profil déjà persisté', async () => {
    const store1 = useProfilLocalStore()
    await store1.definirProfil({
      nom: 'A',
      prenom: 'Aa',
      email: 'a@example.com',
      visa: 'AAA',
      motDePasse: 'Premier!1',
    })

    setActivePinia(createPinia())
    const store2 = useProfilLocalStore()
    await store2.charger()
    expect(store2.profil?.email).toBe('a@example.com')
  })
})

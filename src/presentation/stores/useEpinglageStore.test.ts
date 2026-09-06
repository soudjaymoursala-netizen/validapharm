import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useEpinglageStore } from './useEpinglageStore'

const RACCOURCI_ARCHITECTURE = {
  id: 'structure-systeme:client-1',
  libelle: 'Architecture — Comores Pharma',
  routeName: 'structure-systeme',
  routeParams: { clientId: 'client-1' },
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useEpinglageStore', () => {
  test('aucun raccourci épinglé par défaut', () => {
    const store = useEpinglageStore()
    expect(store.raccourcis).toEqual([])
    expect(store.estEpingle(RACCOURCI_ARCHITECTURE.id)).toBe(false)
  })

  test('epingler ajoute le raccourci et persiste en localStorage', () => {
    const store = useEpinglageStore()
    store.epingler(RACCOURCI_ARCHITECTURE)

    expect(store.raccourcis).toEqual([RACCOURCI_ARCHITECTURE])
    expect(store.estEpingle(RACCOURCI_ARCHITECTURE.id)).toBe(true)
    const brut = localStorage.getItem('validapharm.raccourcis_epingles')
    expect(brut).not.toBeNull()
    expect(JSON.parse(brut ?? '[]')).toEqual([RACCOURCI_ARCHITECTURE])
  })

  test('epingler un raccourci déjà épinglé ne le duplique pas', () => {
    const store = useEpinglageStore()
    store.epingler(RACCOURCI_ARCHITECTURE)
    store.epingler(RACCOURCI_ARCHITECTURE)

    expect(store.raccourcis).toHaveLength(1)
  })

  test('desepingler retire le raccourci', () => {
    const store = useEpinglageStore()
    store.epingler(RACCOURCI_ARCHITECTURE)
    store.desepingler(RACCOURCI_ARCHITECTURE.id)

    expect(store.raccourcis).toEqual([])
    expect(store.estEpingle(RACCOURCI_ARCHITECTURE.id)).toBe(false)
  })

  test('basculer épingle si absent, désépingle si présent', () => {
    const store = useEpinglageStore()
    store.basculer(RACCOURCI_ARCHITECTURE)
    expect(store.estEpingle(RACCOURCI_ARCHITECTURE.id)).toBe(true)

    store.basculer(RACCOURCI_ARCHITECTURE)
    expect(store.estEpingle(RACCOURCI_ARCHITECTURE.id)).toBe(false)
  })

  test('recharge les raccourcis déjà persistés à la (re)création du store', () => {
    let store = useEpinglageStore()
    store.epingler(RACCOURCI_ARCHITECTURE)

    setActivePinia(createPinia())
    store = useEpinglageStore()

    expect(store.raccourcis).toEqual([RACCOURCI_ARCHITECTURE])
  })
})

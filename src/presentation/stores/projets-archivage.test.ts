import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useProjectsStore } from './useProjectsStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.projects.clear()
})

async function creerProjet() {
  const store = useProjectsStore()
  return store.creerProjet({
    name: 'Projet A',
    context: '',
    scope_in: '',
    scope_out: '',
    deadline: null,
    language_default: 'fr',
    client_id: null,
  })
}

describe('useProjectsStore — archivage (§4.31/URS-F-310, TD-033)', () => {
  test('un projet créé est actif, apparaît dans projetsActifs et pas dans projetsArchives', async () => {
    const store = useProjectsStore()
    const projet = await creerProjet()

    expect(projet.statut).toBe('actif')
    expect(store.projetsActifs.map((p) => p.id)).toContain(projet.id)
    expect(store.projetsArchives.map((p) => p.id)).not.toContain(projet.id)
  })

  test('archiverProjet bascule le statut, jamais une suppression physique (ALCOA+)', async () => {
    const store = useProjectsStore()
    const projet = await creerProjet()

    const resultat = await store.archiverProjet(projet.id, 'QLD (q.lead@pharmatech.example)')
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.statut).toBe('archive')
    expect(resultat.archived_at).not.toBeNull()
    expect(resultat.archived_by).toBe('QLD (q.lead@pharmatech.example)')
    expect(resultat.audit_log.at(-1)?.action).toBe('archivage')

    const enBase = await db.projects.get(projet.id)
    expect(enBase).toBeDefined()
    expect(enBase?.statut).toBe('archive')

    expect(store.projetsActifs.map((p) => p.id)).not.toContain(projet.id)
    expect(store.projetsArchives.map((p) => p.id)).toContain(projet.id)
  })

  test('archiverProjet refuse un projet déjà archivé', async () => {
    const store = useProjectsStore()
    const projet = await creerProjet()
    await store.archiverProjet(projet.id, 'QLD')

    expect(await store.archiverProjet(projet.id, 'QLD')).toEqual({ erreur: 'deja_archive' })
  })

  test('archiverProjet refuse un projet introuvable', async () => {
    const store = useProjectsStore()
    expect(await store.archiverProjet('inconnu', 'QLD')).toEqual({ erreur: 'introuvable' })
  })

  test('desarchiverProjet restaure un projet archivé, tracé dans audit_log', async () => {
    const store = useProjectsStore()
    const projet = await creerProjet()
    await store.archiverProjet(projet.id, 'QLD')

    const resultat = await store.desarchiverProjet(projet.id, 'QLD')
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.statut).toBe('actif')
    expect(resultat.archived_at).toBeNull()
    expect(resultat.archived_by).toBeNull()
    expect(resultat.audit_log.at(-1)?.action).toBe('désarchivage')
  })

  test('desarchiverProjet refuse un projet déjà actif', async () => {
    const store = useProjectsStore()
    const projet = await creerProjet()
    expect(await store.desarchiverProjet(projet.id, 'QLD')).toEqual({ erreur: 'deja_actif' })
  })
})

describe('useProjectsStore — partage de projet (Phase 37, TD-044)', () => {
  test("un projet créé sans profil local a pour owner_id l'espace réservé Phase 1", async () => {
    const projet = await creerProjet()
    expect(projet.owner_id).toBe('utilisateur-local-phase1')
    expect(projet.shared_with).toEqual([])
  })

  test('partagerProjet ajoute un utilisateur avec un niveau d’accès, tracé dans audit_log', async () => {
    const store = useProjectsStore()
    const projet = await creerProjet()

    const resultat = await store.partagerProjet(projet.id, 'bob@ex.com', 'édition')
    expect('erreur' in resultat).toBe(false)
    if ('erreur' in resultat) return

    expect(resultat.shared_with).toEqual([{ user_id: 'bob@ex.com', access_level: 'édition' }])
    expect(resultat.audit_log.at(-1)?.action).toContain('partage_ajoute')
  })

  test('partagerProjet deux fois pour le même utilisateur met à jour le niveau, jamais un doublon', async () => {
    const store = useProjectsStore()
    const projet = await creerProjet()

    await store.partagerProjet(projet.id, 'bob@ex.com', 'lecture')
    const resultat = await store.partagerProjet(projet.id, 'bob@ex.com', 'édition')
    if ('erreur' in resultat) throw new Error('unreachable')

    expect(resultat.shared_with).toEqual([{ user_id: 'bob@ex.com', access_level: 'édition' }])
  })

  test('retirerPartage retire un utilisateur, le projet reste lisible (statut inchangé)', async () => {
    const store = useProjectsStore()
    const projet = await creerProjet()
    await store.partagerProjet(projet.id, 'bob@ex.com', 'édition')

    const resultat = await store.retirerPartage(projet.id, 'bob@ex.com')
    if ('erreur' in resultat) throw new Error('unreachable')

    expect(resultat.shared_with).toEqual([])
    expect(resultat.statut).toBe('actif')
  })

  test('partagerProjet refuse un projet introuvable', async () => {
    const store = useProjectsStore()
    expect(await store.partagerProjet('inconnu', 'bob@ex.com', 'lecture')).toEqual({
      erreur: 'introuvable',
    })
  })
})

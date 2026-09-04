import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useProjectDocumentsStore } from './useProjectDocumentsStore'

function creerProjetMinimal(id: string) {
  const maintenant = new Date().toISOString()
  return db.projects.put({
    id,
    name: 'Projet de test',
    context: '',
    scope_in: '',
    scope_out: '',
    deadline: null,
    language_default: 'fr',
    client_id: null,
    sections: [],
    documents: [],
    links: [],
    statut: 'actif',
    owner_id: 'utilisateur-local-phase1',
    shared_with: [],
    archived_at: null,
    archived_by: null,
    audit_log: [],
    created_at: maintenant,
    updated_at: maintenant,
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.projectDocuments.clear()
  await db.projects.clear()
})

describe('useProjectDocumentsStore — importerDocument', () => {
  test('accepte un fichier de n’importe quel format et le marque toujours "référence de travail, non maître"', async () => {
    await creerProjetMinimal('projet-1')
    const store = useProjectDocumentsStore()
    await store.charger('projet-1')
    const fichier = new File(['contenu binaire'], 'manuel-fournisseur.pdf', {
      type: 'application/pdf',
    })

    const document = await store.importerDocument('projet-1', fichier, 'utilisateur-local-phase1')

    expect(document.status).toBe('reference_de_travail_non_maitre')
    expect(document.filename).toBe('manuel-fournisseur.pdf')
    expect(document.mime_type).toBe('application/pdf')
    expect(document.content).not.toBeNull()
    expect(store.documents).toHaveLength(1)

    const relu = await db.projectDocuments.get(document.id)
    expect(relu?.status).toBe('reference_de_travail_non_maitre')
  })

  test('accepte un format sans type MIME connu (mime_type vide, jamais fabriqué)', async () => {
    await creerProjetMinimal('projet-1')
    const store = useProjectDocumentsStore()
    await store.charger('projet-1')
    const fichier = new File(['x'], 'schema.dwg', { type: '' })

    const document = await store.importerDocument('projet-1', fichier, 'utilisateur-local-phase1')

    expect(document.mime_type).toBe('')
    expect(document.filename).toBe('schema.dwg')
  })

  test('ajoute l’id du document à project.documents et journalise l’ajout', async () => {
    await creerProjetMinimal('projet-1')
    const store = useProjectDocumentsStore()
    await store.charger('projet-1')
    const fichier = new File(['x'], 'photo-installation.jpg', { type: 'image/jpeg' })

    const document = await store.importerDocument('projet-1', fichier, 'utilisateur-local-phase1')

    const projet = await db.projects.get('projet-1')
    expect(projet?.documents).toContain(document.id)
    expect(projet?.audit_log.at(-1)?.action).toBe('ajout_document')
  })

  test('isolation stricte par projet', async () => {
    await creerProjetMinimal('projet-A')
    await creerProjetMinimal('projet-B')
    const store = useProjectDocumentsStore()

    await store.charger('projet-A')
    await store.importerDocument(
      'projet-A',
      new File(['x'], 'doc-a.pdf', { type: 'application/pdf' }),
      'utilisateur-local-phase1',
    )

    await store.charger('projet-B')
    expect(store.documents).toHaveLength(0)

    await store.charger('projet-A')
    expect(store.documents).toHaveLength(1)
  })
})

describe('useProjectDocumentsStore — supprimerDocument', () => {
  test('retire le document de la liste et de la base', async () => {
    await creerProjetMinimal('projet-1')
    const store = useProjectDocumentsStore()
    await store.charger('projet-1')
    const document = await store.importerDocument(
      'projet-1',
      new File(['x'], 'a-supprimer.pdf', { type: 'application/pdf' }),
      'utilisateur-local-phase1',
    )

    await store.supprimerDocument(document.id)

    expect(store.documents).toHaveLength(0)
    expect(await db.projectDocuments.get(document.id)).toBeUndefined()
  })
})

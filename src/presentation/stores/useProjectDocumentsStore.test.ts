import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useProjectDocumentsStore } from './useProjectDocumentsStore'
import { useProjectsStore } from './useProjectsStore'

let demonter: () => void

async function creerProjetMinimal(): Promise<string> {
  const projet = await useProjectsStore().creerProjet({
    name: 'Projet de test',
    context: '',
    scope_in: '',
    scope_out: '',
    deadline: null,
    language_default: 'fr',
    client_id: null,
  })
  return projet.id
}

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  demonter = installerFauxWorkerAuth().demonter
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
})

describe('useProjectDocumentsStore — importerDocument', () => {
  test('accepte un fichier de n’importe quel format et le marque toujours "référence de travail, non maître"', async () => {
    const projectId = await creerProjetMinimal()
    const store = useProjectDocumentsStore()
    await store.charger(projectId)
    const fichier = new File(['contenu binaire'], 'manuel-fournisseur.pdf', {
      type: 'application/pdf',
    })

    const document = await store.importerDocument(projectId, fichier, 'admin@pharmatech.example')

    expect(document.status).toBe('reference_de_travail_non_maitre')
    expect(document.filename).toBe('manuel-fournisseur.pdf')
    expect(document.mime_type).toBe('application/pdf')
    expect(document.has_binary_content).toBe(true)
    expect(store.documents).toHaveLength(1)

    await store.charger(projectId)
    expect(store.documents[0]?.status).toBe('reference_de_travail_non_maitre')
  })

  test('accepte un format sans type MIME connu (mime_type vide, jamais fabriqué)', async () => {
    const projectId = await creerProjetMinimal()
    const store = useProjectDocumentsStore()
    await store.charger(projectId)
    const fichier = new File(['x'], 'schema.dwg', { type: '' })

    const document = await store.importerDocument(projectId, fichier, 'admin@pharmatech.example')

    expect(document.mime_type).toBe('')
    expect(document.filename).toBe('schema.dwg')
  })

  test('ajoute l’id du document à project.documents et journalise l’ajout', async () => {
    const projectId = await creerProjetMinimal()
    const store = useProjectDocumentsStore()
    await store.charger(projectId)
    const fichier = new File(['x'], 'photo-installation.jpg', { type: 'image/jpeg' })

    const document = await store.importerDocument(projectId, fichier, 'admin@pharmatech.example')

    const projet = await useProjectsStore().obtenirProjet(projectId)
    expect(projet?.documents).toContain(document.id)
    expect(projet?.audit_log.at(-1)?.action).toBe('ajout_document')
  })

  test('isolation stricte par projet', async () => {
    const projectIdA = await creerProjetMinimal()
    const projectIdB = await creerProjetMinimal()
    const store = useProjectDocumentsStore()

    await store.charger(projectIdA)
    await store.importerDocument(
      projectIdA,
      new File(['x'], 'doc-a.pdf', { type: 'application/pdf' }),
      'admin@pharmatech.example',
    )

    await store.charger(projectIdB)
    expect(store.documents).toHaveLength(0)

    await store.charger(projectIdA)
    expect(store.documents).toHaveLength(1)
  })
})

describe('useProjectDocumentsStore — supprimerDocument', () => {
  test('retire le document de la liste et de la base', async () => {
    const projectId = await creerProjetMinimal()
    const store = useProjectDocumentsStore()
    await store.charger(projectId)
    const document = await store.importerDocument(
      projectId,
      new File(['x'], 'a-supprimer.pdf', { type: 'application/pdf' }),
      'admin@pharmatech.example',
    )

    await store.supprimerDocument(document.id)

    expect(store.documents).toHaveLength(0)
    await store.charger(projectId)
    expect(store.documents).toHaveLength(0)
  })
})

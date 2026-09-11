// @vitest-environment node
//
// Comme `routeur.test.ts` (auth-worker) : ce test exerce un vrai import
// binaire (`FormData` + `File`/`Blob`) à travers `installerFauxWorkerAuth`
// → `routerRequete` — sous l'environnement `jsdom` de la config racine, les
// classes `Blob`/`File`/`FormData` de jsdom sont incompatibles avec le
// `Request`/`fetch` natif de Node (undici), corrompant silencieusement le
// contenu binaire transmis. `node` restaure des classes natives cohérentes
// entre elles ; ce store lui-même n'a aucun besoin du DOM.
import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Contexte } from '../../../workers/auth-worker/src/routeur'
import { documentsNormatifsAMigrer } from '../../persistance/db'
import {
  connecterAdminDeTest,
  installerFauxWorkerAuth,
  reinitialiserAuthDeTest,
} from '../../test-utils/fauxWorkerAuth'
import { useConnexionGitHubStore } from './useConnexionGitHubStore'
import { useNormativeDocumentsStore } from './useNormativeDocumentsStore'

/** `btoa` seul n'encode pas correctement l'UTF-8 (un accent produirait un octet tronqué) — encode d'abord en octets UTF-8 réels, comme le fait l'API GitHub. */
function encoderBase64Utf8(texte: string): string {
  const octets = new TextEncoder().encode(texte)
  return btoa(String.fromCharCode(...octets))
}

function reponseMock(corps: unknown, options: { status?: number } = {}): Response {
  const status = options.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
  } as Response
}

// Le dépôt GitHub et la connexion Drive de lecture pour la bibliothèque de
// normes sont désormais des paramètres d'installation stockés côté
// Worker/D1 — `fetchMock` ci-dessous ne sert donc plus qu'aux appels réels
// à l'API GitHub/Drive, jamais à l'authentification/la configuration ni
// aux documents normatifs eux-mêmes (interceptés par
// `installerFauxWorkerAuth`, qui délègue tout le reste à `fetchMock`).
let fetchMock: ReturnType<typeof vi.fn>
let demonter: () => void
let ctx: Contexte

beforeEach(async () => {
  setActivePinia(createPinia())
  await reinitialiserAuthDeTest()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  ;({ ctx, demonter } = installerFauxWorkerAuth())
  await connecterAdminDeTest()
})

afterEach(() => {
  demonter()
  documentsNormatifsAMigrer.length = 0
})

describe('useNormativeDocumentsStore — importerDepuisFichier', () => {
  test('.txt : extraction en texte brut, source "televersement", contenu binaire conservé', async () => {
    const store = useNormativeDocumentsStore()
    const fichier = new File(['Contenu de la norme ICH Q9.'], 'ich-q9.txt', { type: 'text/plain' })

    const document = await store.importerDepuisFichier(fichier, 'iso', 'qa-1')

    expect(document.extracted_text).toBe('Contenu de la norme ICH Q9.')
    expect(document.source).toBe('televersement')
    expect(document.category).toBe('iso')
    expect(document.source_ref).toBeNull()
    expect(document.has_binary_content).toBe(true)
    expect(store.documents).toHaveLength(1)

    const metadonnees = await ctx.documentsNormatifsRepo.parId(document.id)
    expect(metadonnees).toMatchObject({ filename: 'ich-q9.txt' })
  })

  // Le cas ".docx réel" (extraction via `extraireTexteDocx`/`DOMParser`)
  // vit dans `useNormativeDocumentsStore.docx.test.ts`, sous
  // l'environnement `jsdom` par défaut (seul `DOMParser` en a besoin) — ce
  // fichier reste sous `node` pour éviter la corruption binaire
  // Blob/File/FormData décrite en tête de fichier.
})

describe('useNormativeDocumentsStore — GitHub', () => {
  async function configurerConnexionGitHub(): Promise<void> {
    const resultat = await useConnexionGitHubStore().enregistrer({
      owner: 'client-x',
      repo: 'normes',
      branche: 'main',
      jeton: 'jeton-test',
    })
    if (!resultat.ok)
      throw new Error(`préparation de la connexion GitHub échouée : ${resultat.erreur}`)
  }

  test('listerFichiersGitHub : filtre par préfixe de chemin', async () => {
    await configurerConnexionGitHub()
    fetchMock.mockResolvedValueOnce(
      reponseMock({
        tree: [
          { path: 'normes/ich-q9.md', type: 'blob', sha: 's1' },
          { path: 'normes/sous-dossier/annexe.md', type: 'blob', sha: 's2' },
          { path: 'autre/fichier.json', type: 'blob', sha: 's3' },
        ],
      }),
    )
    const store = useNormativeDocumentsStore()

    const fichiers = await store.listerFichiersGitHub('normes/')

    expect(fichiers).toEqual([
      { chemin: 'normes/ich-q9.md', sha: 's1' },
      { chemin: 'normes/sous-dossier/annexe.md', sha: 's2' },
    ])
  })

  test('listerFichiersGitHub : erreur explicite si aucune connexion configurée', async () => {
    const store = useNormativeDocumentsStore()
    await expect(store.listerFichiersGitHub('normes/')).rejects.toThrow(
      'Aucune connexion GitHub configurée',
    )
  })

  test('importerDepuisGitHub : .md accepté, source_ref = chemin, jamais de contenu binaire', async () => {
    await configurerConnexionGitHub()
    fetchMock.mockResolvedValueOnce(
      reponseMock({
        content: encoderBase64Utf8('Texte de la norme importée depuis GitHub.'),
        sha: 'sha-1',
      }),
    )
    const store = useNormativeDocumentsStore()

    const document = await store.importerDepuisGitHub('normes/ich-q9.md', 'iso', 'qa-1')

    expect(document.extracted_text).toBe('Texte de la norme importée depuis GitHub.')
    expect(document.source).toBe('github')
    expect(document.source_ref).toBe('normes/ich-q9.md')
    expect(document.has_binary_content).toBe(false)
  })

  test('importerDepuisGitHub : .pdf refusé (limite assumée, jamais une conversion approximative)', async () => {
    await configurerConnexionGitHub()
    const store = useNormativeDocumentsStore()

    await expect(store.importerDepuisGitHub('normes/annexe.pdf', 'iso', 'qa-1')).rejects.toThrow(
      'Import GitHub limité aux fichiers texte',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('useNormativeDocumentsStore — Drive', () => {
  test('configurerConnexionDriveLectureNormes puis testerConnexionDriveLectureNormes : succès', async () => {
    const store = useNormativeDocumentsStore()
    await store.configurerConnexionDriveLectureNormes('dossier-normes-1', 'jeton-drive')
    fetchMock.mockResolvedValueOnce(reponseMock({ files: [{ id: 'f1' }, { id: 'f2' }] }))

    const resultat = await store.testerConnexionDriveLectureNormes()

    expect(resultat).toEqual({ ok: true, nbFichiers: 2 })
  })

  test('testerConnexionDriveLectureNormes : aucune configuration -> ok false', async () => {
    const store = useNormativeDocumentsStore()
    const resultat = await store.testerConnexionDriveLectureNormes()
    expect(resultat).toEqual({
      ok: false,
      message: 'Aucune configuration Drive enregistrée pour la bibliothèque de normes.',
    })
  })

  test('listerFichiersDrive : erreur explicite si aucune configuration', async () => {
    const store = useNormativeDocumentsStore()
    await expect(store.listerFichiersDrive()).rejects.toThrow(
      'Aucune configuration Drive enregistrée',
    )
  })

  test('importerDepuisDrive : document Google natif -> lireTexteExporte, jamais de contenu binaire', async () => {
    const store = useNormativeDocumentsStore()
    await store.configurerConnexionDriveLectureNormes('dossier-normes-1', 'jeton-drive')
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'Texte exporté du Google Doc normatif.',
    } as Response)

    const document = await store.importerDepuisDrive(
      {
        id: 'doc-1',
        nom: 'Norme interne',
        mimeType: 'application/vnd.google-apps.document',
        modifiedTime: '',
      },
      'iso',
      'qa-1',
    )

    expect(document.extracted_text).toBe('Texte exporté du Google Doc normatif.')
    expect(document.source).toBe('drive')
    expect(document.source_ref).toBe('doc-1')
    expect(document.has_binary_content).toBe(false)
  })

  test('importerDepuisDrive : fichier binaire (.txt) -> telechargerContenu + extraction + contenu binaire conservé', async () => {
    const store = useNormativeDocumentsStore()
    await store.configurerConnexionDriveLectureNormes('dossier-normes-1', 'jeton-drive')
    const binaire = new TextEncoder().encode('Contenu texte téléchargé depuis Drive.').buffer
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => binaire,
    } as Response)

    const document = await store.importerDepuisDrive(
      { id: 'fichier-2', nom: 'guideline.txt', mimeType: 'text/plain', modifiedTime: '' },
      'gmp',
      'qa-1',
    )

    expect(document.extracted_text).toBe('Contenu texte téléchargé depuis Drive.')
    expect(document.has_binary_content).toBe(true)
  })
})

describe('useNormativeDocumentsStore — telechargerContenu', () => {
  test('récupère le contenu binaire d’un document importé, octet pour octet', async () => {
    const store = useNormativeDocumentsStore()
    const octets = new Uint8Array([10, 20, 30, 40])
    const fichier = new File([octets], 'donnees.bin', { type: 'application/octet-stream' })
    const document = await store.importerDepuisFichier(fichier, 'autre', 'qa-1')

    const blob = await store.telechargerContenu(document.id)

    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(octets)
  })
})

describe('useNormativeDocumentsStore — migration des documents locaux (pré-serveur)', () => {
  test('charger() envoie au serveur les documents capturés depuis l’ancienne table locale et vide la file', async () => {
    documentsNormatifsAMigrer.push({
      id: 'doc-ancien-1',
      category: 'iso',
      titre: 'Norme historique',
      filename: 'norme.txt',
      source: 'televersement',
      source_ref: null,
      extracted_text: 'Texte historique',
      content: new Blob(['contenu binaire historique'], { type: 'text/plain' }),
      mime_type: 'text/plain',
      uploaded_at: '2026-01-01T00:00:00.000Z',
      uploaded_by: 'user-ancien',
    })
    const store = useNormativeDocumentsStore()

    await store.charger()

    expect(documentsNormatifsAMigrer).toHaveLength(0)
    expect(store.documents).toHaveLength(1)
    expect(store.documents[0]).toMatchObject({
      titre: 'Norme historique',
      extracted_text: 'Texte historique',
      has_binary_content: true,
    })
  })

  test('charger() sans document en attente : aucun appel superflu, comportement inchangé', async () => {
    const store = useNormativeDocumentsStore()

    await store.charger()

    expect(store.documents).toHaveLength(0)
  })
})

describe('useNormativeDocumentsStore — supprimerDocument', () => {
  test('retire le document de la liste et du Worker', async () => {
    const store = useNormativeDocumentsStore()
    const document = await store.importerDepuisFichier(
      new File(['x'], 'a-supprimer.txt', { type: 'text/plain' }),
      'autre',
      'qa-1',
    )

    await store.supprimerDocument(document.id)

    expect(store.documents).toHaveLength(0)
    expect(await ctx.documentsNormatifsRepo.parId(document.id)).toBeNull()
  })
})

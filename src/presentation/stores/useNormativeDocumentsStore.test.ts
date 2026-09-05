import 'fake-indexeddb/auto'
import JSZip from 'jszip'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { db } from '../../persistance/db'
import { useNormativeDocumentsStore } from './useNormativeDocumentsStore'

/** Même structure OOXML minimale que `DocxNatifAdapter.test.ts` — un `.docx` réellement valide, jamais un fichier texte renommé. */
async function construireDocxMinimal(texte: string): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  )
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  )
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${texte}</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  )
  return zip.generateAsync({ type: 'arraybuffer' })
}

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

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.normativeDocuments.clear()
  await db.connexionGitHub.clear()
  await db.connexionDriveLectureNormes.clear()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useNormativeDocumentsStore — importerDepuisFichier', () => {
  test('.txt : extraction en texte brut, source "televersement"', async () => {
    const store = useNormativeDocumentsStore()
    const fichier = new File(['Contenu de la norme ICH Q9.'], 'ich-q9.txt', { type: 'text/plain' })

    const document = await store.importerDepuisFichier(fichier, 'norme', 'qa-1')

    expect(document.extracted_text).toBe('Contenu de la norme ICH Q9.')
    expect(document.source).toBe('televersement')
    expect(document.category).toBe('norme')
    expect(document.source_ref).toBeNull()
    expect(store.documents).toHaveLength(1)
    expect(await db.normativeDocuments.get(document.id)).toMatchObject({ filename: 'ich-q9.txt' })
  })

  test('.docx réel : dispatch vers extraireTexteDocx', async () => {
    const store = useNormativeDocumentsStore()
    const tampon = await construireDocxMinimal('Guideline GAMP 5 — extrait.')
    const fichier = new File([tampon], 'gamp5.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    const document = await store.importerDepuisFichier(fichier, 'guideline', 'qa-1')

    expect(document.extracted_text).toBe('Guideline GAMP 5 — extrait.')
  })
})

describe('useNormativeDocumentsStore — GitHub', () => {
  function configurerConnexionGitHub() {
    return db.connexionGitHub.put({
      id: 'unique',
      owner: 'client-x',
      repo: 'normes',
      branche: 'main',
      jeton: 'jeton-test',
    })
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

  test('importerDepuisGitHub : .md accepté, source_ref = chemin', async () => {
    await configurerConnexionGitHub()
    fetchMock.mockResolvedValueOnce(
      reponseMock({
        content: encoderBase64Utf8('Texte de la norme importée depuis GitHub.'),
        sha: 'sha-1',
      }),
    )
    const store = useNormativeDocumentsStore()

    const document = await store.importerDepuisGitHub('normes/ich-q9.md', 'norme', 'qa-1')

    expect(document.extracted_text).toBe('Texte de la norme importée depuis GitHub.')
    expect(document.source).toBe('github')
    expect(document.source_ref).toBe('normes/ich-q9.md')
    expect(document.content).toBeNull()
  })

  test('importerDepuisGitHub : .pdf refusé (limite assumée, jamais une conversion approximative)', async () => {
    await configurerConnexionGitHub()
    const store = useNormativeDocumentsStore()

    await expect(store.importerDepuisGitHub('normes/annexe.pdf', 'norme', 'qa-1')).rejects.toThrow(
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

  test('importerDepuisDrive : document Google natif -> lireTexteExporte', async () => {
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
      'norme',
      'qa-1',
    )

    expect(document.extracted_text).toBe('Texte exporté du Google Doc normatif.')
    expect(document.source).toBe('drive')
    expect(document.source_ref).toBe('doc-1')
  })

  test('importerDepuisDrive : fichier binaire (.txt) -> telechargerContenu + extraction', async () => {
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
      'guideline',
      'qa-1',
    )

    expect(document.extracted_text).toBe('Contenu texte téléchargé depuis Drive.')
  })
})

describe('useNormativeDocumentsStore — supprimerDocument', () => {
  test('retire le document de la liste et de la base', async () => {
    const store = useNormativeDocumentsStore()
    const document = await store.importerDepuisFichier(
      new File(['x'], 'a-supprimer.txt', { type: 'text/plain' }),
      'autre',
      'qa-1',
    )

    await store.supprimerDocument(document.id)

    expect(store.documents).toHaveLength(0)
    expect(await db.normativeDocuments.get(document.id)).toBeUndefined()
  })
})

// @vitest-environment node
//
// Comme `useNormativeDocumentsStore.test.ts` : `fake-indexeddb` (via
// structuredClone en interne) ne reconnaît pas le `Blob` de jsdom (l'environnement
// racine) — un `Blob` stocké puis relu revient comme `{}` au lieu d'un vrai
// `Blob`. `node` restaure un `Blob` natif cohérent de bout en bout ; ce
// fichier n'a aucun besoin du DOM.
//
// Documents normatifs (Bibliothèque de normes) : la migration Dexie v33
// supprime la table `normativeDocuments` (désormais côté Worker, D1+R2).
// Ce test vérifie le filet de sécurité — capturer les documents existants
// AVANT la suppression physique de la table — sans lequel un navigateur
// ayant déjà importé des documents localement les perdrait définitivement
// à la première ouverture de l'application avec ce code.
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, expect, test } from 'vitest'
import { documentsNormatifsAMigrer, ValidaPharmDatabase } from './db'

afterEach(() => {
  documentsNormatifsAMigrer.length = 0
})

test('la montée de version 33 capture les documents de l’ancienne table avant sa suppression', async () => {
  const nomBase = `test-migration-normes-${Math.random().toString(36).slice(2)}`

  // Simule un navigateur resté sur l'ancien schéma (avant l'introduction du
  // stockage serveur) : une table `normativeDocuments` avec un document réel,
  // contenu binaire inclus — la forme exacte enregistrée par l'ancien code
  // (`content: Blob | null`, jamais `has_binary_content`).
  const ancienneDb = new Dexie(nomBase)
  ancienneDb.version(32).stores({ normativeDocuments: 'id, category, source' })
  await ancienneDb.open()
  await ancienneDb.table('normativeDocuments').add({
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
  ancienneDb.close()

  expect(documentsNormatifsAMigrer).toHaveLength(0)

  const db = new ValidaPharmDatabase(nomBase)
  await db.open()

  expect(documentsNormatifsAMigrer).toHaveLength(1)
  const capture = documentsNormatifsAMigrer[0]
  expect(capture).toMatchObject({
    id: 'doc-ancien-1',
    titre: 'Norme historique',
    extracted_text: 'Texte historique',
  })
  expect(capture?.content).toBeInstanceOf(Blob)
  expect(await capture?.content?.text()).toBe('contenu binaire historique')

  db.close()
})

test('un navigateur déjà passé par la version 33 (table déjà absente) : aucune capture, ouverture normale', async () => {
  const nomBase = `test-migration-normes-deja-fait-${Math.random().toString(36).slice(2)}`

  const db1 = new ValidaPharmDatabase(nomBase)
  await db1.open()
  db1.close()
  documentsNormatifsAMigrer.length = 0

  const db2 = new ValidaPharmDatabase(nomBase)
  await db2.open()

  expect(documentsNormatifsAMigrer).toHaveLength(0)
  db2.close()
})

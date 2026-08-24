import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { ValidaPharmDatabase } from './db'
import {
  initialiserVersionSchemaSiAbsente,
  verifierCompatibiliteAvantAcces,
  VERSION_SCHEMA_CONNUE,
} from './demarrage'

let db: ValidaPharmDatabase

beforeEach(() => {
  // Nom unique par test pour ne jamais partager d'état entre tests (fake-indexeddb
  // persiste en mémoire pour la durée du process).
  db = new ValidaPharmDatabase(`test-db-${Math.random()}`)
})

describe('verifierCompatibiliteAvantAcces', () => {
  test('base neuve (aucun enregistrement schemaVersion) : accès autorisé', async () => {
    const resultat = await verifierCompatibiliteAvantAcces(db)
    expect(resultat).toEqual({ pretPourAcces: true })
  })

  test('version du dépôt égale à la version connue : accès autorisé', async () => {
    await db.schemaVersion.put({
      id: 'unique',
      version: VERSION_SCHEMA_CONNUE,
      migrated_at: new Date().toISOString(),
    })
    const resultat = await verifierCompatibiliteAvantAcces(db)
    expect(resultat).toEqual({ pretPourAcces: true })
  })

  test('version du dépôt postérieure (rollback applicatif) : accès refusé, U-12', async () => {
    await db.schemaVersion.put({
      id: 'unique',
      version: '99.0.0',
      migrated_at: new Date().toISOString(),
    })
    const resultat = await verifierCompatibiliteAvantAcces(db)
    expect(resultat).toEqual({ pretPourAcces: false, messageCode: 'U-12' })
  })

  test("version du dépôt antérieure (migration requise) : accès autorisé pour l'instant (migration non câblée)", async () => {
    await db.schemaVersion.put({
      id: 'unique',
      version: '0.1.0',
      migrated_at: new Date().toISOString(),
    })
    const resultat = await verifierCompatibiliteAvantAcces(db)
    expect(resultat).toEqual({ pretPourAcces: true })
  })
})

describe('initialiserVersionSchemaSiAbsente', () => {
  test('écrit un enregistrement sur une base neuve', async () => {
    await initialiserVersionSchemaSiAbsente(db)
    const enregistrement = await db.schemaVersion.get('unique')
    expect(enregistrement?.version).toBe(VERSION_SCHEMA_CONNUE)
  })

  test("n'écrase jamais un enregistrement déjà présent", async () => {
    await db.schemaVersion.put({
      id: 'unique',
      version: '0.1.0',
      migrated_at: '2020-01-01T00:00:00.000Z',
    })
    await initialiserVersionSchemaSiAbsente(db)
    const enregistrement = await db.schemaVersion.get('unique')
    expect(enregistrement?.version).toBe('0.1.0')
  })
})

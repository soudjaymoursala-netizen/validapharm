import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useClientConfigStore } from './useClientConfigStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.clientConfigs.clear()
})

describe('useClientConfigStore — charger', () => {
  test('client sans config existante : renvoie une config par défaut (fournisseur claude, rien acquitté)', async () => {
    const store = useClientConfigStore()
    await store.charger('client-1')
    expect(store.config).toEqual({
      client_id: 'client-1',
      ai_provider: 'claude',
      ai_provider_conditions_acquittees: null,
      ai_provider_reliability_qualification: { chat_normatif: null, audit_simule: null },
      export_template_id: null,
      consent_telemetry: { granted: false, date: null, revocable_at_any_time: true },
    })
  })
})

describe('useClientConfigStore — definirFournisseur', () => {
  test('change le fournisseur et réinitialise conditions/qualification (propres à l’ancien fournisseur)', async () => {
    const store = useClientConfigStore()
    await store.acquitterConditions('client-1', 'claude')
    await store.enregistrerQualification('client-1', 'chat_normatif', {
      date: '2026-01-01',
      resultat: 'favorable',
      qualification_test_set_id: 'set-1',
      qualification_test_set_version: '1.0.0',
      moteur_version_qualifiee: 'claude-v1',
    })

    await store.definirFournisseur('client-1', 'openai')
    expect(store.config?.ai_provider).toBe('openai')
    expect(store.config?.ai_provider_conditions_acquittees).toBeNull()
    expect(store.config?.ai_provider_reliability_qualification).toEqual({
      chat_normatif: null,
      audit_simule: null,
    })
  })
})

describe('useClientConfigStore — acquitterConditions', () => {
  test('consigne le fournisseur et un horodatage', async () => {
    const store = useClientConfigStore()
    await store.acquitterConditions('client-1', 'claude')
    expect(store.config?.ai_provider_conditions_acquittees?.fournisseur).toBe('claude')
    expect(store.config?.ai_provider_conditions_acquittees?.date).toBeTruthy()
  })

  test('isolation stricte par client : le client B n’est jamais affecté par un acquittement du client A', async () => {
    const store = useClientConfigStore()
    await store.acquitterConditions('client-A', 'claude')
    await store.charger('client-B')
    expect(store.config?.ai_provider_conditions_acquittees).toBeNull()
  })
})

describe('useClientConfigStore — enregistrerQualification (séparée par mode)', () => {
  test('consigne la qualification complète, y compris moteur_version_qualifiee, pour le mode donné', async () => {
    const store = useClientConfigStore()
    await store.enregistrerQualification('client-1', 'chat_normatif', {
      date: '2026-01-01',
      resultat: 'favorable',
      qualification_test_set_id: 'set-1',
      qualification_test_set_version: '1.0.0',
      moteur_version_qualifiee: 'claude-v1',
    })
    const enBase = await db.clientConfigs.get('client-1')
    expect(enBase?.ai_provider_reliability_qualification.chat_normatif).toEqual({
      date: '2026-01-01',
      resultat: 'favorable',
      qualification_test_set_id: 'set-1',
      qualification_test_set_version: '1.0.0',
      moteur_version_qualifiee: 'claude-v1',
    })
    expect(enBase?.ai_provider_reliability_qualification.audit_simule).toBeNull()
  })

  test('qualifier le mode audit_simule ne modifie jamais la qualification déjà enregistrée pour chat_normatif', async () => {
    const store = useClientConfigStore()
    await store.enregistrerQualification('client-1', 'chat_normatif', {
      date: '2026-01-01',
      resultat: 'favorable',
      qualification_test_set_id: 'set-1',
      qualification_test_set_version: '1.0.0',
      moteur_version_qualifiee: 'claude-v1',
    })
    await store.enregistrerQualification('client-1', 'audit_simule', {
      date: '2026-01-02',
      resultat: 'favorable',
      qualification_test_set_id: 'set-audit-1',
      qualification_test_set_version: '1.0.0',
      moteur_version_qualifiee: 'claude-v1',
    })

    expect(store.config?.ai_provider_reliability_qualification.chat_normatif?.date).toBe(
      '2026-01-01',
    )
    expect(store.config?.ai_provider_reliability_qualification.audit_simule?.date).toBe(
      '2026-01-02',
    )
  })
})

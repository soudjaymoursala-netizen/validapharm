import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useImpactAssessmentStore } from './useImpactAssessmentStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.methodProfilesImpactAssessment.clear()
  await db.evaluationsImpactAssessment.clear()
})

describe('useImpactAssessmentStore — aucun profil configuré', () => {
  test('client sans profil -> profilActif null, évaluation refusée explicitement', async () => {
    const store = useImpactAssessmentStore()
    await store.charger('client-1')
    expect(store.profilActif).toBeNull()

    const resultat = await store.creerEvaluation('client-1', {
      nomElement: 'Automate de conditionnement L-12',
      assetNodeId: null,
      reponses: {},
    })
    expect(resultat).toEqual({ erreur: 'aucun_profil_configure' })
  })
})

describe('useImpactAssessmentStore — creerNouvelleVersion (URS-F-050, F1)', () => {
  test("crée un profil avec les questions du client, mot pour mot, aucune valeur d'origine dans le code", async () => {
    const store = useImpactAssessmentStore()
    await store.charger('client-1')
    const profil = await store.creerNouvelleVersion('client-1', {
      questions: [
        { texte: 'Le système a-t-il un contact direct avec le produit ?' },
        { texte: 'Une défaillance affecte-t-elle des données GxP ?' },
      ],
      source: 'Ferring FSMP Project Master Plan (adapté client)',
      origin: 'procedure_client',
    })
    expect(profil.questions).toHaveLength(2)
    expect(profil.questions[0]?.texte.fr).toBe(
      'Le système a-t-il un contact direct avec le produit ?',
    )
    expect(profil.version).toBe('v1')
    expect(store.profilActif?.id).toBe(profil.id)
  })

  test('une nouvelle version ne mute jamais la précédente (immuabilité)', async () => {
    const store = useImpactAssessmentStore()
    await store.charger('client-1')
    const v1 = await store.creerNouvelleVersion('client-1', {
      questions: [{ texte: 'Question v1 ?' }],
      source: 'Baseline initiale',
      origin: 'defini_utilisateur',
    })
    const v2 = await store.creerNouvelleVersion('client-1', {
      questions: [{ texte: 'Question v1 ?' }, { texte: 'Question v2 ajoutée ?' }],
      source: 'Révision suite audit interne',
      origin: 'defini_utilisateur',
    })

    expect(v1.questions).toHaveLength(1)
    expect(v2.questions).toHaveLength(2)
    expect(store.profilActif?.id).toBe(v2.id)

    const v1Relu = await db.methodProfilesImpactAssessment.get(v1.id)
    expect(v1Relu?.questions).toHaveLength(1)
  })

  test('régression : profilActif reste correct même si deux versions partagent le même created_at (même milliseconde)', async () => {
    const store = useImpactAssessmentStore()
    await store.charger('client-1')
    const memeInstant = new Date().toISOString()
    await db.methodProfilesImpactAssessment.put({
      id: 'v1-id',
      client_id: 'client-1',
      version: 'v1',
      effective_date: memeInstant,
      source: 'Source v1',
      origin: 'defini_utilisateur',
      questions: [{ id: 'q1', texte: { fr: 'Question ?' } }],
      decision_rule: 'au_moins_un_oui_impact_direct',
      created_at: memeInstant,
    })
    await db.methodProfilesImpactAssessment.put({
      id: 'v2-id',
      client_id: 'client-1',
      version: 'v2',
      effective_date: memeInstant,
      source: 'Source v2',
      origin: 'defini_utilisateur',
      questions: [{ id: 'q1', texte: { fr: 'Question ?' } }],
      decision_rule: 'au_moins_un_oui_impact_direct',
      created_at: memeInstant,
    })
    await store.charger('client-1')
    expect(store.profilActif?.id).toBe('v2-id')
  })
})

describe('useImpactAssessmentStore — creerEvaluation (règle "au moins un oui")', () => {
  test('au moins un "oui" -> verdict impact_direct, tracé dans audit_log', async () => {
    const store = useImpactAssessmentStore()
    await store.charger('client-1')
    const profil = await store.creerNouvelleVersion('client-1', {
      questions: [{ texte: 'Question 1 ?' }, { texte: 'Question 2 ?' }],
      source: 'Test',
      origin: 'defini_utilisateur',
    })
    const [q0, q1] = profil.questions
    if (!q0 || !q1) throw new Error('unreachable')

    const evaluation = await store.creerEvaluation('client-1', {
      nomElement: 'SCADA-305',
      assetNodeId: null,
      reponses: { [q0.id]: 'non', [q1.id]: 'oui' },
    })

    if ('erreur' in evaluation) throw new Error('unreachable')
    expect(evaluation.verdict).toBe('impact_direct')
    expect(evaluation.method_profile_version).toBe('v1')
    expect(evaluation.audit_log).toHaveLength(1)
  })

  test('aucun "oui" -> verdict non_impact_direct', async () => {
    const store = useImpactAssessmentStore()
    await store.charger('client-1')
    const profil = await store.creerNouvelleVersion('client-1', {
      questions: [{ texte: 'Question unique ?' }],
      source: 'Test',
      origin: 'defini_utilisateur',
    })
    const [question] = profil.questions
    if (!question) throw new Error('unreachable')

    const evaluation = await store.creerEvaluation('client-1', {
      nomElement: 'Capteur de température ambiante',
      assetNodeId: null,
      reponses: { [question.id]: 'non' },
    })

    if ('erreur' in evaluation) throw new Error('unreachable')
    expect(evaluation.verdict).toBe('non_impact_direct')
  })
})

describe('useImpactAssessmentStore — isolation stricte par client', () => {
  test("les profils/évaluations d'un client ne fuient pas vers un autre", async () => {
    const store = useImpactAssessmentStore()
    await store.charger('client-A')
    await store.creerNouvelleVersion('client-A', {
      questions: [{ texte: 'Question A ?' }],
      source: 'Source A',
      origin: 'defini_utilisateur',
    })
    await store.charger('client-B')
    expect(store.profilActif).toBeNull()
  })
})

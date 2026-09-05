import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useMethodProfileACFCStore } from './useMethodProfileACFCStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.methodProfilesACFC.clear()
  await db.evaluationsACFC.clear()
})

describe('useMethodProfileACFCStore — aucun profil configuré', () => {
  test('client sans profil -> profilActif null, évaluation refusée explicitement', async () => {
    const store = useMethodProfileACFCStore()
    await store.charger('client-1')
    expect(store.profilActif).toBeNull()

    const resultat = await store.creerEvaluation('client-1', {
      nomElement: 'Vanne de régulation V-101',
      assetNodeId: null,
      reponses: {},
    })
    expect(resultat).toEqual({ erreur: 'aucun_profil_configure' })
  })
})

describe('useMethodProfileACFCStore — creerNouvelleVersion', () => {
  test("crée un profil avec les questions du client, mot pour mot, aucune valeur d'origine dans le code", async () => {
    const store = useMethodProfileACFCStore()
    await store.charger('client-1')
    const profil = await store.creerNouvelleVersion('client-1', {
      questions: [
        { texte: 'Le composant est-il en contact direct avec le produit ?' },
        { texte: 'Une défaillance pose-t-elle un risque au patient ?' },
      ],
      source: 'Procédure interne QD-00098219',
      origin: 'procedure_client',
    })
    expect(profil.questions).toHaveLength(2)
    expect(profil.questions[0]?.texte.fr).toBe(
      'Le composant est-il en contact direct avec le produit ?',
    )
    expect(profil.version).toBe('v1')
    expect(store.profilActif?.id).toBe(profil.id)
  })

  test('une nouvelle version ne mute jamais la précédente (immuabilité)', async () => {
    const store = useMethodProfileACFCStore()
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
    expect(store.profils).toHaveLength(2)

    const v1Relu = await db.methodProfilesACFC.get(v1.id)
    expect(v1Relu?.questions).toHaveLength(1)
  })

  test('régression : profilActif reste correct même si deux versions partagent le même created_at (même milliseconde)', async () => {
    const store = useMethodProfileACFCStore()
    await store.charger('client-1')
    const memeInstant = new Date().toISOString()
    await db.methodProfilesACFC.put({
      id: 'v1-id',
      client_id: 'client-1',
      version: 'v1',
      effective_date: memeInstant,
      source: 'Source v1',
      origin: 'defini_utilisateur',
      questions: [{ id: 'q1', texte: { fr: 'Question ?' } }],
      decision_rule: 'au_moins_un_oui_critique',
      created_at: memeInstant,
    })
    await db.methodProfilesACFC.put({
      id: 'v2-id',
      client_id: 'client-1',
      version: 'v2',
      effective_date: memeInstant,
      source: 'Source v2',
      origin: 'defini_utilisateur',
      questions: [{ id: 'q1', texte: { fr: 'Question ?' } }],
      decision_rule: 'au_moins_un_oui_critique',
      created_at: memeInstant,
    })
    await store.charger('client-1')
    expect(store.profilActif?.id).toBe('v2-id')
  })

  test('isolation stricte par client (même principe que Structure Système)', async () => {
    const store = useMethodProfileACFCStore()
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

describe('useMethodProfileACFCStore — creerEvaluation (règle "au moins un oui")', () => {
  test('évaluation avec au moins un oui -> verdict critique, tracé dans audit_log', async () => {
    const store = useMethodProfileACFCStore()
    await store.charger('client-1')
    const profil = await store.creerNouvelleVersion('client-1', {
      questions: [{ texte: 'Question 1 ?' }, { texte: 'Question 2 ?' }, { texte: 'Question 3 ?' }],
      source: 'Test',
      origin: 'defini_utilisateur',
    })
    const [q0, q1, q2] = profil.questions
    if (!q0 || !q1 || !q2) throw new Error('unreachable')

    const evaluation = await store.creerEvaluation('client-1', {
      nomElement: 'Capteur de pression P-204',
      assetNodeId: null,
      reponses: { [q0.id]: 'non', [q1.id]: 'oui', [q2.id]: 'non' },
    })

    expect(evaluation).not.toHaveProperty('erreur')
    if ('erreur' in evaluation) throw new Error('unreachable')
    expect(evaluation.verdict).toBe('critique')
    expect(evaluation.method_profile_version).toBe('v1')
    expect(evaluation.audit_log).toHaveLength(1)
    expect(evaluation.audit_log[0]?.action).toBe('création')
  })

  test('évaluation sans aucun oui -> verdict non_critique', async () => {
    const store = useMethodProfileACFCStore()
    await store.charger('client-1')
    const profil = await store.creerNouvelleVersion('client-1', {
      questions: [{ texte: 'Question unique ?' }],
      source: 'Test',
      origin: 'defini_utilisateur',
    })

    const [question] = profil.questions
    if (!question) throw new Error('unreachable')

    const evaluation = await store.creerEvaluation('client-1', {
      nomElement: 'Élément non critique',
      assetNodeId: null,
      reponses: { [question.id]: 'non' },
    })

    if ('erreur' in evaluation) throw new Error('unreachable')
    expect(evaluation.verdict).toBe('non_critique')
  })

  test('deux évaluations successives persistent toutes les deux (régression DataCloneError)', async () => {
    const store = useMethodProfileACFCStore()
    await store.charger('client-1')
    const profil = await store.creerNouvelleVersion('client-1', {
      questions: [{ texte: 'Question ?' }],
      source: 'Test',
      origin: 'defini_utilisateur',
    })
    const [question] = profil.questions
    if (!question) throw new Error('unreachable')

    await store.creerEvaluation('client-1', {
      nomElement: 'Élément 1',
      assetNodeId: null,
      reponses: { [question.id]: 'oui' },
    })
    await store.creerEvaluation('client-1', {
      nomElement: 'Élément 2',
      assetNodeId: null,
      reponses: { [question.id]: 'non' },
    })
    expect(store.evaluations).toHaveLength(2)
    const relues = await db.evaluationsACFC.where('client_id').equals('client-1').toArray()
    expect(relues).toHaveLength(2)
  })
})

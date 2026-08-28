import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { db } from '../../persistance/db'
import { useRiskAssessmentStore } from './useRiskAssessmentStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.methodProfilesRiskAssessment.clear()
  await db.risksAssessment.clear()
})

describe('useRiskAssessmentStore — aucun profil configuré', () => {
  test('client sans profil -> profilActif null, évaluation refusée explicitement', async () => {
    const store = useRiskAssessmentStore()
    await store.charger('client-1')
    expect(store.profilActif).toBeNull()

    const resultat = await store.creerEvaluation('client-1', {
      assetNodeId: null,
      parameterId: null,
      etapeProcessus: 'Pesée',
      modeDefaillance: 'Dosage incorrect',
      effetDefaillance: 'Lot non conforme',
      causePotentielle: 'Balance non calibrée',
      controleActuel: 'Aucun',
      severiteInitiale: 6,
      occurrenceInitiale: 3,
      detectabiliteInitiale: 9,
    })
    expect(resultat).toEqual({ erreur: 'aucun_profil_configure' })
  })
})

describe('useRiskAssessmentStore — creerNouvelleVersion', () => {
  test("crée un profil avec l'échelle/le seuil du client, aucune valeur figée dans le code", async () => {
    const store = useRiskAssessmentStore()
    await store.charger('client-1')
    const profil = await store.creerNouvelleVersion('client-1', {
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 50,
      source: 'Processus_AMDEC.xlsx (adapté client)',
      origin: 'procedure_client',
    })
    expect(profil.echelle_min).toBe(1)
    expect(profil.echelle_max).toBe(5)
    expect(profil.seuil_action).toBe(50)
    expect(profil.version).toBe('v1')
    expect(store.profilActif?.id).toBe(profil.id)
  })

  test('une nouvelle version ne mute jamais la précédente (immuabilité)', async () => {
    const store = useRiskAssessmentStore()
    await store.charger('client-1')
    const v1 = await store.creerNouvelleVersion('client-1', {
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 50,
      source: 'Baseline initiale',
      origin: 'defini_utilisateur',
    })
    const v2 = await store.creerNouvelleVersion('client-1', {
      echelleMin: 1,
      echelleMax: 10,
      seuilAction: 100,
      source: 'Révision suite audit interne',
      origin: 'defini_utilisateur',
    })

    expect(v1.echelle_max).toBe(5)
    expect(v2.echelle_max).toBe(10)
    expect(store.profilActif?.id).toBe(v2.id)

    const v1Relu = await db.methodProfilesRiskAssessment.get(v1.id)
    expect(v1Relu?.echelle_max).toBe(5)
  })
})

describe('useRiskAssessmentStore — creerEvaluation (IPR initial + verdict)', () => {
  test('IPR sous le seuil -> verdict acceptable, tracé dans audit_log', async () => {
    const store = useRiskAssessmentStore()
    await store.charger('client-1')
    await store.creerNouvelleVersion('client-1', {
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 100,
      source: 'Test',
      origin: 'defini_utilisateur',
    })

    const evaluation = await store.creerEvaluation('client-1', {
      assetNodeId: 'n1',
      parameterId: null,
      etapeProcessus: 'Pesée',
      modeDefaillance: 'Dosage incorrect',
      effetDefaillance: 'Lot non conforme',
      causePotentielle: 'Balance non calibrée',
      controleActuel: 'Vérification quotidienne',
      severiteInitiale: 3,
      occurrenceInitiale: 2,
      detectabiliteInitiale: 2,
    })

    if ('erreur' in evaluation) throw new Error('unreachable')
    expect(evaluation.ipr_initial).toBe(12)
    expect(evaluation.verdict_initial).toBe('acceptable')
    expect(evaluation.method_profile_version).toBe('v1')
    expect(evaluation.audit_log).toHaveLength(1)
  })

  test('IPR au-dessus du seuil -> verdict action_requise', async () => {
    const store = useRiskAssessmentStore()
    await store.charger('client-1')
    await store.creerNouvelleVersion('client-1', {
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 100,
      source: 'Test',
      origin: 'defini_utilisateur',
    })

    const evaluation = await store.creerEvaluation('client-1', {
      assetNodeId: 'n1',
      parameterId: 'param-1',
      etapeProcessus: 'Mélange',
      modeDefaillance: 'Sous-mélange',
      effetDefaillance: 'Hétérogénéité du lot',
      causePotentielle: 'Temps de mélange insuffisant',
      controleActuel: 'Aucun',
      severiteInitiale: 5,
      occurrenceInitiale: 5,
      detectabiliteInitiale: 5,
    })

    if ('erreur' in evaluation) throw new Error('unreachable')
    expect(evaluation.ipr_initial).toBe(125)
    expect(evaluation.verdict_initial).toBe('action_requise')
  })

  test('valeurs S/O/D incomplètes -> ipr_initial et verdict_initial restent null', async () => {
    const store = useRiskAssessmentStore()
    await store.charger('client-1')
    await store.creerNouvelleVersion('client-1', {
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 50,
      source: 'Test',
      origin: 'defini_utilisateur',
    })

    const evaluation = await store.creerEvaluation('client-1', {
      assetNodeId: null,
      parameterId: null,
      etapeProcessus: 'Étiquetage',
      modeDefaillance: 'Étiquette manquante',
      effetDefaillance: 'Non-conformité réglementaire',
      causePotentielle: 'Panne de l’étiqueteuse',
      controleActuel: 'Contrôle visuel',
      severiteInitiale: 4,
      occurrenceInitiale: null,
      detectabiliteInitiale: null,
    })

    if ('erreur' in evaluation) throw new Error('unreachable')
    expect(evaluation.ipr_initial).toBeNull()
    expect(evaluation.verdict_initial).toBeNull()
  })
})

describe('useRiskAssessmentStore — enregistrerActionResiduelle (cycle AMDEC réel)', () => {
  test('enregistre action + IPR résiduel, jamais une valeur devinée avant', async () => {
    const store = useRiskAssessmentStore()
    await store.charger('client-1')
    await store.creerNouvelleVersion('client-1', {
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 100,
      source: 'Test',
      origin: 'defini_utilisateur',
    })
    const evaluation = await store.creerEvaluation('client-1', {
      assetNodeId: 'n1',
      parameterId: null,
      etapeProcessus: 'Mélange',
      modeDefaillance: 'Sous-mélange',
      effetDefaillance: 'Hétérogénéité du lot',
      causePotentielle: 'Temps de mélange insuffisant',
      controleActuel: 'Aucun',
      severiteInitiale: 5,
      occurrenceInitiale: 5,
      detectabiliteInitiale: 5,
    })
    if ('erreur' in evaluation) throw new Error('unreachable')
    expect(evaluation.ipr_residuel).toBeNull()
    expect(evaluation.verdict_residuel).toBeNull()

    const resultat = await store.enregistrerActionResiduelle('client-1', evaluation.id, {
      recommandation: 'Augmenter le temps de mélange à 15 min',
      responsable: 'Responsable Production',
      dateCible: '2026-09-30',
      actionsMenees: 'Procédure de mélange révisée et déployée',
      severiteResiduelle: 5,
      occurrenceResiduelle: 1,
      detectabiliteResiduelle: 1,
    })

    if ('erreur' in resultat) throw new Error('unreachable')
    expect(resultat.ipr_residuel).toBe(5)
    expect(resultat.verdict_residuel).toBe('acceptable')
    expect(resultat.recommandation).toBe('Augmenter le temps de mélange à 15 min')
    expect(resultat.audit_log).toHaveLength(2)
  })

  test('RiskAssessment inconnu -> erreur explicite, jamais une exception', async () => {
    const store = useRiskAssessmentStore()
    const resultat = await store.enregistrerActionResiduelle('client-1', 'inconnu', {
      recommandation: null,
      responsable: null,
      dateCible: null,
      actionsMenees: null,
      severiteResiduelle: null,
      occurrenceResiduelle: null,
      detectabiliteResiduelle: null,
    })
    expect(resultat).toEqual({ erreur: 'introuvable' })
  })
})

describe('useRiskAssessmentStore — isolation stricte par client', () => {
  test("les profils/évaluations d'un client ne fuient pas vers un autre", async () => {
    const store = useRiskAssessmentStore()
    await store.charger('client-A')
    await store.creerNouvelleVersion('client-A', {
      echelleMin: 1,
      echelleMax: 5,
      seuilAction: 50,
      source: 'Source A',
      origin: 'defini_utilisateur',
    })
    await store.charger('client-B')
    expect(store.profilActif).toBeNull()
  })
})

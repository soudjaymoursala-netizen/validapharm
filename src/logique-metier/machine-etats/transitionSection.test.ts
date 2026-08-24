import { describe, expect, test } from 'vitest'
import { appliquerTransition, type ContexteTransition } from './transitionSection'

function contexte(overrides: Partial<ContexteTransition> = {}): ContexteTransition {
  return {
    statutActuel: 'brouillon_aide',
    auteursRenseignes: true,
    approbateurFinalRenseigne: true,
    auMoinsUnAvisRelecteur: true,
    ...overrides,
  }
}

describe('appliquerTransition — brouillon_aide', () => {
  test('engager_verification autorisé si rédacteur et approbateur renseignés', () => {
    const resultat = appliquerTransition(contexte(), 'engager_verification')
    expect(resultat).toEqual({ autorisee: true, nouveauStatut: 'en_verification' })
  })

  test('engager_verification bloqué si les rôles ne sont pas renseignés (auteurs)', () => {
    const resultat = appliquerTransition(
      contexte({ auteursRenseignes: false }),
      'engager_verification',
    )
    expect(resultat).toEqual({ autorisee: false, raison: 'roles_manquants' })
  })

  test('engager_verification bloqué si les rôles ne sont pas renseignés (approbateur)', () => {
    const resultat = appliquerTransition(
      contexte({ approbateurFinalRenseigne: false }),
      'engager_verification',
    )
    expect(resultat).toEqual({ autorisee: false, raison: 'roles_manquants' })
  })

  test('toute autre action est refusée depuis brouillon_aide', () => {
    expect(appliquerTransition(contexte(), 'approuver')).toEqual({
      autorisee: false,
      raison: 'transition_invalide',
    })
    expect(appliquerTransition(contexte(), 'transmettre_approbation')).toEqual({
      autorisee: false,
      raison: 'transition_invalide',
    })
    expect(appliquerTransition(contexte(), 'valider_section_ia')).toEqual({
      autorisee: false,
      raison: 'transition_invalide',
    })
  })
})

describe('appliquerTransition — propose_par_ia_non_valide', () => {
  test('valider_section_ia ramène à brouillon_aide', () => {
    const resultat = appliquerTransition(
      contexte({ statutActuel: 'propose_par_ia_non_valide' }),
      'valider_section_ia',
    )
    expect(resultat).toEqual({ autorisee: true, nouveauStatut: 'brouillon_aide' })
  })

  test.each(['engager_verification', 'transmettre_approbation', 'approuver', 'rejeter'] as const)(
    'ne peut JAMAIS transiter directement via %s (règle non négociable FDS §3.2)',
    (action) => {
      const resultat = appliquerTransition(
        contexte({ statutActuel: 'propose_par_ia_non_valide' }),
        action,
      )
      expect(resultat).toEqual({ autorisee: false, raison: 'transition_invalide' })
    },
  )
})

describe('appliquerTransition — en_verification', () => {
  test('transmettre_approbation autorisé si au moins un avis relecteur', () => {
    const resultat = appliquerTransition(
      contexte({ statutActuel: 'en_verification' }),
      'transmettre_approbation',
    )
    expect(resultat).toEqual({ autorisee: true, nouveauStatut: 'en_approbation' })
  })

  test("transmettre_approbation bloqué sans avis relecteur (pas d'arbitrage automatique, F-014ter)", () => {
    const resultat = appliquerTransition(
      contexte({ statutActuel: 'en_verification', auMoinsUnAvisRelecteur: false }),
      'transmettre_approbation',
    )
    expect(resultat).toEqual({ autorisee: false, raison: 'avis_manquant' })
  })

  test('rejeter avec motif ramène à brouillon_aide', () => {
    const resultat = appliquerTransition(
      contexte({ statutActuel: 'en_verification', motifRejet: 'Références normatives manquantes' }),
      'rejeter',
    )
    expect(resultat).toEqual({ autorisee: true, nouveauStatut: 'brouillon_aide' })
  })

  test('rejeter sans motif (ou motif vide) est bloqué — motif obligatoire', () => {
    expect(appliquerTransition(contexte({ statutActuel: 'en_verification' }), 'rejeter')).toEqual({
      autorisee: false,
      raison: 'motif_requis',
    })
    expect(
      appliquerTransition(
        contexte({ statutActuel: 'en_verification', motifRejet: '   ' }),
        'rejeter',
      ),
    ).toEqual({ autorisee: false, raison: 'motif_requis' })
  })
})

describe('appliquerTransition — en_approbation', () => {
  test('approuver autorisé si approbateur final renseigné', () => {
    const resultat = appliquerTransition(contexte({ statutActuel: 'en_approbation' }), 'approuver')
    expect(resultat).toEqual({ autorisee: true, nouveauStatut: 'valide_en_interne' })
  })

  test('rejeter avec motif depuis en_approbation ramène aussi à brouillon_aide', () => {
    const resultat = appliquerTransition(
      contexte({ statutActuel: 'en_approbation', motifRejet: 'Écart non couvert' }),
      'rejeter',
    )
    expect(resultat).toEqual({ autorisee: true, nouveauStatut: 'brouillon_aide' })
  })
})

describe('appliquerTransition — valide_en_interne (verrouillé)', () => {
  test.each([
    'engager_verification',
    'transmettre_approbation',
    'approuver',
    'rejeter',
    'valider_section_ia',
  ] as const)('toute action (%s) est bloquée — URS-F-012, corps verrouillé', (action) => {
    const resultat = appliquerTransition(contexte({ statutActuel: 'valide_en_interne' }), action)
    expect(resultat).toEqual({ autorisee: false, raison: 'section_verrouillee' })
  })
})

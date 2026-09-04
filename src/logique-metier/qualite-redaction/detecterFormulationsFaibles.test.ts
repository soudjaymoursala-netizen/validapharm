import { describe, expect, test } from 'vitest'
import {
  detecterFormulationsFaibles,
  detecterFormulationsFaiblesSection,
} from './detecterFormulationsFaibles'

describe('detecterFormulationsFaibles', () => {
  test('texte vide ou sans formulation faible ne retourne rien', () => {
    expect(detecterFormulationsFaibles('')).toEqual([])
    expect(
      detecterFormulationsFaibles(
        'La vanne V-101 doit être fermée avant le démarrage de la pompe P-42.',
      ),
    ).toEqual([])
  })

  test('détecte "devrait" comme obligation faible', () => {
    const resultat = detecterFormulationsFaibles('Le technicien devrait vérifier la pression.')
    expect(resultat).toHaveLength(1)
    expect(resultat[0]).toMatchObject({
      motif: 'Obligation faible ("devrait")',
      extrait: 'devrait',
    })
  })

  test('détecte les généralisations non quantifiées', () => {
    expect(detecterFormulationsFaibles('Le cycle dure généralement 20 minutes.')[0]?.extrait).toBe(
      'généralement',
    )
    expect(
      detecterFormulationsFaibles('La procédure est habituellement suivie par deux opérateurs.')[0]
        ?.extrait,
    ).toBe('habituellement')
  })

  test('détecte "etc." comme liste non exhaustive', () => {
    const resultat = detecterFormulationsFaibles('Vérifier les vannes, pompes, capteurs, etc.')
    expect(resultat).toHaveLength(1)
    expect(resultat[0]?.motif).toBe('Liste non exhaustive ("etc.")')
  })

  test('détecte "si nécessaire"/"si besoin"', () => {
    expect(detecterFormulationsFaibles('Recalibrer si nécessaire.')[0]?.extrait).toBe(
      'si nécessaire',
    )
    expect(detecterFormulationsFaibles('Contacter le support si besoin.')[0]?.extrait).toBe(
      'si besoin',
    )
  })

  test('détecte "de manière appropriée" et "le cas échéant"', () => {
    expect(
      detecterFormulationsFaibles('Nettoyer la surface de manière appropriée.')[0]?.motif,
    ).toBe('Responsabilité vague ("de manière appropriée")')
    expect(detecterFormulationsFaibles('Documenter la déviation, le cas échéant.')[0]?.motif).toBe(
      'Condition implicite ("le cas échéant")',
    )
  })

  test('retourne plusieurs correspondances triées par position', () => {
    const resultat = detecterFormulationsFaibles('Le rédacteur devrait normalement vérifier, etc.')
    expect(resultat.map((f) => f.extrait)).toEqual(['devrait', 'normalement', 'etc.'])
    expect(resultat.map((f) => f.position)).toEqual([13, 21, 43])
  })

  test('insensible à la casse', () => {
    expect(detecterFormulationsFaibles('DEVRAIT vérifier.')).toHaveLength(1)
  })
})

describe('detecterFormulationsFaiblesSection', () => {
  test('balaie les champs values et ignore les valeurs non textuelles', () => {
    const resultat = detecterFormulationsFaiblesSection(
      {
        objectif: 'Le test devrait couvrir tous les cas.',
        reference: 'AC-104',
        nombre: 42,
        vide: null,
      },
      {},
    )
    expect(resultat).toEqual([
      {
        champ: 'objectif',
        formulations: [
          {
            motif: 'Obligation faible ("devrait")',
            extrait: 'devrait',
            position: 8,
            suggestion:
              "Préférer « doit » pour une exigence contraignante, ou indiquer explicitement que c'est une recommandation.",
          },
        ],
      },
    ])
  })

  test('balaie les cellules de tableau dynamique avec un identifiant de champ composé', () => {
    const resultat = detecterFormulationsFaiblesSection(
      {},
      {
        etapes: [
          { description: 'Purger la ligne, etc.' },
          { description: 'Fermer la vanne V-12.' },
        ],
      },
    )
    expect(resultat).toEqual([
      {
        champ: 'etapes[1].description',
        formulations: [
          {
            motif: 'Liste non exhaustive ("etc.")',
            extrait: 'etc.',
            position: 17,
            suggestion:
              'Énumérer explicitement tous les éléments visés — une liste ouverte est ambiguë en contexte réglementaire.',
          },
        ],
      },
    ])
  })

  test('aucune formulation faible retourne un tableau vide', () => {
    expect(
      detecterFormulationsFaiblesSection({ objectif: 'La vanne doit être fermée.' }, {}),
    ).toEqual([])
  })
})

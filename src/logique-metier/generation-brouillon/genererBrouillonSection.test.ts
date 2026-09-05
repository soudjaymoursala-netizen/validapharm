import { describe, expect, test } from 'vitest'
import type { ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type { DefinitionGabarit } from '../gabarits/definitionGabarit'
import { genererBrouillonSection } from './genererBrouillonSection'

const GABARIT_TEST: DefinitionGabarit = {
  template_id: 'iq',
  template_version: '1.0',
  family: 'test',
  normes_associees: [],
  sections: [
    {
      section_key: 'generalites',
      labels: { fr: 'Généralités', en: 'General', de: 'Allgemein' },
      required_link_type: null,
      fields: [
        {
          field_key: 'objectif',
          labels: { fr: 'Objectif', en: 'Objective', de: 'Ziel' },
          type: 'texte_long',
          required: false,
        },
        {
          field_key: 'tolerance',
          labels: { fr: 'Tolérance', en: 'Tolerance', de: 'Toleranz' },
          type: 'nombre',
          required: false,
          min: 0,
          max: 100,
        },
        {
          field_key: 'criticite',
          labels: { fr: 'Criticité', en: 'Criticality', de: 'Kritikalität' },
          type: 'liste',
          required: false,
          options: [
            { valeur: 'basse', labels: { fr: 'Basse', en: 'Low', de: 'Niedrig' } },
            { valeur: 'haute', labels: { fr: 'Haute', en: 'High', de: 'Hoch' } },
          ],
        },
      ],
    },
    {
      section_key: 'tests',
      labels: { fr: 'Tests', en: 'Tests', de: 'Tests' },
      required_link_type: null,
      fields: [
        {
          field_key: 'lignes',
          labels: { fr: 'Lignes de test', en: 'Test rows', de: 'Testzeilen' },
          type: 'tableau_dynamique',
          required: false,
          colonnes: [
            {
              field_key: 'description',
              labels: { fr: 'Description', en: 'Description', de: 'Beschreibung' },
              type: 'texte_court',
              required: false,
            },
          ],
        },
      ],
    },
  ],
}

function providerRepondant(texte: string): ProviderAdapter {
  return {
    nomAffiche: 'Fournisseur test',
    estCloud: true,
    envoyerMessage: async () => ({ texte, version_moteur: null, citations: [] }),
  }
}

const ENTREES_BASE = {
  gabarit: GABARIT_TEST,
  texteDocumentReference: 'Document de référence.',
  contexteNouveauCas: 'Nouveau cas.',
  langue: 'fr' as const,
  tablesExistantes: {},
}

describe('genererBrouillonSection', () => {
  test('accepte des champs scalaires valides et les marque origineTechnique selon leur type', async () => {
    const provider = providerRepondant(
      [
        'CHAMP|generalites.objectif|Vérifier le bon fonctionnement.',
        'CHAMP|generalites.tolerance|12',
        'CHAMP|generalites.criticite|haute',
      ].join('\n'),
    )
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)

    expect(resultat.champs).toHaveLength(3)
    expect(resultat.champs.find((c) => c.field_key === 'objectif')?.origineTechnique).toBe(false)
    expect(resultat.champs.find((c) => c.field_key === 'tolerance')).toMatchObject({
      valeur: 12,
      origineTechnique: true,
    })
    expect(resultat.champs.find((c) => c.field_key === 'criticite')?.origineTechnique).toBe(false)
  })

  test('rejette une valeur de liste non reconnue (jamais un état que la saisie manuelle refuserait)', async () => {
    const provider = providerRepondant('CHAMP|generalites.criticite|moyenne')
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.champs).toHaveLength(0)
  })

  test('rejette un nombre hors plage', async () => {
    const provider = providerRepondant('CHAMP|generalites.tolerance|999')
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.champs).toHaveLength(0)
  })

  test('ignore un champ inconnu/halluciné (jamais écrit)', async () => {
    const provider = providerRepondant('CHAMP|generalites.champ_invente|une valeur')
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.champs).toHaveLength(0)
  })

  test('ignore une ligne pour un champ de type tableau_dynamique même si halluciné', async () => {
    const provider = providerRepondant('CHAMP|tests.lignes|une valeur')
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.champs).toHaveLength(0)
  })

  test('ignore les lignes qui ne suivent pas le protocole CHAMP|...|...', async () => {
    const provider = providerRepondant(
      ['Voici mon analyse :', 'generalites.objectif = quelque chose', ''].join('\n'),
    )
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.champs).toHaveLength(0)
  })

  test('conserve le texte de réponse brut intégralement', async () => {
    const provider = providerRepondant('CHAMP|generalites.objectif|Objectif recopié.')
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.texteReponseBrute).toBe('CHAMP|generalites.objectif|Objectif recopié.')
  })
})

describe('genererBrouillonSection — lignes de tableau dynamique', () => {
  test('propose des lignes valides pour un tableau vide', async () => {
    const provider = providerRepondant(
      [
        'LIGNE_TABLEAU|tests.lignes|description=Vérifier A',
        'LIGNE_TABLEAU|tests.lignes|description=Vérifier B',
      ].join('\n'),
    )
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.lignesTableaux).toEqual([
      {
        section_key: 'tests',
        field_key: 'lignes',
        lignes: [{ description: 'Vérifier A' }, { description: 'Vérifier B' }],
      },
    ])
  })

  test('ne propose jamais de ligne pour un tableau déjà rempli — jamais un ajout aux lignes existantes', async () => {
    const provider = providerRepondant('LIGNE_TABLEAU|tests.lignes|description=Nouvelle ligne')
    const resultat = await genererBrouillonSection(
      { ...ENTREES_BASE, tablesExistantes: { lignes: [{ description: 'Déjà là' }] } },
      provider,
    )
    expect(resultat.lignesTableaux).toEqual([])
  })

  test('rejette la ligne entière si une seule cellule référence une colonne inconnue', async () => {
    const provider = providerRepondant(
      'LIGNE_TABLEAU|tests.lignes|description=Vérifier A;colonne_inventee=x',
    )
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.lignesTableaux).toEqual([])
  })

  test('ignore un tableau inconnu/halluciné', async () => {
    const provider = providerRepondant('LIGNE_TABLEAU|tests.tableau_invente|description=x')
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.lignesTableaux).toEqual([])
  })

  test('plafonne le nombre de lignes proposées par tableau', async () => {
    const lignes = Array.from(
      { length: 30 },
      (_, i) => `LIGNE_TABLEAU|tests.lignes|description=Ligne ${i}`,
    )
    const provider = providerRepondant(lignes.join('\n'))
    const resultat = await genererBrouillonSection(ENTREES_BASE, provider)
    expect(resultat.lignesTableaux[0]?.lignes).toHaveLength(20)
  })
})

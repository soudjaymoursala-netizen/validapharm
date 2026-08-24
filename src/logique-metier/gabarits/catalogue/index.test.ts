import { describe, expect, test } from 'vitest'
import { obtenirDefinitionGabarit } from './index'

const TOUS_LES_GABARITS_DEFINIS: Array<Parameters<typeof obtenirDefinitionGabarit>[0]> = [
  'contexte_procede',
  'urs',
  'dq',
  'fat',
  'sat',
  'iq',
  'oq',
  'pq',
  'validation_procede',
  'plan_metrologie',
  'plan_maintenance',
]

describe('obtenirDefinitionGabarit', () => {
  test('renvoie une définition pour chaque gabarit du catalogue (§10 URS, familles A/C/D/L/M + B)', () => {
    for (const templateType of TOUS_LES_GABARITS_DEFINIS) {
      expect(obtenirDefinitionGabarit(templateType)).toBeDefined()
    }
  })

  test('cohérence structurelle de chaque gabarit enregistré : clés uniques, formules référençant des colonnes existantes', () => {
    for (const templateType of TOUS_LES_GABARITS_DEFINIS) {
      const definition = obtenirDefinitionGabarit(templateType)
      expect(definition).toBeDefined()
      if (definition === undefined) continue

      expect(definition.template_id).toBe(templateType)
      expect(definition.sections.length).toBeGreaterThan(0)

      const clesSections = definition.sections.map((s) => s.section_key)
      expect(new Set(clesSections).size).toBe(clesSections.length)

      for (const section of definition.sections) {
        const clesChamps = section.fields.map((f) => f.field_key)
        expect(new Set(clesChamps).size).toBe(clesChamps.length)

        for (const champ of section.fields) {
          if (champ.type !== 'tableau_dynamique') continue
          const clesColonnes = champ.colonnes.map((c) => c.field_key)
          expect(new Set(clesColonnes).size).toBe(clesColonnes.length)

          for (const colonne of champ.colonnes) {
            if (colonne.type !== 'nombre' || colonne.formule === undefined) continue
            for (const cleEntree of colonne.formule.entrees) {
              expect(clesColonnes).toContain(cleEntree)
            }
          }
        }
      }
    }
  })
})

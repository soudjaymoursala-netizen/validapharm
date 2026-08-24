import { describe, expect, test } from 'vitest'
import { obtenirDefinitionGabarit } from './index'

describe('obtenirDefinitionGabarit', () => {
  test('renvoie une définition pour les gabarits réellement construits', () => {
    expect(obtenirDefinitionGabarit('contexte_procede')).toBeDefined()
    expect(obtenirDefinitionGabarit('dq')).toBeDefined()
    expect(obtenirDefinitionGabarit('plan_metrologie')).toBeDefined()
  })

  test('renvoie undefined (jamais une erreur) pour un gabarit pas encore défini', () => {
    expect(obtenirDefinitionGabarit('urs')).toBeUndefined()
    expect(obtenirDefinitionGabarit('oq')).toBeUndefined()
  })

  test('cohérence structurelle de chaque gabarit enregistré : clés uniques, formules référençant des colonnes existantes', () => {
    const templates: Array<Parameters<typeof obtenirDefinitionGabarit>[0]> = [
      'contexte_procede',
      'dq',
      'plan_metrologie',
    ]

    for (const templateType of templates) {
      const definition = obtenirDefinitionGabarit(templateType)
      if (definition === undefined) continue

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

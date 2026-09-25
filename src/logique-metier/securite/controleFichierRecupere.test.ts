import { describe, expect, test } from 'vitest'
import { controlerFichierRecupere, raisonRefusServeur } from './controleFichierRecupere'

const projet = {
  id: 'p1',
  name: 'Projet',
  owner_id: 'alice@ex.com',
  shared_with: [{ user_id: 'bob@ex.com', access_level: 'édition' }],
}
const section = {
  id: 's1',
  project_id: 'p1',
  template_type: 'oq',
  owner_id: 'alice@ex.com',
  shared_with: [],
}

describe('controlerFichierRecupere', () => {
  test('projet et section valides -> acceptés', () => {
    expect(
      controlerFichierRecupere('project', 'data/projects/p1.json', JSON.stringify(projet)).ok,
    ).toBe(true)
    expect(
      controlerFichierRecupere('section', 'data/sections/s1.json', JSON.stringify(section)).ok,
    ).toBe(true)
  })

  test('JSON illisible -> refusé', () => {
    expect(controlerFichierRecupere('project', 'data/projects/p1.json', '{pas du json')).toEqual({
      ok: false,
      raison: 'fichier illisible (JSON invalide)',
    })
  })

  test('identifiant différent du nom du fichier -> refusé (jamais écraser un autre enregistrement)', () => {
    const resultat = controlerFichierRecupere(
      'project',
      'data/projects/p1.json',
      JSON.stringify({ ...projet, id: 'p-cible' }),
    )
    expect(resultat.ok).toBe(false)
    if (!resultat.ok) expect(resultat.raison).toContain('nom du fichier')
  })

  test('structure minimale absente -> refusée', () => {
    for (const [type, chemin, contenu] of [
      ['project', 'data/projects/p1.json', { ...projet, owner_id: '' }],
      ['project', 'data/projects/p1.json', { ...projet, name: undefined }],
      [
        'project',
        'data/projects/p1.json',
        { ...projet, shared_with: [{ user_id: 'x', access_level: 'admin' }] },
      ],
      ['section', 'data/sections/s1.json', { ...section, project_id: undefined }],
      ['section', 'data/sections/s1.json', { ...section, template_type: '' }],
      ['project', 'data/projects/p1.json', [projet]],
    ] as const) {
      expect(controlerFichierRecupere(type, chemin, JSON.stringify(contenu)).ok).toBe(false)
    }
  })
})

describe('raisonRefusServeur', () => {
  test('403 / 404 / 400 traduits en clair', () => {
    expect(raisonRefusServeur(403, 'non_autorise')).toContain('droits insuffisants')
    expect(raisonRefusServeur(404, 'introuvable')).toContain('inaccessible')
    expect(raisonRefusServeur(400, 'client_introuvable')).toContain('client_introuvable')
  })
})

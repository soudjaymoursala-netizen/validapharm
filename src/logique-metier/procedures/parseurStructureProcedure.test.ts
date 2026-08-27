import { describe, expect, it } from 'vitest'
import { detecterSections, proposerStructureProcedure } from './parseurStructureProcedure'

describe('detecterSections (Phase 21, TD-017)', () => {
  it("reconnaît les en-têtes canoniques d'une SOP gabarit 'Sanofi' (en-têtes en MAJUSCULES, point après le numéro)", () => {
    const texte = [
      '1. OBJECTIF',
      'Cette procédure décrit les règles de qualification des équipements.',
      "2. CHAMP D'APPLICATION",
      "Cette procédure s'applique à tous les équipements GxP du site.",
      '3. RESPONSABILITES',
      'Le Responsable Qualité valide chaque protocole.',
      '4. REFERENCES',
      'Annexe 15 PIC/S.',
    ].join('\n')

    const sections = detecterSections(texte)

    expect(sections.map((s) => s.canon)).toEqual([
      'objectif',
      'perimetre',
      'responsabilites',
      'references',
    ])
    expect(sections[0]?.texte).toContain('qualification des équipements')
    expect(sections[1]?.titreDetecte).toBe("CHAMP D'APPLICATION")
  })

  it("reconnaît les mêmes rôles sémantiques sous le lexique différent d'une SOP gabarit 'Ferring' (pas de point, casse mixte)", () => {
    const texte = [
      '1 But',
      'Le but de cette procédure est de décrire la maîtrise des pesées.',
      '2 Domaine d’application',
      'Cette procédure concerne les pesées réalisées en Manufacturing.',
      '3 Abréviations / Définitions',
      'EMT : Erreur Maximale Tolérée.',
      '4 Responsabilités',
      "L'opérateur pesée applique la procédure.",
      '5 Procédure',
      '- Vérifier le zéro de la balance.',
      '6 Références',
      'USP <41>.',
    ].join('\n')

    const sections = detecterSections(texte)

    expect(sections.map((s) => s.canon)).toEqual([
      'objectif',
      'perimetre',
      'definitions',
      'responsabilites',
      'procedure',
      'references',
    ])
  })

  it("classe un en-tête numéroté de forme reconnue mais absent du dictionnaire en 'autre' — jamais silencieusement écarté", () => {
    const texte = ['1 Contexte réglementaire spécifique', 'Texte de la section.'].join('\n')

    const sections = detecterSections(texte)

    expect(sections).toHaveLength(1)
    expect(sections[0]?.canon).toBe('autre')
    expect(sections[0]?.titreDetecte).toBe('Contexte réglementaire spécifique')
  })

  it('ne confond pas une sous-section numérotée (5.1.) avec un en-tête de premier niveau', () => {
    const texte = [
      '5 Procédure',
      '5.1. Exigences utilisateurs',
      'Texte de la sous-section, non traité comme un en-tête séparé.',
    ].join('\n')

    const sections = detecterSections(texte)

    expect(sections).toHaveLength(1)
    expect(sections[0]?.canon).toBe('procedure')
    expect(sections[0]?.texte).toContain('5.1. Exigences utilisateurs')
  })

  it("retourne un tableau vide quand aucun en-tête numéroté n'est reconnaissable (ex. instruction technique en prose libre, genre non couvert)", () => {
    const texte = [
      'Daily operation',
      'Press the green button to start the machine.',
      'Wait for the ready indicator before loading material.',
    ].join('\n')

    expect(detecterSections(texte)).toEqual([])
  })
})

describe('proposerStructureProcedure — étapes candidates (Phase 21, TD-017)', () => {
  it('extrait les étapes du corps de la section procédure, dans leur ordre, en préservant condition et responsable détectés', () => {
    const texte = [
      '1 But',
      'Décrire la procédure.',
      '2 Procédure',
      '- Vérifier que la vanne est fermée.',
      "- Ouvrir la purge, sauf en cas d'alarme active.",
      '- Opérateur : Consigner le résultat sur le registre.',
      '3 Références',
      'Référence externe.',
    ].join('\n')

    const proposition = proposerStructureProcedure(texte)

    expect(proposition.etapesProposees).toHaveLength(3)
    expect(proposition.etapesProposees[0]).toMatchObject({
      ordre: 1,
      description: 'Vérifier que la vanne est fermée.',
      conditionDetectee: null,
      responsableDetecte: null,
    })
    expect(proposition.etapesProposees[1]?.conditionDetectee).toBe("sauf en cas d'alarme active.")
    expect(proposition.etapesProposees[2]?.responsableDetecte).toBe('Opérateur')
  })

  it("ne propose aucune étape quand aucune section 'procedure' n'est détectée", () => {
    const texte = ['1 But', 'Décrire la procédure.', '2 Références', 'Référence externe.'].join(
      '\n',
    )

    const proposition = proposerStructureProcedure(texte)

    expect(proposition.etapesProposees).toEqual([])
    expect(proposition.sections.map((s) => s.canon)).toEqual(['objectif', 'references'])
  })
})

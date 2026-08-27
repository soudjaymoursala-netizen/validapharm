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

  it("reconnaît un en-tête par mot-clé (TD-018) quand le titre complet ne correspond à aucune entrée exacte du dictionnaire — cas réel d'une SOP IMA (4915BRP/LA1028BRP, Ferring) sans plan qualité", () => {
    const texte = [
      '1. INTRODUCTION',
      'This document contains the Backup / Restore Procedures.',
      '2. PLC Procedures',
      'Connect the MPI/serial cable to the CPU port of the PLC.',
      '3. PC Procedures (for HMI ima xface)',
      'Machine ON and not working.',
    ].join('\n')

    const sections = detecterSections(texte)

    expect(sections.map((s) => s.canon)).toEqual(['objectif', 'procedure', 'procedure'])
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

  it("replie sur une étape par ligne (TD-018) quand la section 'procédure' ne contient aucune puce/numéro explicite — cas réel de la SOP IMA, et rattache le sous-titre traversé comme contexte", () => {
    const texte = [
      '1. INTRODUCTION',
      'This document contains the Backup / Restore Procedures.',
      '2. PLC Procedures',
      '2.1 Pre-requisites',
      'PC for programming with a Siemens Step 7 software installed.',
      '2.2 Back-Up - Uploading the Old Program from the PLC',
      'Connect the MPI/serial cable to the CPU port of the PLC.',
      'Create a copy of the PLC program and save it in the PC.',
    ].join('\n')

    const proposition = proposerStructureProcedure(texte)

    expect(proposition.etapesProposees).toHaveLength(3)
    expect(proposition.etapesProposees[0]).toMatchObject({
      description: 'PC for programming with a Siemens Step 7 software installed.',
      contexteDetecte: 'Pre-requisites',
    })
    expect(proposition.etapesProposees[1]).toMatchObject({
      description: 'Connect the MPI/serial cable to the CPU port of the PLC.',
      contexteDetecte: 'Back-Up - Uploading the Old Program from the PLC',
    })
    expect(proposition.etapesProposees[2]?.contexteDetecte).toBe(
      'Back-Up - Uploading the Old Program from the PLC',
    )
  })

  it("préfère les puces/numéros explicites au repli ligne-par-ligne quand les deux sont présents dans la même section, et n'attache aucun contexte en l'absence de sous-titre", () => {
    const texte = ['1 Procédure', '- Vérifier que la vanne est fermée.', '- Ouvrir la purge.'].join(
      '\n',
    )

    const proposition = proposerStructureProcedure(texte)

    expect(proposition.etapesProposees).toHaveLength(2)
    expect(proposition.etapesProposees[0]?.contexteDetecte).toBeNull()
  })
})

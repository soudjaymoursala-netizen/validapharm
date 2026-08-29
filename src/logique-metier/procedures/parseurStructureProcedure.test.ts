import type { TableauDocx } from '../domaine/types'
import { describe, expect, it } from 'vitest'
import {
  detecterSections,
  proposerEtapesDepuisTableaux,
  proposerStructureProcedure,
} from './parseurStructureProcedure'

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

  it("ne confond pas une étape numérotée '1. texte' avec un nouvel en-tête de section quand elle réutilise la même convention que les en-têtes — bug réel trouvé en simulant une SOP réaliste (numérotation d'étape qui redémarre à 1 à l'intérieur de la section 4. PROCEDURE)", () => {
    const texte = [
      '1. OBJECTIF',
      'Décrire le nettoyage.',
      '2. CHAMP D APPLICATION',
      "S'applique à la ligne STICK002.",
      '3. RESPONSABILITES',
      "L'opérateur est responsable.",
      '4. PROCEDURE',
      '1. Vérifier que la ligne est arrêtée.',
      '2. Retirer les éléments de format.',
      '3. Nettoyer les surfaces avec le détergent validé.',
      '4. Rincer à l’eau purifiée.',
      '5. REFERENCES',
      'SOP-GEN-001',
    ].join('\n')

    const proposition = proposerStructureProcedure(texte)

    expect(proposition.sections.map((s) => s.canon)).toEqual([
      'objectif',
      'perimetre',
      'responsabilites',
      'procedure',
      'references',
    ])
    expect(proposition.etapesProposees).toHaveLength(4)
    expect(proposition.etapesProposees.map((e) => e.description)).toEqual([
      'Vérifier que la ligne est arrêtée.',
      'Retirer les éléments de format.',
      'Nettoyer les surfaces avec le détergent validé.',
      'Rincer à l’eau purifiée.',
    ])
  })
})

describe('proposerEtapesDepuisTableaux (Phase 22, TD-019) — étapes sous tableau, calibré sur le manuel Markem-Imaje C350 réel', () => {
  it('extrait les étapes numérotées et combine le titre le plus proche et les préconditions du tableau en contexte', () => {
    const tableaux: TableauDocx[] = [
      {
        titreProchePrecedent: 'Powering on the controller',
        lignes: [
          ['Previous achievement', 'Printer is fully installed and configured.'],
          ['Required time:', '>1.5 minutes'],
          [
            '1',
            'Connect the printer power cable to a universal AC mains supply (120/240 VAC @ 50-60 Hz).',
          ],
          ['2', 'Turn the switch key to the "I" (ON) position.'],
        ],
      },
    ]

    const etapes = proposerEtapesDepuisTableaux(tableaux)

    expect(etapes).toHaveLength(2)
    expect(etapes[0]).toMatchObject({
      ordre: 1,
      description:
        'Connect the printer power cable to a universal AC mains supply (120/240 VAC @ 50-60 Hz).',
      contexteDetecte:
        'Powering on the controller — Previous achievement : Printer is fully installed and configured. — Required time : >1.5 minutes',
    })
    expect(etapes[1]?.ordre).toBe(2)
  })

  it('ne fabrique aucune précondition absente et se limite au titre le plus proche quand le tableau ne contient ni "Previous achievement" ni "Required time"', () => {
    const tableaux: TableauDocx[] = [
      {
        titreProchePrecedent: 'Powering off the head',
        lignes: [
          ['1', 'Press stop if in the Execute state.'],
          ['2', 'The printer will be in the Held state.'],
        ],
      },
    ]

    const etapes = proposerEtapesDepuisTableaux(tableaux)

    expect(etapes.every((e) => e.contexteDetecte === 'Powering off the head')).toBe(true)
  })

  it("ignore une ligne dont la première cellule n'est pas un numéro d'étape exact, sans planter", () => {
    const tableaux: TableauDocx[] = [
      {
        titreProchePrecedent: null,
        lignes: [
          ['', ''],
          ['Note:', 'To restart the head, follow the steps above.'],
          ['1', 'Press the emission stop button.'],
        ],
      },
    ]

    const etapes = proposerEtapesDepuisTableaux(tableaux)

    expect(etapes).toHaveLength(1)
    expect(etapes[0]?.description).toBe('Press the emission stop button.')
  })

  it("s'ajoute aux étapes textuelles de proposerStructureProcedure sans écraser leur numérotation, chaque tableau gardant la sienne", () => {
    const texte = [
      '1 But',
      'Décrire la procédure.',
      '2 Procédure',
      '- Étape textuelle unique.',
    ].join('\n')
    const tableaux: TableauDocx[] = [
      {
        titreProchePrecedent: 'Powering on the head',
        lignes: [['1', 'Press start.']],
      },
    ]

    const proposition = proposerStructureProcedure(texte, tableaux)

    expect(proposition.etapesProposees).toHaveLength(2)
    expect(proposition.etapesProposees[0]).toMatchObject({
      ordre: 1,
      description: 'Étape textuelle unique.',
    })
    expect(proposition.etapesProposees[1]).toMatchObject({
      ordre: 1,
      description: 'Press start.',
      contexteDetecte: 'Powering on the head',
    })
  })
})

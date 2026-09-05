import { describe, expect, it, vi } from 'vitest'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import { proposerStructureProcedureParIA } from './proposerStructureProcedureIA'

function providerMock(texteReponse: string): ProviderAdapter {
  return {
    nomAffiche: 'Fournisseur simulé',
    estCloud: true,
    envoyerMessage: vi
      .fn<(mode: ModeUsageIA, contexte: ContexteEnvoi, question: string) => Promise<Reponse>>()
      .mockResolvedValue({ texte: texteReponse, version_moteur: 'v-test', citations: [] }),
  }
}

describe('proposerStructureProcedureParIA', () => {
  it("transmet le texte source au fournisseur via contenu_joint, jamais sans l'indicateur de confirmation", async () => {
    const provider = providerMock('SECTION|objectif|To fill the tank')
    await proposerStructureProcedureParIA('To fill the tank\nOpen the tank lid.', provider)

    const appel = (provider.envoyerMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [
      ModeUsageIA,
      ContexteEnvoi,
      string,
    ]
    const [mode, contexte] = appel
    expect(mode).toBe('chat_normatif')
    expect(contexte).toMatchObject({ contenu_joint: true })
    if (contexte.contenu_joint) {
      expect(contexte.contenu).toContain('To fill the tank')
    }
  })

  it("marque 'infere' une section/étape dont le texte est réellement ancré dans le document source", async () => {
    const texteSource = ['To fill the tank', 'Open the tank lid.', 'Close the tank lid.'].join('\n')
    const reponseIA = [
      'SECTION|objectif|To fill the tank',
      'ETAPE|Open the tank lid.',
      'ETAPE|Close the tank lid.',
    ].join('\n')
    const provider = providerMock(reponseIA)

    const proposition = await proposerStructureProcedureParIA(texteSource, provider)

    expect(proposition.sections).toEqual([
      { canon: 'objectif', titreDetecte: 'To fill the tank', etat_confiance: 'infere' },
    ])
    expect(proposition.etapesProposees).toEqual([
      { description: 'Open the tank lid.', etat_confiance: 'infere' },
      { description: 'Close the tank lid.', etat_confiance: 'infere' },
    ])
  })

  it("marque 'a_verifier', jamais 'infere', une proposition dont le texte n'apparaît pas dans le document source (reformulation ou hallucination)", async () => {
    const texteSource = 'Open the tank lid.'
    const reponseIA = 'ETAPE|Soulever le couvercle du réservoir.'
    const provider = providerMock(reponseIA)

    const proposition = await proposerStructureProcedureParIA(texteSource, provider)

    expect(proposition.etapesProposees).toEqual([
      { description: 'Soulever le couvercle du réservoir.', etat_confiance: 'a_verifier' },
    ])
  })

  it("l'ancrage est insensible à la casse et aux espaces multiples, sans devenir permissif au point d'accepter n'importe quoi", async () => {
    const texteSource = 'Open   the Tank Lid.\nShort.'
    const reponseIA = ['ETAPE|open the tank lid.', 'ETAPE|Zzz'].join('\n')
    const provider = providerMock(reponseIA)

    const proposition = await proposerStructureProcedureParIA(texteSource, provider)

    expect(proposition.etapesProposees[0]).toEqual({
      description: 'open the tank lid.',
      etat_confiance: 'infere',
    })
    // "Zzz" (3 lettres) n'apparaît pas dans la source : jamais un faux positif.
    expect(proposition.etapesProposees[1]).toEqual({
      description: 'Zzz',
      etat_confiance: 'a_verifier',
    })
  })

  it("replie sur 'autre' un canon inconnu renvoyé par le modèle, jamais une catégorie fabriquée", async () => {
    const texteSource = 'Titre suspect'
    const reponseIA = 'SECTION|categorie_inventee|Titre suspect'
    const provider = providerMock(reponseIA)

    const proposition = await proposerStructureProcedureParIA(texteSource, provider)

    expect(proposition.sections[0]?.canon).toBe('autre')
  })

  it('ignore silencieusement une ligne mal formée, sans planter, et conserve toujours la réponse brute', async () => {
    const texteSource = 'Open the tank lid.'
    const reponseIA = [
      'Ceci est une phrase explicative hors protocole.',
      'ETAPE|Open the tank lid.',
      'SECTION|objectif',
    ].join('\n')
    const provider = providerMock(reponseIA)

    const proposition = await proposerStructureProcedureParIA(texteSource, provider)

    expect(proposition.etapesProposees).toHaveLength(1)
    expect(proposition.sections).toHaveLength(0)
    expect(proposition.texteReponseBrute).toBe(reponseIA)
  })
})

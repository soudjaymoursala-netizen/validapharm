import { describe, expect, it, vi } from 'vitest'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import { proposerStructureProcedureAvecRepli } from './proposerStructureProcedureAvecRepli'

function providerMock(texteReponse: string): ProviderAdapter {
  return {
    nomAffiche: 'Fournisseur simulé',
    estCloud: true,
    envoyerMessage: vi
      .fn<(mode: ModeUsageIA, contexte: ContexteEnvoi, question: string) => Promise<Reponse>>()
      .mockResolvedValue({ texte: texteReponse, version_moteur: 'v-test', citations: [] }),
  }
}

describe('proposerStructureProcedureAvecRepli (Phase 25, TD-023)', () => {
  it("n'appelle jamais le fournisseur IA quand le parseur déterministe trouve une structure", async () => {
    const texte = ['1 But', 'Décrire la procédure.', '2 Procédure', '- Étape unique.'].join('\n')
    const provider = providerMock('ETAPE|jamais utilisé')

    const proposition = await proposerStructureProcedureAvecRepli(texte, [], provider)

    expect(proposition.source).toBe('deterministe')
    expect(provider.envoyerMessage).not.toHaveBeenCalled()
  })

  it("réplie sur l'IA uniquement quand le parseur déterministe ne trouve strictement rien (aucune section, aucune étape)", async () => {
    const texte = ['To fill the tank', 'Open the tank lid.'].join('\n')
    const provider = providerMock('SECTION|objectif|To fill the tank\nETAPE|Open the tank lid.')

    const proposition = await proposerStructureProcedureAvecRepli(texte, [], provider)

    expect(proposition.source).toBe('ia')
    expect(provider.envoyerMessage).toHaveBeenCalledTimes(1)
    if (proposition.source === 'ia') {
      expect(proposition.etapesProposees[0]?.etat_confiance).toBe('infere')
    }
  })

  it('un tableau Word fourni évite le repli IA même sans texte à en-têtes', async () => {
    const texte = 'Powering on the controller'
    const provider = providerMock('ETAPE|jamais utilisé')

    const proposition = await proposerStructureProcedureAvecRepli(
      texte,
      [{ titreProchePrecedent: null, lignes: [['1', 'Press start.']] }],
      provider,
    )

    expect(proposition.source).toBe('deterministe')
    expect(provider.envoyerMessage).not.toHaveBeenCalled()
    if (proposition.source === 'deterministe') {
      expect(proposition.etapesProposees).toHaveLength(1)
    }
  })
})

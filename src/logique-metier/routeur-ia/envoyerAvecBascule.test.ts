import { describe, expect, test, vi, type Mock } from 'vitest'
import {
  IndisponibleError,
  QuotaExceededError,
  ReponseInvalideError,
  TimeoutError,
} from '../../connecteurs/ia/erreurs'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import { envoyerAvecBascule } from './envoyerAvecBascule'

interface FournisseurMock extends ProviderAdapter {
  envoyerMessage: Mock<
    (mode: ModeUsageIA, contexte: ContexteEnvoi, question: string) => Promise<Reponse>
  >
}

function fournisseur(nomAffiche: string, estCloud: boolean): FournisseurMock {
  return {
    nomAffiche,
    estCloud,
    envoyerMessage: vi.fn(),
  }
}

const reponseOk: Reponse = { texte: 'Réponse', version_moteur: 'v1', citations: [] }

describe('envoyerAvecBascule', () => {
  test('succès du fournisseur principal : aucune bascule', async () => {
    const principal = fournisseur('Claude', true)
    principal.envoyerMessage.mockResolvedValueOnce(reponseOk)
    const local = fournisseur('Ollama', false)

    const resultat = await envoyerAvecBascule(
      principal,
      local,
      'chat_normatif',
      { contenu_joint: false },
      'Question',
    )
    expect(resultat).toEqual({ reponse: reponseOk, fournisseurUtilise: principal, bascule: false })
    expect(local.envoyerMessage).not.toHaveBeenCalled()
  })

  test.each([new TimeoutError(), new IndisponibleError()])(
    '%s : bascule automatique vers le modèle local',
    async (erreur) => {
      const principal = fournisseur('Claude', true)
      principal.envoyerMessage.mockRejectedValueOnce(erreur)
      const local = fournisseur('Ollama', false)
      local.envoyerMessage.mockResolvedValueOnce(reponseOk)

      const resultat = await envoyerAvecBascule(
        principal,
        local,
        'chat_normatif',
        { contenu_joint: false },
        'Question',
      )
      expect(resultat).toEqual({ reponse: reponseOk, fournisseurUtilise: local, bascule: true })
    },
  )

  test.each([new QuotaExceededError(), new ReponseInvalideError()])(
    '%s : jamais de bascule automatique, remontée telle quelle',
    async (erreur) => {
      const principal = fournisseur('Claude', true)
      principal.envoyerMessage.mockRejectedValueOnce(erreur)
      const local = fournisseur('Ollama', false)

      await expect(
        envoyerAvecBascule(principal, local, 'chat_normatif', { contenu_joint: false }, 'Question'),
      ).rejects.toThrow(erreur)
      expect(local.envoyerMessage).not.toHaveBeenCalled()
    },
  )

  test('transmet le contexte contenu_joint et le mode tels quels au fournisseur choisi', async () => {
    const principal = fournisseur('Claude', true)
    principal.envoyerMessage.mockResolvedValueOnce(reponseOk)
    const local = fournisseur('Ollama', false)

    const contexte = { contenu_joint: true as const, contenu: 'Texte', titre_document: 'Titre' }
    await envoyerAvecBascule(principal, local, 'audit_simule', contexte, 'Question')
    expect(principal.envoyerMessage).toHaveBeenCalledWith('audit_simule', contexte, 'Question')
  })
})

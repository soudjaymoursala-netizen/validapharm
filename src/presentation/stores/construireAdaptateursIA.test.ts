import { describe, expect, test, vi, type Mock } from 'vitest'
import { IndisponibleError } from '../../connecteurs/ia/erreurs'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import { adaptateurAvecBascule, construireAdaptateursIA } from './construireAdaptateursIA'

interface FournisseurMock extends ProviderAdapter {
  envoyerMessage: Mock<
    (mode: ModeUsageIA, contexte: ContexteEnvoi, question: string) => Promise<Reponse>
  >
}

function fournisseur(nomAffiche: string, estCloud: boolean): FournisseurMock {
  return { nomAffiche, estCloud, envoyerMessage: vi.fn() }
}

describe('construireAdaptateursIA', () => {
  test('fournisseur local : principal et local sont le même adaptateur Ollama', () => {
    const { principal, local } = construireAdaptateursIA({
      estFournisseurCloud: false,
      nomFournisseurActuel: 'Modèle local (Ollama)',
      relayUrl: undefined,
      jetonRelais: undefined,
    })
    expect(principal).toBe(local)
    expect(principal.estCloud).toBe(false)
  })

  test('fournisseur cloud : principal est un RelayProviderAdapter distinct du local', () => {
    const { principal, local } = construireAdaptateursIA({
      estFournisseurCloud: true,
      nomFournisseurActuel: 'Claude',
      relayUrl: 'https://relais.example',
      jetonRelais: 'jeton-1',
    })
    expect(principal).not.toBe(local)
    expect(principal.estCloud).toBe(true)
    expect(principal.nomAffiche).toBe('Claude')
  })
})

describe('adaptateurAvecBascule', () => {
  const reponseOk: Reponse = { texte: 'Réponse', version_moteur: 'v1', citations: [] }

  test('fournisseur local : appelle directement le local, jamais envoyerAvecBascule', async () => {
    const local = fournisseur('Ollama', false)
    local.envoyerMessage.mockResolvedValueOnce(reponseOk)
    const adaptateur = adaptateurAvecBascule(local, local)

    const reponse = await adaptateur.envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q')
    expect(reponse).toEqual(reponseOk)
    expect(local.envoyerMessage).toHaveBeenCalledTimes(1)
  })

  test('fournisseur cloud en échec : bascule vers le local, résultat transparent', async () => {
    const principal = fournisseur('Claude', true)
    principal.envoyerMessage.mockRejectedValueOnce(new IndisponibleError())
    const local = fournisseur('Ollama', false)
    local.envoyerMessage.mockResolvedValueOnce(reponseOk)

    const adaptateur = adaptateurAvecBascule(principal, local)
    const reponse = await adaptateur.envoyerMessage('chat_normatif', { contenu_joint: false }, 'Q')
    expect(reponse).toEqual(reponseOk)
  })
})

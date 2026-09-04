// Utilitaire de test (TD-046, Phase 39) — jamais importé par le code de
// production (seulement par des `*.test.ts`, jamais tree-shaké dans le
// bundle réel puisque `main.ts` ne le référence jamais). Réutilise
// directement `routerRequete`/les dépôts en mémoire de
// `workers/auth-worker` (déjà testés, 31 tests, `routeur.test.ts`) comme
// faux serveur HTTP pour les tests de store/écran du frontend — plutôt que
// de fabriquer à la main des dizaines de réponses `fetch` canned, forcément
// dérivantes du vrai contrat du Worker au fil du temps. `AuthApiClient.
// test.ts` reste testé isolément avec `vi.stubGlobal('fetch', ...)`
// (même patron que `RelayProviderAdapter.test.ts`) — ce fichier sert les
// tests de plus haut niveau (stores Pinia, composants Vue) qui ont besoin
// d'un backend qui se comporte réellement comme le Worker.
import { vi } from 'vitest'
import { AuditRepoMemoire } from '../../workers/auth-worker/src/repos/auditRepo'
import { ClientsRepoMemoire } from '../../workers/auth-worker/src/repos/clientsRepo'
import { UtilisateursRepoMemoire } from '../../workers/auth-worker/src/repos/utilisateursRepo'
import { routerRequete, type Contexte } from '../../workers/auth-worker/src/routeur'
import { db } from '../persistance/db'
import { useAuthStore } from '../presentation/stores/useAuthStore'
import { useConnexionAuthentificationStore } from '../presentation/stores/useConnexionAuthentificationStore'

export const RELAY_URL_TEST = 'https://auth-test.workers.dev'
const JETON_BOOTSTRAP_TEST = 'jeton-bootstrap-test'
const SECRET_JWT_TEST = 'secret-jwt-test'

/**
 * Installe un faux Worker d'authentification : intercepte `fetch` pour
 * toute URL commençant par `RELAY_URL_TEST` et la route vers
 * `routerRequete` (dépôts en mémoire, état frais à chaque appel). Toute
 * autre URL passe au `fetch` réel (utile si un test mélange plusieurs
 * connecteurs) — appeler `demonter()` dans un `afterEach`.
 */
export function installerFauxWorkerAuth(): { ctx: Contexte; demonter: () => void } {
  const ctx: Contexte = {
    utilisateursRepo: new UtilisateursRepoMemoire(),
    clientsRepo: new ClientsRepoMemoire(),
    auditRepo: new AuditRepoMemoire(),
    secretJwt: SECRET_JWT_TEST,
    jetonBootstrap: JETON_BOOTSTRAP_TEST,
    corsOrigin: '*',
  }

  const fetchReel = globalThis.fetch?.bind(globalThis)
  const fetchFaux = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith(RELAY_URL_TEST)) {
      const requete =
        typeof input === 'string' || input instanceof URL ? new Request(input, init) : input
      return routerRequete(requete, ctx)
    }
    if (!fetchReel) throw new Error(`fetch non stubbé pour une URL hors faux Worker : ${url}`)
    return fetchReel(input, init)
  })
  vi.stubGlobal('fetch', fetchFaux)

  return {
    ctx,
    demonter: () => vi.unstubAllGlobals(),
  }
}

/**
 * Configure `useConnexionAuthentificationStore` (IndexedDB) sur
 * `RELAY_URL_TEST`, crée le premier admin (`/auth/bootstrap-admin`), puis
 * connecte `useAuthStore` (comme le ferait `Login.vue`) — un raccourci
 * pour les tests qui ont seulement besoin d'une session active, sans
 * exercer eux-mêmes le formulaire de connexion.
 */
export async function connecterAdminDeTest(
  email = 'admin@pharmatech.example',
  motDePasse = 'CoffreFort!2026',
): Promise<{ jeton: string }> {
  await useConnexionAuthentificationStore().enregistrer({ relayUrl: RELAY_URL_TEST })

  const reponseBootstrap = await fetch(`${RELAY_URL_TEST}/auth/bootstrap-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      motDePasse,
      nom: 'Lead',
      prenom: 'Quentin',
      jetonBootstrap: JETON_BOOTSTRAP_TEST,
    }),
  })
  if (!reponseBootstrap.ok) {
    throw new Error(`bootstrap-admin a échoué en préparation de test (${reponseBootstrap.status})`)
  }

  const resultat = await useAuthStore().login(email, motDePasse)
  if (!resultat.ok) throw new Error(`login a échoué en préparation de test : ${resultat.erreur}`)

  const jeton = useAuthStore().jeton
  if (!jeton) throw new Error('jeton absent après connexion de test')
  return { jeton }
}

/** Vide les tables IndexedDB touchées par l'authentification — à appeler dans `beforeEach`. */
export async function reinitialiserAuthDeTest(): Promise<void> {
  await db.connexionAuthentification.clear()
  await db.sessionAuthentification.clear()
}

// Utilitaire de test — jamais importé par le code de
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
import { EnvoyeurEmailMemoire } from '../../workers/auth-worker/src/notifications/envoyeurEmail'
import { ACFCRepoMemoire } from '../../workers/auth-worker/src/repos/acfcRepo'
import { AuditRepoMemoire } from '../../workers/auth-worker/src/repos/auditRepo'
import { ClientsRepoMemoire } from '../../workers/auth-worker/src/repos/clientsRepo'
import { ContentPlanRepoMemoire } from '../../workers/auth-worker/src/repos/contentPlanRepo'
import { CSVAssessmentRepoMemoire } from '../../workers/auth-worker/src/repos/csvAssessmentRepo'
import { DocumentsNormatifsRepoMemoire } from '../../workers/auth-worker/src/repos/documentsNormatifsRepo'
import { EvidenceRepoMemoire } from '../../workers/auth-worker/src/repos/evidenceRepo'
import { ExecutionRepoMemoire } from '../../workers/auth-worker/src/repos/executionRepo'
import { ImpactAssessmentRepoMemoire } from '../../workers/auth-worker/src/repos/impactAssessmentRepo'
import { IntegrationRepoMemoire } from '../../workers/auth-worker/src/repos/integrationRepo'
import { KnowledgeEngineRepoMemoire } from '../../workers/auth-worker/src/repos/knowledgeEngineRepo'
import { OrganisationRepoMemoire } from '../../workers/auth-worker/src/repos/organisationRepo'
import { ParametersRepoMemoire } from '../../workers/auth-worker/src/repos/parametersRepo'
import { ParametresInstallationRepoMemoire } from '../../workers/auth-worker/src/repos/parametresInstallationRepo'
import { ProjectDocumentsRepoMemoire } from '../../workers/auth-worker/src/repos/projectDocumentsRepo'
import { ProcessContextRepoMemoire } from '../../workers/auth-worker/src/repos/processContextRepo'
import { ProjectsRepoMemoire } from '../../workers/auth-worker/src/repos/projectsRepo'
import { QualityEventRepoMemoire } from '../../workers/auth-worker/src/repos/qualityEventRepo'
import { RiskAssessmentRepoMemoire } from '../../workers/auth-worker/src/repos/riskAssessmentRepo'
import { TestDefinitionRepoMemoire } from '../../workers/auth-worker/src/repos/testDefinitionRepo'
import { SectionsRepoMemoire } from '../../workers/auth-worker/src/repos/sectionsRepo'
import { StockageBinaireRepoMemoire } from '../../workers/auth-worker/src/repos/stockageBinaireRepo'
import { StructureSystemeRepoMemoire } from '../../workers/auth-worker/src/repos/structureSystemeRepo'
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
    parametresInstallationRepo: new ParametresInstallationRepoMemoire(),
    documentsNormatifsRepo: new DocumentsNormatifsRepoMemoire(),
    stockageBinaireRepo: new StockageBinaireRepoMemoire(),
    structureSystemeRepo: new StructureSystemeRepoMemoire(),
    organisationRepo: new OrganisationRepoMemoire(),
    projectsRepo: new ProjectsRepoMemoire(),
    sectionsRepo: new SectionsRepoMemoire(),
    projectDocumentsRepo: new ProjectDocumentsRepoMemoire(),
    acfcRepo: new ACFCRepoMemoire(),
    parametersRepo: new ParametersRepoMemoire(),
    impactAssessmentRepo: new ImpactAssessmentRepoMemoire(),
    csvAssessmentRepo: new CSVAssessmentRepoMemoire(),
    riskAssessmentRepo: new RiskAssessmentRepoMemoire(),
    processContextRepo: new ProcessContextRepoMemoire(),
    qualityEventRepo: new QualityEventRepoMemoire(),
    testDefinitionRepo: new TestDefinitionRepoMemoire(),
    executionRepo: new ExecutionRepoMemoire(),
    evidenceRepo: new EvidenceRepoMemoire(),
    knowledgeEngineRepo: new KnowledgeEngineRepoMemoire(),
    contentPlanRepo: new ContentPlanRepoMemoire(),
    integrationRepo: new IntegrationRepoMemoire(),
    auditRepo: new AuditRepoMemoire(),
    secretJwt: SECRET_JWT_TEST,
    jetonBootstrap: JETON_BOOTSTRAP_TEST,
    corsOrigin: '*',
    envoyeurEmail: new EnvoyeurEmailMemoire(),
    urlApplication: 'https://validapharm-test.pages.dev',
    googleOAuthClientId: 'client-oauth-test.apps.googleusercontent.com',
    googleOAuthClientSecret: 'secret-oauth-test',
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

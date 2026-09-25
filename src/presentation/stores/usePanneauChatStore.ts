import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AiChatSessionLogWire } from '../../connecteurs/auth/AuthApiClient'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import type { AiChatSessionLog, Section } from '../../logique-metier/domaine/types'
import { envoyerAvecBascule } from '../../logique-metier/routeur-ia/envoyerAvecBascule'
import { deriveVersionDetectee } from '../../logique-metier/routeur-ia/qualificationFiabilite'
import { aiChatSessionLogsAMigrer } from '../../persistance/db'
import { construireAdaptateursIA } from './construireAdaptateursIA'
import { useAuthStore } from './useAuthStore'
import { useClientConfigStore } from './useClientConfigStore'
import { useConnexionRelaisIAStore } from './useConnexionRelaisIAStore'
import { sectionWireVersDomaine } from './useSectionsStore'

function aiChatSessionLogWireVersDomaine(w: AiChatSessionLogWire): AiChatSessionLog {
  return {
    id: w.id,
    client_id: w.clientId,
    started_at: w.startedAt,
    ended_at: w.endedAt,
    mode: w.mode as ModeUsageIA,
    ai_provider: w.aiProvider,
    moteur_version: w.moteurVersion,
    document_joint: w.documentJoint,
  }
}

function aiChatSessionLogDomaineVersWire(e: AiChatSessionLog): AiChatSessionLogWire {
  return {
    id: e.id,
    clientId: e.client_id,
    startedAt: e.started_at,
    endedAt: e.ended_at,
    mode: e.mode,
    aiProvider: e.ai_provider,
    moteurVersion: e.moteur_version,
    documentJoint: e.document_joint,
  }
}

export const NOM_FOURNISSEUR_LOCAL = 'Modèle local (Ollama)'

/**
 * Libellé affiché à l'utilisateur pour un fournisseur IA — jamais le nom du
 * fournisseur réel (Claude/OpenAI/Copilot/DeepSeek), quel que soit celui
 * effectivement câblé côté relais (demande explicite de l'utilisateur,
 * 07/09/2026) : seul « Assistant IA » est montré pour tout fournisseur
 * cloud, la distinction cloud/local restant seule pertinente à l'écran
 * (bascule automatique vers le modèle local en cas d'indisponibilité).
 */
export function libelleFournisseurAffiche(idFournisseur: string): string {
  return idFournisseur === 'local' ? NOM_FOURNISSEUR_LOCAL : 'Assistant IA'
}

export interface SectionDisponibleAJoindre {
  id: string
  titre: string
  projetNom: string
}

export interface MessageChatAffiche {
  question: string
  mode: ModeUsageIA
  reponse: Reponse
  fournisseurUtilise: string
  bascule: boolean
  documentJoint: boolean
  titreDocumentJoint: string | null
}

/**
 * Panneau Chat expert — orchestre l'envoi via le
 * routeur IA (`envoyerAvecBascule`) et journalise la session (pas le
 * contenu échangé) à la fermeture.
 */
export const usePanneauChatStore = defineStore('panneauChat', () => {
  const configStore = useClientConfigStore()
  const relaisStore = useConnexionRelaisIAStore()

  const clientId = ref<string | null>(null)
  const messages = ref<MessageChatAffiche[]>([])
  const envoiEnCours = ref(false)
  const erreur = ref<string | null>(null)
  const sessionDemarreeA = ref<string | null>(null)
  const documentJointSession = ref(false)
  const dernierMoteurVersion = ref<string | null>(null)
  const enLigne = ref(navigator.onLine)

  const fournisseurActuel = computed(() => configStore.config?.ai_provider ?? 'openai')
  const estFournisseurCloud = computed(() => fournisseurActuel.value !== 'local')
  const nomFournisseurActuel = computed(() => libelleFournisseurAffiche(fournisseurActuel.value))

  /**
   * Dérive détectée entre le dernier moteur journalisé et la version
   * qualifiée — **pour le mode donné** : la qualification de
   * chat_normatif ne dit rien de la fiabilité du mode audit_simule, et
   * réciproquement.
   */
  function alerteDerive(mode: ModeUsageIA): boolean {
    return deriveVersionDetectee(
      dernierMoteurVersion.value,
      configStore.config?.ai_provider_reliability_qualification[mode] ?? null,
    )
  }

  function rafraichirConnectivite(): void {
    enLigne.value = navigator.onLine
  }

  /**
   * Envoie au serveur les `AiChatSessionLog` capturés depuis l'ancienne
   * table IndexedDB locale (`aiChatSessionLogsAMigrer`) juste avant sa
   * suppression — n'a d'effet réel qu'une seule fois (voir migration
   * Dexie v56, `persistance/db.ts`). Même patron d'idempotence que
   * `migrerProceduresLocalVersServeur` : un seul appel groupé, l'existant
   * côté serveur gagne toujours.
   */
  async function migrerAiChatSessionLogsLocalVersServeur(idClient: string): Promise<void> {
    const entreesDuClient = aiChatSessionLogsAMigrer.filter((e) => e.client_id === idClient)
    if (entreesDuClient.length === 0) return

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return
    const resultat = await api.migrerAiChatSessionLogsLocal(authStore.jeton, idClient, {
      aiChatSessionLogs: entreesDuClient.map(aiChatSessionLogDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration du journal de chat : ${resultat.erreur}`)
    }
    for (const entree of entreesDuClient) {
      const index = aiChatSessionLogsAMigrer.indexOf(entree)
      if (index !== -1) aiChatSessionLogsAMigrer.splice(index, 1)
    }
  }

  async function demarrerSession(idClient: string): Promise<void> {
    clientId.value = idClient
    messages.value = []
    erreur.value = null
    documentJointSession.value = false
    sessionDemarreeA.value = new Date().toISOString()
    rafraichirConnectivite()

    await configStore.charger(idClient)
    await relaisStore.charger()

    try {
      await migrerAiChatSessionLogsLocalVersServeur(idClient)
    } catch {
      // Nouvel essai à la prochaine session — ne bloque jamais l'ouverture du panneau.
    }

    try {
      const authStore = useAuthStore()
      const api = await authStore.client()
      if (!api || !authStore.jeton) {
        dernierMoteurVersion.value = null
        return
      }
      const resultat = await api.obtenirAiChatSessionLogs(authStore.jeton, idClient)
      const sessionsAnterieures = resultat.ok
        ? resultat.donnees.aiChatSessionLogs
            .map(aiChatSessionLogWireVersDomaine)
            .sort((a, b) => a.started_at.localeCompare(b.started_at))
        : []
      dernierMoteurVersion.value = sessionsAnterieures.at(-1)?.moteur_version ?? null
    } catch {
      // Panne réseau réelle : jamais un plantage à l'ouverture du panneau.
      dernierMoteurVersion.value = null
    }
  }

  function construireAdaptateurs(): { principal: ProviderAdapter; local: ProviderAdapter } {
    return construireAdaptateursIA({
      estFournisseurCloud: estFournisseurCloud.value,
      nomFournisseurActuel: nomFournisseurActuel.value,
      ...relaisStore.accesRelais(),
    })
  }

  /**
   * @param question Texte réellement envoyé au fournisseur — pour le mode
   * `audit_simule`, l'appelant y passe le prompt déjà construit par
   * `construirePromptAuditSimule`, jamais la question brute.
   * @param questionAffichee Texte affiché dans l'historique du panneau —
   * par défaut identique à `question` ; permet à l'écran de conserver la
   * question brute de l'utilisateur à l'affichage même quand `question`
   * porte un prompt engineered plus long (mode audit simulé).
   */
  async function envoyerQuestion(
    question: string,
    mode: ModeUsageIA,
    contexte: ContexteEnvoi,
    titreDocumentJoint: string | null,
    questionAffichee: string = question,
  ): Promise<void> {
    rafraichirConnectivite()
    envoiEnCours.value = true
    erreur.value = null
    try {
      const { principal, local } = construireAdaptateurs()
      const resultat = estFournisseurCloud.value
        ? await envoyerAvecBascule(principal, local, mode, contexte, question)
        : {
            reponse: await local.envoyerMessage(mode, contexte, question),
            fournisseurUtilise: local,
            bascule: false,
          }

      messages.value = [
        ...messages.value,
        {
          question: questionAffichee,
          mode,
          reponse: resultat.reponse,
          fournisseurUtilise: resultat.fournisseurUtilise.nomAffiche,
          bascule: resultat.bascule,
          documentJoint: contexte.contenu_joint,
          titreDocumentJoint: contexte.contenu_joint ? titreDocumentJoint : null,
        },
      ]
      if (contexte.contenu_joint) documentJointSession.value = true
      if (resultat.reponse.version_moteur) {
        dernierMoteurVersion.value = resultat.reponse.version_moteur
      }
    } catch (e) {
      // Toute erreur d'envoi (y compris Quota/ReponseInvalide, jamais
      // basculées automatiquement par le routeur) est affichée
      // telle quelle, jamais masquée par un plantage silencieux.
      erreur.value = e instanceof Error ? e.message : "Erreur inconnue lors de l'envoi."
    } finally {
      envoiEnCours.value = false
    }
  }

  /**
   * Sections disponibles à joindre (accès à un document précis
   * uniquement via une action explicite) — celles des projets de ce
   * client, jamais celles d'un autre client.
   */
  async function listerSectionsDisponibles(idClient: string): Promise<SectionDisponibleAJoindre[]> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return []
    const resultat = await api.listerProjetsClient(authStore.jeton, idClient)
    if (!resultat.ok) return []
    const projets = resultat.donnees.projects
    const sectionsParProjet = await Promise.all(
      projets.map(async (projet) => {
        const resultatSections = await api.listerSectionsProjet(
          authStore.jeton as string,
          projet.id,
        )
        return resultatSections.ok
          ? resultatSections.donnees.sections.map(sectionWireVersDomaine)
          : []
      }),
    )
    return projets.flatMap((projet, index) =>
      (sectionsParProjet[index] ?? []).map((section) => ({
        id: section.id,
        titre: section.meta.titre || section.template_type,
        projetNom: projet.name,
      })),
    )
  }

  async function obtenirSection(sectionId: string): Promise<Section | undefined> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return undefined
    const resultat = await api.obtenirSection(authStore.jeton, sectionId)
    return resultat.ok ? sectionWireVersDomaine(resultat.donnees.section) : undefined
  }

  async function fermerSession(mode: ModeUsageIA): Promise<void> {
    if (!clientId.value || !sessionDemarreeA.value) return
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (api && authStore.jeton) {
      try {
        await api.creerAiChatSessionLog(authStore.jeton, clientId.value, {
          startedAt: sessionDemarreeA.value,
          endedAt: new Date().toISOString(),
          mode,
          aiProvider: fournisseurActuel.value,
          moteurVersion: dernierMoteurVersion.value,
          documentJoint: documentJointSession.value,
        })
      } catch {
        // Panne réseau réelle : la fermeture du panneau ne doit jamais
        // échouer pour un simple journal — perte assumée de cette entrée.
      }
    }
    clientId.value = null
    sessionDemarreeA.value = null
  }

  return {
    messages,
    envoiEnCours,
    erreur,
    enLigne,
    fournisseurActuel,
    estFournisseurCloud,
    nomFournisseurActuel,
    alerteDerive,
    demarrerSession,
    envoyerQuestion,
    fermerSession,
    rafraichirConnectivite,
    listerSectionsDisponibles,
    obtenirSection,
  }
})

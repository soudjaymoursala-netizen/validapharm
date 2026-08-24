import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { OllamaProviderAdapter } from '../../connecteurs/ia/OllamaProviderAdapter'
import type {
  ContexteEnvoi,
  ModeUsageIA,
  ProviderAdapter,
  Reponse,
} from '../../connecteurs/ia/ProviderAdapter'
import { RelayProviderAdapter } from '../../connecteurs/ia/RelayProviderAdapter'
import type { AiChatSessionLog } from '../../logique-metier/domaine/types'
import { envoyerAvecBascule } from '../../logique-metier/routeur-ia/envoyerAvecBascule'
import { deriveVersionDetectee } from '../../logique-metier/routeur-ia/qualificationFiabilite'
import { db } from '../../persistance/db'
import { useClientConfigStore } from './useClientConfigStore'
import { useConnexionRelaisIAStore } from './useConnexionRelaisIAStore'

const NOMS_FOURNISSEURS: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  copilot: 'Copilot',
  deepseek: 'DeepSeek',
  local: 'Modèle local (Ollama)',
}

// Aucun écran de sélection du modèle local n'est spécifié à ce stade ;
// valeur par défaut documentée plutôt que silencieusement câblée en dur
// sans trace (backlog : rendre configurable si un client utilise un
// modèle Ollama différent).
const MODELE_OLLAMA_PAR_DEFAUT = 'llama3'

export interface SectionDisponibleAJoindre {
  id: string
  titre: string
  projetNom: string
}

export interface MessageChatAffiche {
  question: string
  reponse: Reponse
  fournisseurUtilise: string
  bascule: boolean
  documentJoint: boolean
  titreDocumentJoint: string | null
}

/**
 * Panneau Chat expert (FDS §3.4, FS §4.4) — orchestre l'envoi via le
 * routeur IA (`envoyerAvecBascule`) et journalise la session (pas le
 * contenu échangé) à la fermeture, conformément à URS-F-037.
 *
 * @requirement FDS §3.4, URS-F-030 à 037, URS-F-032quinquies
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

  const fournisseurActuel = computed(() => configStore.config?.ai_provider ?? 'claude')
  const estFournisseurCloud = computed(() => fournisseurActuel.value !== 'local')
  const nomFournisseurActuel = computed(
    () => NOMS_FOURNISSEURS[fournisseurActuel.value] ?? fournisseurActuel.value,
  )

  /** URS-F-032quinquies : dérive détectée entre le dernier moteur journalisé et la version qualifiée. */
  const alerteDerive = computed(() =>
    deriveVersionDetectee(
      dernierMoteurVersion.value,
      configStore.config?.ai_provider_reliability_qualification ?? null,
    ),
  )

  function rafraichirConnectivite(): void {
    enLigne.value = navigator.onLine
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

    const sessionsAnterieures = await db.aiChatSessionLogs
      .where('client_id')
      .equals(idClient)
      .sortBy('started_at')
    dernierMoteurVersion.value = sessionsAnterieures.at(-1)?.moteur_version ?? null
  }

  function construireAdaptateurs(): { principal: ProviderAdapter; local: ProviderAdapter } {
    const local = new OllamaProviderAdapter({ modele: MODELE_OLLAMA_PAR_DEFAUT })
    if (!estFournisseurCloud.value) {
      return { principal: local, local }
    }
    const principal = new RelayProviderAdapter({
      relayUrl: relaisStore.connexion?.relayUrl ?? '',
      jeton: relaisStore.connexion?.jeton,
      nomAffiche: nomFournisseurActuel.value,
    })
    return { principal, local }
  }

  async function envoyerQuestion(
    question: string,
    mode: ModeUsageIA,
    contexte: ContexteEnvoi,
    titreDocumentJoint: string | null,
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
          question,
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
      // basculées automatiquement par le routeur — SDS §6) est affichée
      // telle quelle, jamais masquée par un plantage silencieux.
      erreur.value = e instanceof Error ? e.message : "Erreur inconnue lors de l'envoi."
    } finally {
      envoiEnCours.value = false
    }
  }

  /**
   * Sections disponibles à joindre (URS-F-031 : accès à un document précis
   * uniquement via une action explicite) — celles des projets de ce
   * client, jamais celles d'un autre client (URS-F-024).
   */
  async function listerSectionsDisponibles(idClient: string): Promise<SectionDisponibleAJoindre[]> {
    const projets = await db.projects.where('client_id').equals(idClient).toArray()
    const sectionsParProjet = await Promise.all(
      projets.map((projet) => db.sections.where('project_id').equals(projet.id).toArray()),
    )
    return projets.flatMap((projet, index) =>
      (sectionsParProjet[index] ?? []).map((section) => ({
        id: section.id,
        titre: section.meta.titre || section.template_type,
        projetNom: projet.name,
      })),
    )
  }

  async function obtenirSection(sectionId: string) {
    return db.sections.get(sectionId)
  }

  async function fermerSession(mode: ModeUsageIA): Promise<void> {
    if (!clientId.value || !sessionDemarreeA.value) return
    const entree: AiChatSessionLog = {
      id: crypto.randomUUID(),
      client_id: clientId.value,
      started_at: sessionDemarreeA.value,
      ended_at: new Date().toISOString(),
      mode,
      ai_provider: fournisseurActuel.value,
      moteur_version: dernierMoteurVersion.value,
      document_joint: documentJointSession.value,
    }
    await db.aiChatSessionLogs.add(entree)
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

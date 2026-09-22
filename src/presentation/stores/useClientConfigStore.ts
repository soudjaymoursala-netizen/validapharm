import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ClientConfigWire,
  QualificationFiabiliteIAWire,
} from '../../connecteurs/auth/AuthApiClient'
import type { ModeUsageIA } from '../../connecteurs/ia/ProviderAdapter'
import type { ClientConfig, QualificationFiabiliteIA } from '../../logique-metier/domaine/types'
import { clientConfigsAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export interface SaisieQualification {
  date: string
  resultat: string
  qualification_test_set_id: string
  qualification_test_set_version: string
  moteur_version_qualifiee: string | null
}

const FOURNISSEUR_PAR_DEFAUT = 'openai'

function qualificationWireVersDomaine(w: QualificationFiabiliteIAWire): QualificationFiabiliteIA {
  return {
    date: w.date,
    resultat: w.resultat,
    qualification_test_set_id: w.qualificationTestSetId,
    qualification_test_set_version: w.qualificationTestSetVersion,
    moteur_version_qualifiee: w.moteurVersionQualifiee,
  }
}

function qualificationDomaineVersWire(q: QualificationFiabiliteIA): QualificationFiabiliteIAWire {
  return {
    date: q.date,
    resultat: q.resultat,
    qualificationTestSetId: q.qualification_test_set_id,
    qualificationTestSetVersion: q.qualification_test_set_version,
    moteurVersionQualifiee: q.moteur_version_qualifiee,
  }
}

function clientConfigWireVersDomaine(w: ClientConfigWire): ClientConfig {
  return {
    client_id: w.clientId,
    ai_provider: w.aiProvider,
    ai_provider_conditions_acquittees: w.aiProviderConditionsAcquittees,
    ai_provider_reliability_qualification: {
      chat_normatif: w.aiProviderReliabilityQualification.chat_normatif
        ? qualificationWireVersDomaine(w.aiProviderReliabilityQualification.chat_normatif)
        : null,
      audit_simule: w.aiProviderReliabilityQualification.audit_simule
        ? qualificationWireVersDomaine(w.aiProviderReliabilityQualification.audit_simule)
        : null,
    },
    export_template_id: w.exportTemplateId,
    consent_telemetry: {
      granted: w.consentTelemetry.granted,
      date: w.consentTelemetry.date,
      revocable_at_any_time: true,
    },
  }
}

function clientConfigDomaineVersWire(c: ClientConfig): Omit<ClientConfigWire, 'clientId'> {
  return {
    aiProvider: c.ai_provider,
    aiProviderConditionsAcquittees: c.ai_provider_conditions_acquittees,
    aiProviderReliabilityQualification: {
      chat_normatif: c.ai_provider_reliability_qualification.chat_normatif
        ? qualificationDomaineVersWire(c.ai_provider_reliability_qualification.chat_normatif)
        : null,
      audit_simule: c.ai_provider_reliability_qualification.audit_simule
        ? qualificationDomaineVersWire(c.ai_provider_reliability_qualification.audit_simule)
        : null,
    },
    exportTemplateId: c.export_template_id,
    consentTelemetry: {
      granted: c.consent_telemetry.granted,
      date: c.consent_telemetry.date,
      revocableAtAnyTime: c.consent_telemetry.revocable_at_any_time,
    },
  }
}

/** Aucune qualification pour aucun mode — jamais un mode oublié dans le `Record`. */
function qualificationVide(): ClientConfig['ai_provider_reliability_qualification'] {
  return { chat_normatif: null, audit_simule: null }
}

function configParDefaut(clientId: string): ClientConfig {
  return {
    client_id: clientId,
    ai_provider: FOURNISSEUR_PAR_DEFAUT,
    ai_provider_conditions_acquittees: null,
    ai_provider_reliability_qualification: qualificationVide(),
    export_template_id: null,
    consent_telemetry: { granted: false, date: null, revocable_at_any_time: true },
  }
}

/**
 * Store de configuration IA par client (`client_config`) — choix
 * du fournisseur, accusé des conditions de traitement,
 * qualification de fiabilité. Isolé par `client_id`,
 * comme `useConnexionDriveStore` — jamais un enregistrement global,
 * contrairement au relais lui-même (`useConnexionRelaisIAStore`).
 * Désormais stocké côté Worker/D1 (Phase 9f du chantier de migration D1,
 * dernière phase du chantier) plutôt que dans IndexedDB par navigateur.
 */
export const useClientConfigStore = defineStore('clientConfig', () => {
  const config = ref<ClientConfig | null>(null)
  const enChargement = ref(false)

  /**
   * Envoie au serveur la configuration capturée depuis l'ancienne table
   * IndexedDB locale (`clientConfigsAMigrer`) juste avant sa suppression
   * — n'a d'effet réel qu'une seule fois par client (voir migration
   * Dexie v59, `persistance/db.ts`). L'existant côté serveur gagne
   * toujours.
   */
  async function migrerClientConfigLocaleVersServeur(clientId: string): Promise<void> {
    const index = clientConfigsAMigrer.findIndex((c) => c.client_id === clientId)
    if (index === -1) return
    const locale = clientConfigsAMigrer[index]
    if (!locale) return

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return
    const existant = await api.obtenirClientConfig(authStore.jeton, clientId)
    if (existant.ok && existant.donnees.clientConfig === null) {
      await api.enregistrerClientConfig(
        authStore.jeton,
        clientId,
        clientConfigDomaineVersWire(locale),
      )
    }
    clientConfigsAMigrer.splice(index, 1)
  }

  async function obtenirOuCreer(clientId: string): Promise<ClientConfig> {
    try {
      await migrerClientConfigLocaleVersServeur(clientId)
    } catch {
      // Nouvel essai au prochain appel — ne bloque jamais l'écran.
    }

    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return configParDefaut(clientId)
    const resultat = await api.obtenirClientConfig(authStore.jeton, clientId)
    return resultat.ok && resultat.donnees.clientConfig
      ? clientConfigWireVersDomaine(resultat.donnees.clientConfig)
      : configParDefaut(clientId)
  }

  async function enregistrer(clientId: string, misAJour: ClientConfig): Promise<void> {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return
    const resultat = await api.enregistrerClientConfig(
      authStore.jeton,
      clientId,
      clientConfigDomaineVersWire(misAJour),
    )
    if (resultat.ok) config.value = clientConfigWireVersDomaine(resultat.donnees.clientConfig)
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      config.value = await obtenirOuCreer(clientId)
    } finally {
      enChargement.value = false
    }
  }

  /**
   * Changer de fournisseur invalide l'accusé de conditions précédent
   * (propre à l'ancien fournisseur) — jamais réinterprété comme valable
   * pour le nouveau ; la qualification de
   * fiabilité est également remise à zéro, une qualification ne valant
   * que pour le fournisseur qu'elle a évalué.
   */
  async function definirFournisseur(clientId: string, fournisseur: string): Promise<void> {
    const actuel = await obtenirOuCreer(clientId)
    const misAJour: ClientConfig = {
      ...actuel,
      ai_provider: fournisseur,
      ai_provider_conditions_acquittees: null,
      ai_provider_reliability_qualification: qualificationVide(),
    }
    await enregistrer(clientId, misAJour)
  }

  async function acquitterConditions(clientId: string, fournisseur: string): Promise<void> {
    const actuel = await obtenirOuCreer(clientId)
    const misAJour: ClientConfig = {
      ...actuel,
      ai_provider_conditions_acquittees: { fournisseur, date: new Date().toISOString() },
    }
    await enregistrer(clientId, misAJour)
  }

  /**
   * Enregistre la qualification de fiabilité **pour le mode donné
   * uniquement** — la qualification de l'autre
   * mode n'est jamais affectée, elles ne partagent pas le même profil de
   * risque.
   */
  async function enregistrerQualification(
    clientId: string,
    mode: ModeUsageIA,
    saisie: SaisieQualification,
  ): Promise<void> {
    const actuel = await obtenirOuCreer(clientId)
    const misAJour: ClientConfig = {
      ...actuel,
      ai_provider_reliability_qualification: {
        ...actuel.ai_provider_reliability_qualification,
        [mode]: { ...saisie },
      },
    }
    await enregistrer(clientId, misAJour)
  }

  return {
    config,
    enChargement,
    charger,
    definirFournisseur,
    acquitterConditions,
    enregistrerQualification,
  }
})

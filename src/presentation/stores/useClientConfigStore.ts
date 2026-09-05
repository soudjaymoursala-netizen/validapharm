import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModeUsageIA } from '../../connecteurs/ia/ProviderAdapter'
import type { ClientConfig } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'

export interface SaisieQualification {
  date: string
  resultat: string
  qualification_test_set_id: string
  qualification_test_set_version: string
  moteur_version_qualifiee: string | null
}

const FOURNISSEUR_PAR_DEFAUT = 'claude'

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
 */
export const useClientConfigStore = defineStore('clientConfig', () => {
  const config = ref<ClientConfig | null>(null)
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      config.value = (await db.clientConfigs.get(clientId)) ?? configParDefaut(clientId)
    } finally {
      enChargement.value = false
    }
  }

  async function obtenirOuCreer(clientId: string): Promise<ClientConfig> {
    return (await db.clientConfigs.get(clientId)) ?? configParDefaut(clientId)
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
    await db.clientConfigs.put(misAJour)
    config.value = misAJour
  }

  async function acquitterConditions(clientId: string, fournisseur: string): Promise<void> {
    const actuel = await obtenirOuCreer(clientId)
    const misAJour: ClientConfig = {
      ...actuel,
      ai_provider_conditions_acquittees: { fournisseur, date: new Date().toISOString() },
    }
    await db.clientConfigs.put(misAJour)
    config.value = misAJour
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
    await db.clientConfigs.put(misAJour)
    config.value = misAJour
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

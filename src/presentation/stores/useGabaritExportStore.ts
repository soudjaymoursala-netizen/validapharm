import { defineStore } from 'pinia'
import { ref } from 'vue'
import { verifierGabaritExportClient } from '../../connecteurs/office/GenerationDocxAdapter'
import type { GabaritExportClient } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'

export type ResultatImportGabarit =
  { ok: true; gabarit: GabaritExportClient } | { ok: false; tagsManquants: string[] }

/**
 * Store des gabarits d'export `.docx` personnalisés (Phase 26, TD-024,
 * URS-F-023 à 026) — isolation stricte par `client_id`, même principe que
 * `useProcedureStore`/`AssetNode` (jamais de mélange entre deux clients).
 *
 * **Garde-fou non négociable (URS-F-026)** : un gabarit dont il manque un
 * élément obligatoire (bloc de signatures, historique des révisions) est
 * refusé à l'import — jamais enregistré en base "à corriger plus tard".
 */
export const useGabaritExportStore = defineStore('gabaritExport', () => {
  const gabarits = ref<GabaritExportClient[]>([])
  const enChargement = ref(false)

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      gabarits.value = await db.gabaritsExportClient.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function importerGabarit(
    clientId: string,
    nom: string,
    fichier: ArrayBuffer,
  ): Promise<ResultatImportGabarit> {
    const verification = verifierGabaritExportClient(fichier)
    if (verification.tagsObligatoiresManquants.length > 0) {
      return { ok: false, tagsManquants: verification.tagsObligatoiresManquants }
    }

    const gabarit: GabaritExportClient = {
      id: crypto.randomUUID(),
      client_id: clientId,
      nom,
      fichier,
      tags_trouves: verification.tagsTrouves,
      created_at: new Date().toISOString(),
    }
    await db.gabaritsExportClient.put(gabarit)
    gabarits.value = [...gabarits.value, gabarit]
    return { ok: true, gabarit }
  }

  async function supprimerGabarit(id: string): Promise<void> {
    await db.gabaritsExportClient.delete(id)
    gabarits.value = gabarits.value.filter((g) => g.id !== id)
  }

  return { gabarits, enChargement, charger, importerGabarit, supprimerGabarit }
})

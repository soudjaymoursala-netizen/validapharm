import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GabaritExportClientWire } from '../../connecteurs/auth/AuthApiClient'
import { verifierGabaritExportClient } from '../../connecteurs/office/GenerationDocxAdapter'
import type { GabaritExportClient } from '../../logique-metier/domaine/types'
import { gabaritsExportClientAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export type ResultatImportGabarit =
  { ok: true; gabarit: GabaritExportClient } | { ok: false; tagsManquants: string[] }

function gabaritWireVersDomaine(
  w: GabaritExportClientWire,
  fichier: ArrayBuffer,
): GabaritExportClient {
  return {
    id: w.id,
    client_id: w.clientId,
    nom: w.nom,
    fichier,
    tags_trouves: w.tagsTrouves,
    created_at: w.createdAt,
  }
}

/**
 * Store des gabarits d'export `.docx` personnalisés
 * — isolation stricte par `client_id`, même principe que
 * `useProcedureStore`/`AssetNode` (jamais de mélange entre deux clients).
 *
 * **Garde-fou non négociable** : un gabarit dont il manque un
 * élément obligatoire (bloc de signatures, historique des révisions) est
 * refusé à l'import — jamais enregistré en base "à corriger plus tard".
 * Cette vérification (`verifierGabaritExportClient`, bibliothèque
 * `docxtemplater`/`pizzip`) reste côté client — le serveur (Worker) fait
 * confiance aux `tagsTrouves` déjà vérifiés avant l'appel.
 */
export const useGabaritExportStore = defineStore('gabaritExport', () => {
  const gabarits = ref<GabaritExportClient[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que les autres stores de ce chantier. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les `GabaritExportClient` capturés depuis
   * l'ancienne table IndexedDB locale (`gabaritsExportClientAMigrer`)
   * juste avant sa suppression — n'a d'effet réel qu'une seule fois (voir
   * migration Dexie v55, `persistance/db.ts`). Comme
   * `migrerDocumentsLocauxVersServeur`, la route Worker traite un gabarit
   * à la fois (corps `multipart/form-data`, fichier `.docx` binaire) :
   * chaque gabarit n'est retiré de la file qu'après confirmation serveur
   * individuelle.
   */
  async function migrerGabaritsExportClientLocalVersServeur(clientId: string): Promise<void> {
    const { api, jeton } = await obtenirApi()
    let index = 0
    while (index < gabaritsExportClientAMigrer.length) {
      const ancien = gabaritsExportClientAMigrer[index]
      if (!ancien) break
      if (ancien.client_id !== clientId) {
        index++
        continue
      }
      const resultat = await api.migrerGabaritExportClientLocal(jeton, clientId, {
        id: ancien.id,
        nom: ancien.nom,
        tagsTrouves: ancien.tags_trouves,
        fichier: new Blob([ancien.fichier]),
      })
      if (!resultat.ok) {
        throw new Error(`Échec de la migration du gabarit : ${resultat.erreur}`)
      }
      gabaritsExportClientAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerGabaritsExportClientLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirGabaritsExportClient(jeton, clientId)
      if (resultat.ok) {
        gabarits.value = await Promise.all(
          resultat.donnees.gabarits.map(async (w) => {
            const contenu = await api.obtenirContenuGabaritExportClient(jeton, w.id)
            const fichier = contenu.ok ? await contenu.blob.arrayBuffer() : new ArrayBuffer(0)
            return gabaritWireVersDomaine(w, fichier)
          }),
        )
      } else {
        gabarits.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      gabarits.value = []
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

    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerGabaritExportClient(jeton, clientId, {
      nom,
      tagsTrouves: verification.tagsTrouves,
      fichier: new Blob([fichier]),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de l'import du gabarit : ${resultat.erreur}`)
    }
    const gabarit = gabaritWireVersDomaine(resultat.donnees.gabarit, fichier)
    gabarits.value = [...gabarits.value, gabarit]
    return { ok: true, gabarit }
  }

  async function supprimerGabarit(id: string): Promise<void> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.supprimerGabaritExportClient(jeton, id)
    if (!resultat.ok) {
      throw new Error(`Échec de la suppression du gabarit : ${resultat.erreur}`)
    }
    gabarits.value = gabarits.value.filter((g) => g.id !== id)
  }

  return { gabarits, enChargement, charger, importerGabarit, supprimerGabarit }
})

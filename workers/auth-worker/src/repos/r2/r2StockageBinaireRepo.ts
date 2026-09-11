import type { R2Bucket } from '../../r2Types'
import type { StockageBinaireRepo } from '../stockageBinaireRepo'

/** En-tête HTTP standard utilisée pour retrouver le type de contenu d'origine à la lecture — R2 ne le déduit jamais de la clé. */
const CLE_METADONNEE_TYPE_CONTENU = 'contentType'

export class R2StockageBinaireRepo implements StockageBinaireRepo {
  constructor(private readonly bucket: R2Bucket) {}

  async enregistrer(cle: string, contenu: ArrayBuffer, typeContenu: string): Promise<void> {
    await this.bucket.put(cle, contenu, {
      customMetadata: { [CLE_METADONNEE_TYPE_CONTENU]: typeContenu },
    })
  }

  async lire(cle: string): Promise<{ contenu: ArrayBuffer; typeContenu: string } | null> {
    const objet = await this.bucket.get(cle)
    if (!objet) return null
    return {
      contenu: await objet.arrayBuffer(),
      typeContenu:
        objet.customMetadata?.[CLE_METADONNEE_TYPE_CONTENU] ?? 'application/octet-stream',
    }
  }

  async supprimer(cle: string): Promise<void> {
    await this.bucket.delete(cle)
  }
}

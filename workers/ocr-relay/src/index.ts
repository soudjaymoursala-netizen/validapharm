import { traiterRequeteOcr } from './ocrHandler'
import { AzureVisionProvider } from './fournisseurs/azureVisionProvider'

/**
 * Point d'entrée réel du Worker Cloudflare — ne contient que le
 * câblage secrets → fournisseur → handler ; toute la logique testable vit
 * dans `ocrHandler.ts`/`fournisseurs/*.ts`.
 *
 * Secrets attendus (`wrangler secret put ...`, jamais commités) : voir
 * `README.md`.
 */
export interface Env {
  AZURE_VISION_ENDPOINT: string
  AZURE_VISION_KEY: string
  CORS_ORIGIN_AUTORISE: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const fournisseur = new AzureVisionProvider({
      endpoint: env.AZURE_VISION_ENDPOINT,
      cleAbonnement: env.AZURE_VISION_KEY,
    })
    return traiterRequeteOcr(request, fournisseur, env.CORS_ORIGIN_AUTORISE)
  },
}

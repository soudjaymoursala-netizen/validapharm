import type { FournisseurOcr } from './fournisseurs/FournisseurOcr'

/**
 * Handler du relais OCR (TD-001) — logique pure, indépendante du binding
 * Cloudflare Workers (`env`/`ExecutionContext`), pour rester testable sans
 * dépendre du runtime Workers réel. `index.ts` ne fait que construire le
 * `FournisseurOcr` à partir des secrets et déléguer ici.
 *
 * Sans état (principe d'absence d'état appliqué par analogie, TD-001) : aucune donnée
 * de la requête ou de la réponse n'est conservée au-delà du traitement en
 * cours — pas d'écriture KV/D1/Durable Object dans ce module.
 *
 * CORS restreint strictement à l'origine exacte de la PWA déployée (même
 * principe que le relais IA, `09-architecture-detaillee.md` §10), jamais
 * `*`.
 */
export async function traiterRequeteOcr(
  request: Request,
  fournisseur: FournisseurOcr,
  corsOrigin: string,
): Promise<Response> {
  const entetesCors = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: entetesCors })
  }

  if (request.method !== 'POST') {
    return reponseJson({ erreur: 'methode_non_autorisee' }, 405, entetesCors)
  }

  const contentType = request.headers.get('Content-Type')
  if (!contentType || !contentType.startsWith('image/')) {
    return reponseJson(
      { erreur: 'content_type_invalide', message: 'Content-Type image/* attendu.' },
      400,
      entetesCors,
    )
  }

  const imageBytes = await request.arrayBuffer()
  if (imageBytes.byteLength === 0) {
    return reponseJson({ erreur: 'corps_vide' }, 400, entetesCors)
  }

  try {
    const resultat = await fournisseur.extraireTexte(imageBytes, contentType)
    return reponseJson(resultat, 200, entetesCors)
  } catch (erreur) {
    // Jamais de détail d'erreur fournisseur brut renvoyé au client (pourrait
    // exposer l'identité/l'implémentation du fournisseur relayé) — message
    // générique côté réponse, détail réservé aux logs d'exécution du Worker
    // (éphémères, pas une persistance de donnée métier — cohérent avec le
    // principe "sans état").
    console.error('Extraction OCR échouée :', erreur)
    return reponseJson({ erreur: 'extraction_echouee' }, 502, entetesCors)
  }
}

function reponseJson(corps: unknown, status: number, entetes: Record<string, string>): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { ...entetes, 'Content-Type': 'application/json' },
  })
}

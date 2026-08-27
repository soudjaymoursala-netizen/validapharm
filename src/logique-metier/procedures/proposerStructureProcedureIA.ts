import type { ContexteEnvoi, ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type {
  EtapeProposeeIA,
  PropositionStructureProcedureIA,
  SectionCanoniqueProcedure,
  SectionDetecteeIA,
} from '../domaine/types'

/**
 * Repli IA-assisté de structuration procédurale (Phase 24, TD-022) — pour
 * un document dont le parseur déterministe (Phases 21-22) ne trouve
 * aucune structure exploitable (aucun en-tête numéroté, aucun tableau).
 * Confirmé nécessaire par 5 documents réels distincts déjà testés
 * (Sanofi, Ferring×2, IMA, Markem-Imaje couverts ; Nordson — en-têtes en
 * gras sans numérotation — non couvert, TD-021).
 *
 * **Garde-fou non négociable, inchangé (TD-016)** : le résultat n'est
 * jamais écrit dans `Procedure`/`ProcedureStep` sans confirmation humaine
 * explicite via `useProcedureStore`.
 *
 * **Vérification déterministe d'ancrage** (jamais une confiance
 * accordée sur la seule affirmation du modèle) : chaque section/étape
 * proposée est comparée, texte normalisé, au document source. Si le
 * texte proposé n'y apparaît pas — le modèle a reformulé ou inventé —
 * `etat_confiance` reste `'a_verifier'`, jamais `'infere'`. Un texte
 * ancré dans la source est `'infere'` (le regroupement/étiquetage reste
 * une déduction du modèle, jamais vérifié point par point) — jamais
 * `'connu'`, réservé à une citation résolvant vers un objet du domaine
 * déjà persisté (Phase 15), absent ici puisque rien n'est encore
 * confirmé.
 *
 * Protocole de sortie volontairement contraint (un marqueur par ligne,
 * jamais du JSON libre) — même discipline que `boucleRaisonnement.ts`
 * (Phase 15) : une sortie de forme libre serait plus difficile à parser
 * de façon déterministe et plus sujette à erreur silencieuse.
 */

const CANONS_CONNUS: readonly SectionCanoniqueProcedure[] = [
  'objectif',
  'perimetre',
  'responsabilites',
  'definitions',
  'procedure',
  'references',
  'gestion_ecarts',
  'documentation',
  'annexes',
  'autre',
]

const RE_LIGNE_SECTION = /^SECTION\|([a-z_]+)\|(.+)$/
const RE_LIGNE_ETAPE = /^ETAPE\|(.+)$/

function normaliserPourAncrage(texte: string): string {
  return texte.toLowerCase().replace(/\s+/g, ' ').trim()
}

function estAncreDansSource(candidat: string, source: string): boolean {
  const candidatNormalise = normaliserPourAncrage(candidat)
  if (candidatNormalise.length < 3) return false
  return normaliserPourAncrage(source).includes(candidatNormalise)
}

function construirePrompt(texte: string): string {
  return [
    "Voici le texte brut d'une SOP (procédure) qui ne suit aucun plan à en-têtes numérotés reconnaissable automatiquement.",
    'Identifie ses sections et ses étapes opérationnelles, en RECOPIANT le texte source mot pour mot (jamais reformulé, jamais traduit, jamais résumé) — la moindre modification empêchera la vérification de cette proposition.',
    "Réponds UNIQUEMENT avec des lignes au format suivant, une par ligne, rien d'autre :",
    `SECTION|<un mot parmi ${CANONS_CONNUS.join('/')}>|<titre de la section recopié tel quel>`,
    "ETAPE|<description de l'étape recopiée telle quelle>",
    '',
    '--- TEXTE SOURCE ---',
    texte,
  ].join('\n')
}

function analyserReponse(
  texteReponse: string,
  texteSource: string,
): { sections: SectionDetecteeIA[]; etapesProposees: EtapeProposeeIA[] } {
  const sections: SectionDetecteeIA[] = []
  const etapesProposees: EtapeProposeeIA[] = []

  for (const ligneBrute of texteReponse.split('\n')) {
    const ligne = ligneBrute.trim()

    const matchSection = ligne.match(RE_LIGNE_SECTION)
    if (matchSection) {
      const canonBrut = matchSection[1] as SectionCanoniqueProcedure
      const titreDetecte = (matchSection[2] ?? '').trim()
      const canon = CANONS_CONNUS.includes(canonBrut) ? canonBrut : 'autre'
      sections.push({
        canon,
        titreDetecte,
        etat_confiance: estAncreDansSource(titreDetecte, texteSource) ? 'infere' : 'a_verifier',
      })
      continue
    }

    const matchEtape = ligne.match(RE_LIGNE_ETAPE)
    if (matchEtape) {
      const description = (matchEtape[1] ?? '').trim()
      if (description.length === 0) continue
      etapesProposees.push({
        description,
        etat_confiance: estAncreDansSource(description, texteSource) ? 'infere' : 'a_verifier',
      })
    }
  }

  return { sections, etapesProposees }
}

export async function proposerStructureProcedureParIA(
  texte: string,
  provider: ProviderAdapter,
): Promise<PropositionStructureProcedureIA> {
  const contexte: ContexteEnvoi = {
    contenu_joint: true,
    contenu: texte,
    titre_document: 'SOP à structurer (repli IA)',
  }

  const reponse = await provider.envoyerMessage('chat_normatif', contexte, construirePrompt(texte))
  const { sections, etapesProposees } = analyserReponse(reponse.texte, texte)

  return { sections, etapesProposees, texteReponseBrute: reponse.texte }
}

import type {
  EtapeProposee,
  PropositionStructureProcedure,
  SectionCanoniqueProcedure,
  SectionDetectee,
} from '../domaine/types'

/**
 * Parseur déterministe de structure de SOP — Phase 21,
 * `PHASE_21_PARSEUR_STRUCTURE_PROCEDURE_SPEC.md` (TD-017).
 *
 * Aucun appel IA. Calibré et testé sur deux SOP pharma réelles de clients
 * différents (Sanofi Lyon "LYON-QUAL-PGN-000198", Ferring International
 * Center "SMP-PROC-016168") : les deux organisent leur SOP selon le même
 * enchaînement sémantique — objectif → périmètre → responsabilités →
 * définitions → corps de procédure → références → historique/annexes —
 * sous des libellés lexicalement différents ("OBJECTIF" vs "But", "CHAMP
 * D'APPLICATION" vs "Domaine d'application"...). Le dictionnaire ci-
 * dessous couvre les variantes observées ; jamais une liste fermée
 * présumée exhaustive.
 *
 * **Limite assumée et documentée (pas un échec silencieux)** : ce
 * parseur cible le genre "SOP qualité" à en-têtes numérotés. Sur un
 * genre différent (ex. instruction technique illustrée par tableaux
 * d'étapes, type manuel équipement Markem-Imaje présent dans le corpus
 * réel consulté), il peut sur-segmenter en sections `'autre'` à partir de
 * lignes de tableau numérotées — un choix assumé de favoriser le rappel
 * (rien n'est perdu silencieusement) sur la précision, puisque le
 * résultat reste une proposition soumise à confirmation humaine, jamais
 * une vérité auto-validée (garde-fou TD-016).
 */

function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/['’/]/g, ' ')
    .replace(/[.:;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const DICTIONNAIRE_SECTIONS: Record<string, SectionCanoniqueProcedure> = {
  OBJECTIF: 'objectif',
  BUT: 'objectif',
  OBJET: 'objectif',
  PURPOSE: 'objectif',
  'CHAMP D APPLICATION': 'perimetre',
  'DOMAINE D APPLICATION': 'perimetre',
  PERIMETRE: 'perimetre',
  SCOPE: 'perimetre',
  RESPONSABILITES: 'responsabilites',
  RESPONSABILITE: 'responsabilites',
  RESPONSIBILITIES: 'responsabilites',
  'DEFINITIONS ET ACRONYMES': 'definitions',
  DEFINITIONS: 'definitions',
  'ABREVIATIONS DEFINITIONS': 'definitions',
  'ABREVIATIONS ET DEFINITIONS': 'definitions',
  GLOSSAIRE: 'definitions',
  'DEFINITIONS AND ABBREVIATIONS': 'definitions',
  DESCRIPTION: 'procedure',
  PROCEDURE: 'procedure',
  'MODE OPERATOIRE': 'procedure',
  PROCESS: 'procedure',
  REFERENCES: 'references',
  'GESTION DES ECARTS ET DES EXCURSIONS': 'gestion_ecarts',
  'GESTION DES ECARTS': 'gestion_ecarts',
  DEVIATIONS: 'gestion_ecarts',
  DOCUMENTATION: 'documentation',
  HISTORIQUE: 'documentation',
  SUPPLEMENTS: 'documentation',
  'REVISION HISTORY': 'documentation',
  ANNEXES: 'annexes',
  ANNEXE: 'annexes',
  APPENDICES: 'annexes',
  APPENDIX: 'annexes',
}

/** En-tête top-level "N. Titre" / "N Titre" — exclut "5.1. Titre" (sous-section) car aucun espace ne suit immédiatement le premier nombre dans ce cas. */
const RE_TITRE_NUMEROTE = /^(\d{1,2})\.?\s+(.{1,78})$/

/** Ligne d'énumération candidate à devenir une étape ("- ", "• ", "* " ou "N. "). */
const RE_ETAPE = /^(?:[-•*]|\d{1,2}\.)\s+(.+)$/

const RE_CONDITION =
  /\b(si\s+.+|sauf\s+.+|dans le cas où\s+.+|le cas échéant.*|à condition que\s+.+)$/i

const RE_RESPONSABLE = /^([A-ZÀ-Ü][A-Za-zÀ-ÿ ]{1,30})\s*:\s*/

/**
 * Segmente un texte brut de SOP (déjà extrait via `extraireTexteDocx` ou
 * l'OCR, Phases 19/6) en sections à rôle sémantique connu. Retourne un
 * tableau vide si aucun en-tête reconnu n'est trouvé — jamais une erreur,
 * jamais une section inventée.
 */
export function detecterSections(texte: string): SectionDetectee[] {
  const lignes = texte.split('\n')
  const frontieres: { index: number; canon: SectionCanoniqueProcedure; titreDetecte: string }[] = []

  lignes.forEach((ligneBrute, index) => {
    const ligne = ligneBrute.trim()
    const match = ligne.match(RE_TITRE_NUMEROTE)
    if (!match) return
    const titreCandidat = (match[2] ?? '').trim()
    if (titreCandidat.split(/\s+/).length > 8) return

    const normalise = normaliser(titreCandidat)
    const canon = DICTIONNAIRE_SECTIONS[normalise]
    if (canon) {
      frontieres.push({ index, canon, titreDetecte: titreCandidat })
      return
    }
    if (!titreCandidat.endsWith(':') && titreCandidat.length <= 60) {
      frontieres.push({ index, canon: 'autre', titreDetecte: titreCandidat })
    }
  })

  if (frontieres.length === 0) return []

  return frontieres.map((frontiere, i) => {
    const debut = frontiere.index + 1
    const suivante = frontieres[i + 1]
    const fin = suivante ? suivante.index : lignes.length
    return {
      canon: frontiere.canon,
      titreDetecte: frontiere.titreDetecte,
      texte: lignes.slice(debut, fin).join('\n').trim(),
    }
  })
}

function detecterCondition(description: string): string | null {
  const match = description.match(RE_CONDITION)
  return match ? match[0].trim() : null
}

function detecterResponsable(description: string): string | null {
  const match = description.match(RE_RESPONSABLE)
  return match ? (match[1] ?? '').trim() : null
}

/**
 * Propose une structure (sections + étapes candidates) à partir du texte
 * brut d'une SOP — jamais écrite en base : une simple proposition que
 * l'humain édite/confirme via `useProcedureStore.creerProcedure`/
 * `ajouterEtape` (TD-016, TD-017).
 */
export function proposerStructureProcedure(texte: string): PropositionStructureProcedure {
  const sections = detecterSections(texte)
  const etapesProposees: EtapeProposee[] = []
  let ordre = 1

  for (const section of sections.filter((s) => s.canon === 'procedure')) {
    for (const ligneBrute of section.texte.split('\n')) {
      const match = ligneBrute.trim().match(RE_ETAPE)
      if (!match) continue
      const description = (match[1] ?? '').trim()
      if (description.length === 0) continue
      etapesProposees.push({
        ordre: ordre++,
        description,
        conditionDetectee: detecterCondition(description),
        responsableDetecte: detecterResponsable(description),
      })
    }
  }

  return { sections, etapesProposees }
}

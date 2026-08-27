import type {
  EtapeProposee,
  PropositionStructureProcedure,
  SectionCanoniqueProcedure,
  SectionDetectee,
  TableauDocx,
} from '../domaine/types'

/**
 * Parseur déterministe de structure de SOP — Phase 21,
 * `PHASE_21_PARSEUR_STRUCTURE_PROCEDURE_SPEC.md` (TD-017, étendu TD-018).
 *
 * Aucun appel IA. Calibré et testé sur trois SOP pharma réelles de clients
 * différents, lues intégralement dans Google Drive :
 * - Sanofi Lyon "LYON-QUAL-PGN-000198" et Ferring International Center
 *   "SMP-PROC-016168" — genre "SOP qualité" à en-têtes numérotés
 *   ("OBJECTIF"/"But", "CHAMP D'APPLICATION"/"Domaine d'application"...).
 * - IMA "4915BRP"/"LA1028BRP" (procédures Back-up/Restore PLC/PC, pour
 *   Ferring) — genre différent, sans plan qualité ("1. INTRODUCTION",
 *   "2. PLC Procedures", "2.1. Pre-requisites", étapes en texte simple
 *   sans puce ni numéro) : a motivé l'extension TD-018 (reconnaissance
 *   par mot-clé, repli ligne-par-ligne, contexte de sous-titre).
 *
 * **Limite assumée et documentée (pas un échec silencieux)** : sur un
 * genre encore différent (ex. instruction technique illustrée par
 * tableaux d'étapes, type manuel équipement Markem-Imaje, également
 * présent dans le corpus réel consulté), ce parseur peut sur-segmenter
 * en sections `'autre'` à partir de lignes de tableau numérotées — choix
 * assumé de favoriser le rappel (rien n'est perdu silencieusement) sur la
 * précision, puisque le résultat reste une proposition soumise à
 * confirmation humaine, jamais une vérité auto-validée (garde-fou TD-016).
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

/**
 * Repli par mot-clé (Phase 21 extension, TD-018) : quand le titre complet
 * ne correspond à aucune entrée exacte du dictionnaire, un mot fort à
 * l'intérieur du titre suffit — ex. "PLC Procedures"/"PC Procedures (for
 * HMI ima xface)" (SOP IMA réelle) contiennent "Procedures" sans jamais
 * égaler exactement une clé du dictionnaire. Moins spécifique que la
 * correspondance exacte (essayée en premier), toujours déterministe —
 * jamais un mot deviné, toujours un motif explicite et testé.
 */
const MOTS_CLES_SECTIONS: [RegExp, SectionCanoniqueProcedure][] = [
  [/\bOBJECTIF\b|\bBUT\b|\bOBJET\b|\bPURPOSE\b|\bINTRODUCTION\b/, 'objectif'],
  [/\bPERIMETRE\b|\bSCOPE\b/, 'perimetre'],
  [/\bRESPONSABILITE(S)?\b|\bRESPONSIBILIT(Y|IES)\b/, 'responsabilites'],
  [/\bDEFINITION(S)?\b|\bGLOSSAIRE\b|\bABREVIATION(S)?\b|\bACRONYM(S|E|ES)?\b/, 'definitions'],
  [/\bPROCEDURE(S)?\b|\bPROCESS\b/, 'procedure'],
  [/\bREFERENCE(S)?\b/, 'references'],
  [/\bECART(S)?\b|\bDEVIATION(S)?\b|\bEXCURSION(S)?\b/, 'gestion_ecarts'],
  [/\bDOCUMENTATION\b|\bHISTORIQUE\b|\bHISTORY\b|\bSUPPLEMENT(S)?\b/, 'documentation'],
  [/\bANNEXE(S)?\b|\bAPPENDI(X|CES)\b/, 'annexes'],
]

function resoudreCanon(titreCandidat: string): SectionCanoniqueProcedure | null {
  const normalise = normaliser(titreCandidat)
  const exact = DICTIONNAIRE_SECTIONS[normalise]
  if (exact) return exact
  for (const [motif, canon] of MOTS_CLES_SECTIONS) {
    if (motif.test(normalise)) return canon
  }
  return null
}

/** En-tête top-level "N. Titre" / "N Titre" — exclut "5.1. Titre" (sous-section) car aucun espace ne suit immédiatement le premier nombre dans ce cas. */
const RE_TITRE_NUMEROTE = /^(\d{1,2})\.?\s+(.{1,78})$/

/** Sous-titre à deux ou trois niveaux ("2.1 Pre-requisites", "6.2.1 Approche C&Q") — jamais une nouvelle section, sert seulement de contexte pour les étapes qui suivent (Phase 21 extension, TD-018). */
const RE_SOUS_TITRE = /^\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\.?\s+(.{1,78})$/

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

    const canon = resoudreCanon(titreCandidat)
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

interface LigneCandidate {
  description: string
  contexte: string | null
}

/**
 * Un seul passage sur le corps d'une section "procédure" : suit le
 * sous-titre courant (pour l'attacher aux étapes qui suivent), collecte
 * les lignes à puce/numéro explicites (`strictes`, haute confiance) et,
 * séparément, toute ligne non vide hors sous-titre (`toutes`, repli).
 * Deux passages en un seul, jamais deux lectures divergentes du texte.
 */
function collecterLignesSection(texteSection: string): {
  strictes: LigneCandidate[]
  toutes: LigneCandidate[]
} {
  const strictes: LigneCandidate[] = []
  const toutes: LigneCandidate[] = []
  let contexteCourant: string | null = null

  for (const ligneBrute of texteSection.split('\n')) {
    const ligne = ligneBrute.trim()
    if (ligne.length === 0) continue

    // Seuil plus permissif que RE_TITRE_NUMEROTE (8 mots) : un faux
    // positif ici ne fait que mal étiqueter un contexte informatif, jamais
    // re-découper le document — conséquence bien plus faible. Un
    // sous-titre réel observé sur la SOP IMA ("Back-Up - Uploading the
    // Old Program from the PLC") atteint déjà 9 mots.
    const sousTitre = ligne.match(RE_SOUS_TITRE)
    if (sousTitre) {
      const titre = (sousTitre[1] ?? '').trim()
      if (titre.split(/\s+/).length <= 14) {
        contexteCourant = titre
        continue
      }
    }

    const matchEtape = ligne.match(RE_ETAPE)
    if (matchEtape) {
      strictes.push({ description: (matchEtape[1] ?? '').trim(), contexte: contexteCourant })
    }
    toutes.push({ description: ligne, contexte: contexteCourant })
  }

  return { strictes, toutes }
}

/** Une des deux étiquettes de préconditions observées dans les tableaux d'étapes réels (SOP Markem-Imaje) — jamais une valeur devinée si absente. */
const LIBELLES_PRECONDITION_TABLEAU: Record<string, string> = {
  'PREVIOUS ACHIEVEMENT': 'Previous achievement',
  'REQUIRED TIME': 'Required time',
}

/**
 * Propose des étapes candidates à partir de tableaux extraits d'un
 * `.docx` (`extraireTableauxDocx`, Phase 22, TD-019) — genre "étapes sous
 * tableau" (manuel équipement Markem-Imaje réel : "Previous achievement"/
 * "Required time" en préconditions, puis une ligne par étape numérotée
 * en première colonne, instruction en deuxième), laissé hors couverture
 * par TD-017/TD-018 (texte à en-têtes numérotés uniquement).
 *
 * Une ligne est une étape candidate seulement si sa première cellule est
 * *exactement* un nombre — jamais un texte partiellement numérique deviné
 * comme un numéro d'étape. `contexteDetecte` combine le titre le plus
 * proche précédant le tableau (`titreProchePrecedent`) et les
 * préconditions trouvées dans ce même tableau — jamais fabriqué si le
 * tableau n'en contient aucune.
 */
export function proposerEtapesDepuisTableaux(tableaux: readonly TableauDocx[]): EtapeProposee[] {
  const etapes: EtapeProposee[] = []

  for (const tableau of tableaux) {
    const preconditions: string[] = []
    for (const ligne of tableau.lignes) {
      const libelle = LIBELLES_PRECONDITION_TABLEAU[normaliser((ligne[0] ?? '').trim())]
      const valeur = (ligne[1] ?? '').trim()
      if (libelle && valeur.length > 0) preconditions.push(`${libelle} : ${valeur}`)
    }

    const partiesContexte = [tableau.titreProchePrecedent, ...preconditions].filter(
      (partie): partie is string => partie !== null && partie.length > 0,
    )
    const contexteDetecte = partiesContexte.length > 0 ? partiesContexte.join(' — ') : null

    for (const ligne of tableau.lignes) {
      const premiereCellule = (ligne[0] ?? '').trim()
      if (!/^\d{1,2}$/.test(premiereCellule)) continue
      const description = (ligne[1] ?? '').trim()
      if (description.length === 0) continue
      etapes.push({
        ordre: Number(premiereCellule),
        description,
        conditionDetectee: detecterCondition(description),
        responsableDetecte: detecterResponsable(description),
        contexteDetecte,
      })
    }
  }

  return etapes
}

/**
 * Propose une structure (sections + étapes candidates) à partir du texte
 * brut d'une SOP — jamais écrite en base : une simple proposition que
 * l'humain édite/confirme via `useProcedureStore.creerProcedure`/
 * `ajouterEtape` (TD-016, TD-017).
 *
 * Extraction d'étapes à deux niveaux (Phase 21 extension, TD-018) :
 * les lignes à puce/numéro explicites (`- `, `• `, `N. `) sont utilisées
 * en priorité (haute confiance). Si une section "procédure" n'en contient
 * *aucune* — cas réel observé sur une SOP IMA où chaque instruction est
 * une simple phrase par ligne, sans puce — chaque ligne non vide de la
 * section devient une étape candidate à la place : favorise le rappel
 * plutôt que de renvoyer une liste vide sur un document dont la structure
 * est réelle mais moins formatée. Toujours une proposition, jamais une
 * vérité auto-validée.
 *
 * `tableaux` (Phase 22, TD-019, optionnel) : étapes candidates
 * supplémentaires extraites de tableaux `.docx` (`extraireTableauxDocx`)
 * — un canal structurellement distinct du texte, jamais fusionné avec
 * la numérotation des étapes textuelles (chaque tableau réel garde sa
 * propre numérotation d'origine, fidèle à la source plutôt qu'un compteur
 * global fabriqué).
 */
export function proposerStructureProcedure(
  texte: string,
  tableaux: readonly TableauDocx[] = [],
): PropositionStructureProcedure {
  const sections = detecterSections(texte)
  const etapesProposees: EtapeProposee[] = []
  let ordre = 1

  for (const section of sections.filter((s) => s.canon === 'procedure')) {
    const { strictes, toutes } = collecterLignesSection(section.texte)
    const candidats = strictes.length > 0 ? strictes : toutes

    for (const candidat of candidats) {
      if (candidat.description.length === 0) continue
      etapesProposees.push({
        ordre: ordre++,
        description: candidat.description,
        conditionDetectee: detecterCondition(candidat.description),
        responsableDetecte: detecterResponsable(candidat.description),
        contexteDetecte: candidat.contexte,
      })
    }
  }

  etapesProposees.push(...proposerEtapesDepuisTableaux(tableaux))

  return { sections, etapesProposees }
}

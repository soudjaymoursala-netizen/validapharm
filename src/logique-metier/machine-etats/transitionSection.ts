import type { StatutSection } from '../domaine/types'

export type ActionSection =
  | 'engager_verification'
  | 'transmettre_approbation'
  | 'approuver'
  | 'rejeter'
  | 'valider_section_ia'

export interface ContexteTransition {
  statutActuel: StatutSection
  auteursRenseignes: boolean
  approbateurFinalRenseigne: boolean
  auMoinsUnAvisRelecteur: boolean
  motifRejet?: string
}

export type RaisonBlocageTransition =
  | 'transition_invalide'
  | 'roles_manquants'
  | 'avis_manquant'
  | 'motif_requis'
  | 'section_verrouillee'

export type ResultatTransition =
  | { autorisee: true; nouveauStatut: StatutSection }
  | { autorisee: false; raison: RaisonBlocageTransition }

/**
 * Applique une action au cycle de vie d'une section et détermine si la
 * transition est autorisée, sans modifier aucun objet — fonction pure, le
 * code appelant est responsable de persister `nouveauStatut` et d'ajouter
 * l'entrée `audit_log`/`revisions` correspondante.
 *
 * @param contexte État courant de la section et disponibilité des garde-fous.
 * @param action Action demandée par l'utilisateur.
 * @requirement Transitions du cycle de vie de section
 *
 * Interprétation retenue pour la garde "rôles renseignés" —
 * décision d'implémentation à confirmer en revue : le
 * diagramme de conception interne place cette garde sur la toute première transition
 * (`brouillon_aide` → `en_verification`, action "Engager le cycle"), pas
 * sur le seul passage à `en_approbation` comme le texte de l'exigence pourrait
 * le laisser croire isolément — retenu ici que rédacteur(s) et approbateur
 * final doivent être connus dès l'engagement du cycle (sinon il n'y a
 * personne vers qui transmettre plus tard), tandis que les relecteurs
 * peuvent être ajoutés en cours de route ("à tout moment").
 * Le relecteur devient requis seulement à la transmission vers
 * l'approbation (`transmettre_approbation`), pas avant.
 */
export function appliquerTransition(
  contexte: ContexteTransition,
  action: ActionSection,
): ResultatTransition {
  switch (contexte.statutActuel) {
    case 'brouillon_aide':
      return transitionDepuisBrouillonAide(contexte, action)
    case 'propose_par_ia_non_valide':
      return transitionDepuisProposeParIA(contexte, action)
    case 'en_verification':
      return transitionDepuisEnVerification(contexte, action)
    case 'en_approbation':
      return transitionDepuisEnApprobation(contexte, action)
    case 'valide_en_interne':
      // Le corps d'une section verrouillée ne se rouvre jamais
      // par transition de statut — seule une nouvelle révision (nouvel
      // objet Section, hors périmètre de cette fonction) reprend le cycle.
      return { autorisee: false, raison: 'section_verrouillee' }
  }
}

function transitionDepuisBrouillonAide(
  contexte: ContexteTransition,
  action: ActionSection,
): ResultatTransition {
  return exigerAction(action, 'engager_verification', 'en_verification', () =>
    contexte.auteursRenseignes && contexte.approbateurFinalRenseigne ? null : 'roles_manquants',
  )
}

function transitionDepuisProposeParIA(
  _contexte: ContexteTransition,
  action: ActionSection,
): ResultatTransition {
  // Règle de conception non négociable : ce statut ne peut
  // jamais transiter directement vers en_verification/en_approbation/
  // valide_en_interne — uniquement retour à brouillon_aide, une fois la
  // section explicitement validée/éditée par l'utilisateur.
  return exigerAction(action, 'valider_section_ia', 'brouillon_aide', () => null)
}

function transitionDepuisEnVerification(
  contexte: ContexteTransition,
  action: ActionSection,
): ResultatTransition {
  if (action === 'rejeter') {
    return transitionRejet(contexte)
  }
  return exigerAction(action, 'transmettre_approbation', 'en_approbation', () =>
    contexte.auMoinsUnAvisRelecteur ? null : 'avis_manquant',
  )
}

function transitionDepuisEnApprobation(
  contexte: ContexteTransition,
  action: ActionSection,
): ResultatTransition {
  if (action === 'rejeter') {
    return transitionRejet(contexte)
  }
  return exigerAction(action, 'approuver', 'valide_en_interne', () =>
    contexte.approbateurFinalRenseigne ? null : 'roles_manquants',
  )
}

// Appelée uniquement quand l'action demandée est déjà 'rejeter' (vérifié
// par les deux appelants ci-dessus) — ne revérifie donc que le motif.
function transitionRejet(contexte: ContexteTransition): ResultatTransition {
  const motifValide = contexte.motifRejet !== undefined && contexte.motifRejet.trim().length > 0
  if (!motifValide) {
    return { autorisee: false, raison: 'motif_requis' }
  }
  return { autorisee: true, nouveauStatut: 'brouillon_aide' }
}

function exigerAction(
  action: ActionSection | undefined,
  actionAttendue: ActionSection,
  statutCible: StatutSection,
  evaluerGarde: () => RaisonBlocageTransition | null,
): ResultatTransition {
  if (action !== actionAttendue) {
    return { autorisee: false, raison: 'transition_invalide' }
  }
  const blocage = evaluerGarde()
  if (blocage !== null) {
    return { autorisee: false, raison: blocage }
  }
  return { autorisee: true, nouveauStatut: statutCible }
}

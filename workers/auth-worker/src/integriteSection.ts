import type { EntreeAuditSection, SectionEnregistree } from './repos/sectionsRepo'

/**
 * Intégrité des sections côté serveur (audit du 25/09/2026, constats C1 de
 * l'audit sécurité et C1-C3 de l'audit d'intégrité front) : jusqu'ici le
 * Worker enregistrait la section reçue telle quelle — historique
 * (`auditLog`/`revisions`), statut, avis de relecture et signatures
 * compris. N'importe quel partagé en édition pouvait donc réécrire
 * l'historique ou inscrire une approbation au nom d'un autre.
 *
 * Désormais, le serveur est le seul garant de ces champs :
 * - l'historique est **en ajout seul** : l'existant doit être repris à
 *   l'identique, et chaque nouvelle entrée est attribuée à l'utilisateur
 *   authentifié, à l'heure du serveur (jamais l'heure ni l'identité
 *   fournies par le poste) ;
 * - les signatures ne s'écrivent jamais par cette voie ;
 * - les changements de statut suivent la machine à états
 *   (`transitionSection.ts` côté front), gardes comprises, et
 *   l'approbation finale est réservée à l'approbateur désigné (ou un
 *   admin) ;
 * - une section `valide_en_interne` est verrouillée : seuls l'historique
 *   (exports) et le partage évoluent encore.
 *
 * Fonctions pures (aucun accès D1) — le routeur fournit l'existant,
 * l'utilisateur et l'horodatage.
 */

export type RefusIntegriteSection =
  | 'historique_altere'
  | 'transition_invalide'
  | 'roles_manquants'
  | 'avis_manquant'
  | 'motif_requis'
  | 'approbateur_requis'
  | 'section_verrouillee'
  | 'statut_creation_invalide'

export type ResultatIntegriteSection =
  { ok: true; section: SectionEnregistree } | { ok: false; erreur: RefusIntegriteSection }

interface Acteur {
  email: string
  role: string
}

const SIGNATURES_VIDES: SectionEnregistree['signatures'] = {
  redacteur: {},
  verificateur: {},
  approbateur: {},
}

/** Statuts admis à la création — une section ne naît jamais vérifiée ni approuvée. */
const STATUTS_CREATION = ['brouillon_aide', 'propose_par_ia_non_valide']

/** Transitions de statut admises (même graphe que `appliquerTransition`). */
const TRANSITIONS: Record<string, string[]> = {
  brouillon_aide: ['en_verification', 'propose_par_ia_non_valide'],
  propose_par_ia_non_valide: ['brouillon_aide'],
  en_verification: ['en_approbation', 'brouillon_aide'],
  en_approbation: ['valide_en_interne', 'brouillon_aide'],
  valide_en_interne: [],
}

/** Sérialisation à clés triées — compare deux valeurs JSON sans dépendre de l'ordre des clés. */
function stable(valeur: unknown): string {
  if (Array.isArray(valeur)) return `[${valeur.map(stable).join(',')}]`
  if (valeur !== null && typeof valeur === 'object') {
    const entrees = Object.entries(valeur as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entrees.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`
  }
  return JSON.stringify(valeur ?? null)
}

export function egalJson(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b)
}

/** Vrai si `existant` est repris à l'identique en tête de `nouveau`. */
function prefixeConserve(existant: unknown[], nouveau: unknown[]): boolean {
  if (nouveau.length < existant.length) return false
  return existant.every((e, i) => egalJson(e, nouveau[i]))
}

function tableau<T>(valeur: T[] | null | undefined): T[] | null {
  return Array.isArray(valeur) ? valeur : null
}

/**
 * Horodatage du dernier rejet (entrée d'audit `rejet : …`) — les avis de
 * relecture antérieurs appartiennent au cycle rejeté et ne comptent plus
 * pour transmettre à nouveau à l'approbation.
 */
export function dernierRejet(auditLog: EntreeAuditSection[]): string | null {
  let dernier: string | null = null
  for (const e of auditLog) {
    if (typeof e.action === 'string' && e.action.startsWith('rejet')) dernier = e.timestamp
  }
  return dernier
}

export function avisDuCycleCourant(section: Pick<SectionEnregistree, 'workflow' | 'auditLog'>) {
  const rejet = dernierRejet(section.auditLog)
  return section.workflow.reviewers.filter((r) => rejet === null || r.date > rejet)
}

/**
 * Création (`POST /sections`) : la section naît brouillon, sans signature,
 * appartenant à celui qui la crée. Seul un import (dernière entrée d'audit
 * `import`) conserve l'historique d'origine — clairement suivi de l'entrée
 * `import` attribuée par le serveur, qui en marque la provenance.
 */
export function preparerCreationSection(
  corps: SectionEnregistree,
  acteur: Acteur,
  maintenant: string,
  peutPartager: boolean,
): ResultatIntegriteSection {
  if (!STATUTS_CREATION.includes(corps.status)) {
    return { ok: false, erreur: 'statut_creation_invalide' }
  }
  const historique = tableau(corps.auditLog) ?? []
  const derniere = historique[historique.length - 1]
  const estImport = typeof derniere?.action === 'string' && derniere.action.startsWith('import')
  const auditLog: EntreeAuditSection[] = estImport
    ? [
        ...historique.slice(0, -1),
        { timestamp: maintenant, actor: acteur.email, action: derniere.action },
      ]
    : [{ timestamp: maintenant, actor: acteur.email, action: 'création' }]
  const workflow = corps.workflow ?? { authors: [], reviewers: [], approverFinal: null }
  return {
    ok: true,
    section: {
      ...corps,
      ownerId: acteur.email,
      sharedWith: peutPartager ? (tableau(corps.sharedWith) ?? []) : [],
      signatures: SIGNATURES_VIDES,
      workflow: {
        authors: tableau(workflow.authors) ?? [acteur.email],
        // Les avis d'un autre poste ne valent pas relecture ici.
        reviewers: [],
        approverFinal: typeof workflow.approverFinal === 'string' ? workflow.approverFinal : null,
      },
      revisions: estImport ? (tableau(corps.revisions) ?? []) : [],
      auditLog,
      createdAt: maintenant,
      updatedAt: maintenant,
    },
  }
}

/**
 * Remplacement (`PUT /sections/:id`) : fusionne la proposition du poste
 * avec les règles d'intégrité ci-dessus. L'appelant a déjà vérifié le
 * droit d'écriture et le droit de partage.
 */
export function preparerRemplacementSection(
  existante: SectionEnregistree,
  corps: SectionEnregistree,
  acteur: Acteur,
  maintenant: string,
): ResultatIntegriteSection {
  const auditPropose = tableau(corps.auditLog)
  const revisionsProposees = tableau(corps.revisions)
  const avisProposes = tableau(corps.workflow?.reviewers)
  if (
    !auditPropose ||
    !revisionsProposees ||
    !avisProposes ||
    !prefixeConserve(existante.auditLog, auditPropose) ||
    !prefixeConserve(existante.revisions, revisionsProposees) ||
    !prefixeConserve(existante.workflow.reviewers, avisProposes)
  ) {
    return { ok: false, erreur: 'historique_altere' }
  }

  const nouvellesEntrees = auditPropose.slice(existante.auditLog.length).map((e) => ({
    timestamp: maintenant,
    actor: acteur.email,
    action: typeof e.action === 'string' && e.action.length > 0 ? e.action : 'modification',
  }))
  const auditLog = [
    ...existante.auditLog,
    ...(nouvellesEntrees.length > 0
      ? nouvellesEntrees
      : [{ timestamp: maintenant, actor: acteur.email, action: 'modification' }]),
  ]

  if (existante.status === 'valide_en_interne') {
    // Verrouillée : tout sauf l'historique, le partage et l'horodatage doit
    // rester identique (une nouvelle révision passe par une nouvelle section).
    const figee = (s: SectionEnregistree) => ({
      ...s,
      auditLog: undefined,
      updatedAt: undefined,
      ownerId: undefined,
      sharedWith: undefined,
      signatures: undefined,
      createdAt: undefined,
      id: undefined,
      projectId: undefined,
    })
    if (!egalJson(figee(existante), figee(corps))) {
      return { ok: false, erreur: 'section_verrouillee' }
    }
    return {
      ok: true,
      section: {
        ...existante,
        ownerId: corps.ownerId,
        sharedWith: corps.sharedWith,
        auditLog,
        updatedAt: maintenant,
      },
    }
  }

  const reviewers = [
    ...existante.workflow.reviewers,
    // Un avis est toujours celui de la personne connectée, à l'heure du serveur.
    ...avisProposes.slice(existante.workflow.reviewers.length).map((r) => ({
      userId: acteur.email,
      avis: String(r.avis ?? ''),
      date: maintenant,
    })),
  ]
  const revisions = [
    ...existante.revisions,
    ...revisionsProposees.slice(existante.revisions.length).map((r) => ({
      version: String(r.version ?? ''),
      date: maintenant,
      // « système (fournisseur) » décrit une génération assistée : l'auteur
      // réel reste la personne qui l'a déclenchée.
      auteur:
        typeof r.auteur === 'string' && r.auteur.startsWith('système')
          ? `${r.auteur} — déclenché par ${acteur.email}`
          : acteur.email,
      motif: String(r.motif ?? ''),
    })),
  ]

  const section: SectionEnregistree = {
    ...corps,
    id: existante.id,
    projectId: existante.projectId,
    createdAt: existante.createdAt,
    signatures: existante.signatures,
    workflow: {
      authors: tableau(corps.workflow.authors) ?? existante.workflow.authors,
      reviewers,
      approverFinal:
        typeof corps.workflow.approverFinal === 'string' && corps.workflow.approverFinal.length > 0
          ? corps.workflow.approverFinal
          : null,
    },
    revisions,
    auditLog,
    updatedAt: maintenant,
  }

  if (corps.status !== existante.status) {
    const refus = refusTransition(existante, section, nouvellesEntrees, acteur)
    if (refus) return { ok: false, erreur: refus }
  }
  return { ok: true, section }
}

function refusTransition(
  existante: SectionEnregistree,
  section: SectionEnregistree,
  nouvellesEntrees: EntreeAuditSection[],
  acteur: Acteur,
): RefusIntegriteSection | null {
  const depuis = existante.status
  const vers = section.status
  if (!(TRANSITIONS[depuis] ?? []).includes(vers)) return 'transition_invalide'

  const estRejet =
    vers === 'brouillon_aide' && (depuis === 'en_verification' || depuis === 'en_approbation')
  if (estRejet) {
    const motif = nouvellesEntrees.find((e) => e.action.startsWith('rejet'))
    const texte = motif?.action.replace(/^rejet\s*:?\s*/, '').trim() ?? ''
    return texte.length > 0 ? null : 'motif_requis'
  }
  if (vers === 'en_verification') {
    return section.workflow.authors.length > 0 && section.workflow.approverFinal !== null
      ? null
      : 'roles_manquants'
  }
  if (vers === 'en_approbation') {
    return avisDuCycleCourant(section).length > 0 ? null : 'avis_manquant'
  }
  if (vers === 'valide_en_interne') {
    if (section.workflow.approverFinal === null) return 'roles_manquants'
    const estApprobateur =
      section.workflow.approverFinal.trim().toLowerCase() === acteur.email.toLowerCase()
    return estApprobateur || acteur.role === 'admin' ? null : 'approbateur_requis'
  }
  return null
}

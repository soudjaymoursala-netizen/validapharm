/**
 * Mode audit simulé du chat expert (Phase 32 de convergence architecturale,
 * TD-030 — URS-F-038/039/039bis/038bis, jamais construit jusqu'ici bien que
 * `ModeUsageIA` porte `'audit_simule'` depuis la conception du relais de
 * production, REV-URS-VALIDAPHARM-2026-010).
 *
 * Construction déterministe du prompt envoyé au fournisseur IA — fonction
 * pure, aucun appel réseau, même discipline que `construirePrompt` du
 * Reasoning Engine (Phase 15). Le fournisseur choisi (`ClientConfig.
 * ai_provider`) exécute ensuite ce prompt ; ce module ne fait que le
 * fabriquer.
 *
 * **Grounding réel** : la méthodologie encodée ici n'est pas inventée —
 * elle reproduit celle réellement utilisée pour la revue de ce projet
 * lui-même (`docs/archive/revues-audits/`) : le débat contradictoire
 * multi-angles reproduit le patron "revue multi-experts" (E1-E4, position
 * de chaque angle puis argumentation contradictoire, décision par
 * consensus ou point ouvert) ; la simulation de persona reproduit le
 * patron "audit Swissmedic/FDA/cabinet de conseil GxP/QA spécialisée"
 * (posture d'inspecteur contradictoire, classification Majeur/Mineur/
 * Observation, "Constat/Analyse/Base réglementaire/Sévérité").
 *
 * @requirement URS-F-038, URS-F-038bis, URS-F-039, URS-F-039bis
 */
export type PersonaAuditSimule = 'swissmedic' | 'fda' | 'cabinet_conseil_gxp' | 'qa_specialisee'

export const LIBELLES_PERSONA_AUDIT_SIMULE: Record<PersonaAuditSimule, string> = {
  swissmedic: 'Swissmedic (inspection GxP — systèmes informatisés)',
  fda: 'FDA',
  cabinet_conseil_gxp: 'Cabinet de conseil GxP',
  qa_specialisee: 'QA spécialisée',
}

export interface EntreesPromptAuditSimule {
  question: string
  personas: readonly PersonaAuditSimule[]
}

/**
 * Rappel qu'une simulation de persona réglementaire ne constitue en aucun
 * cas un audit réglementaire réel ni un avis opposable (URS-F-039bis) —
 * réaffirmé dans le texte du prompt en plus du bandeau UI non négociable
 * affiché à chaque activation du mode (porté par l'écran, pas ce module).
 */
const RAPPEL_NON_OPPOSABLE =
  'Rappel non négociable à respecter dans ta réponse : cette simulation ne constitue en aucun cas un audit réglementaire réel ni un avis opposable. Termine toujours ta réponse par ce rappel, formulé explicitement.'

/**
 * Construit le prompt du mode audit simulé — toujours un débat
 * contradictoire multi-angles (fonctionnel, réglementaire, sécurité,
 * qualité), puis, si au moins une persona est sélectionnée, une simulation
 * d'audit par persona en plus du débat (jamais à sa place).
 *
 * Fonction pure — aucune valeur devinée : si `personas` est vide, seul le
 * débat multi-angles est demandé, jamais une persona choisie par défaut.
 */
export function construirePromptAuditSimule(entrees: EntreesPromptAuditSimule): string {
  const sections = [
    'MODE AUDIT SIMULÉ — applique la méthodologie de challenge suivante à la question ci-dessous, jamais une réponse directe simple.',
    '',
    "1. DÉBAT CONTRADICTOIRE MULTI-ANGLES (obligatoire) : examine la question successivement sous 4 angles — fonctionnel, réglementaire, sécurité, qualité. Pour chaque angle, prends position, puis confronte les angles entre eux lorsqu'ils divergent. Conclus par une synthèse explicite : consensus argumenté, ou point ouvert à trancher par l'utilisateur si la question relève d'un arbitrage de gouvernance plutôt que d'un fait technique/normatif tranchable.",
  ]

  if (entrees.personas.length > 0) {
    const personasListe = entrees.personas
      .map((p) => `- ${LIBELLES_PERSONA_AUDIT_SIMULE[p]}`)
      .join('\n')
    sections.push(
      '',
      `2. SIMULATION DE PERSONA(S) D'AUDITEUR (en complément du débat ci-dessus, jamais à sa place) : adopte successivement la posture contradictoire de chacun des profils suivants, cherchant les défauts qu'une équipe de conception ne voit pas sur son propre travail :\n${personasListe}\n\nPour chaque constat, utilise la structure suivante : Constat / Analyse / Base réglementaire (norme ou référentiel cité explicitement) / Sévérité — classée Majeur (compromet la défendabilité ou la maîtrise), Mineur (faiblesse réelle mais d'impact limité), ou Observation (bonne pratique à considérer, non bloquant).`,
    )
  }

  sections.push('', RAPPEL_NON_OPPOSABLE, '', 'QUESTION :', entrees.question)

  return sections.join('\n')
}

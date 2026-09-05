import type { Section, StatutSection, TemplateType } from '../domaine/types'

export type DonneesImportSection = Omit<Section, 'id' | 'project_id' | 'updated_at'>

export type ResultatImportJSON =
  { ok: true; donnees: DonneesImportSection } | { ok: false; motif: string }

const TYPES_GABARIT_CONNUS: readonly TemplateType[] = [
  'contexte_procede',
  'urs',
  'dq',
  'fat',
  'sat',
  'iq',
  'oq',
  'pq',
  'validation_procede',
  'plan_metrologie',
  'plan_maintenance',
]

const STATUTS_CONNUS: readonly StatutSection[] = [
  'brouillon_aide',
  'propose_par_ia_non_valide',
  'en_verification',
  'en_approbation',
  'valide_en_interne',
]

/**
 * Valide et extrait les données réimportables d'un export JSON de section
 * — jamais un `JSON.parse` fait confiance aveuglément
 * : un fichier corrompu, tronqué, ou provenant d'une version incompatible
 * de l'outil doit produire une erreur explicite, jamais une section
 * partiellement remplie silencieusement.
 *
 * @requirement Import JSON de section
 *
 * `id`/`project_id`/`updated_at` sont délibérément exclus du résultat :
 * l'import crée toujours une section **nouvelle** dans le projet cible
 * (jamais un écrasement par id, qui risquerait une collision entre deux
 * installations) — c'est à l'appelant (store) de générer un nouvel `id`,
 * d'affecter le `project_id` cible et l'horodatage de mise à jour.
 */
export function analyserImportJSON(texteBrut: string): ResultatImportJSON {
  let objet: unknown
  try {
    objet = JSON.parse(texteBrut)
  } catch {
    return { ok: false, motif: "Fichier illisible — ce n'est pas un JSON valide." }
  }

  if (typeof objet !== 'object' || objet === null) {
    return {
      ok: false,
      motif: 'Contenu JSON invalide — attendu un objet représentant une section.',
    }
  }
  const candidat = objet as Record<string, unknown>

  if (
    typeof candidat.template_type !== 'string' ||
    !TYPES_GABARIT_CONNUS.includes(candidat.template_type as TemplateType)
  ) {
    return { ok: false, motif: 'Type de gabarit (`template_type`) manquant ou non reconnu.' }
  }
  if (
    typeof candidat.status !== 'string' ||
    !STATUTS_CONNUS.includes(candidat.status as StatutSection)
  ) {
    return { ok: false, motif: 'Statut de section (`status`) manquant ou non reconnu.' }
  }
  if (typeof candidat.values !== 'object' || candidat.values === null) {
    return {
      ok: false,
      motif: '`values` manquant — ce fichier ne ressemble pas à un export de section.',
    }
  }
  if (typeof candidat.tables !== 'object' || candidat.tables === null) {
    return {
      ok: false,
      motif: '`tables` manquant — ce fichier ne ressemble pas à un export de section.',
    }
  }
  if (typeof candidat.meta !== 'object' || candidat.meta === null) {
    return {
      ok: false,
      motif: '`meta` manquant — ce fichier ne ressemble pas à un export de section.',
    }
  }
  if (!Array.isArray(candidat.audit_log)) {
    return {
      ok: false,
      motif: '`audit_log` manquant — ce fichier ne ressemble pas à un export de section.',
    }
  }

  // Reconstruction explicite plutôt qu'un spread de `candidat` : un objet
  // qui conserverait `id`/`project_id` inviterait un appelant négligent à
  // les réutiliser tel quel, recréant exactement le risque de collision
  // entre installations que ce module existe pour éviter (retrait donc
  // effectif à l'exécution, pas seulement typé).
  const donnees: DonneesImportSection = {
    template_type: candidat.template_type as TemplateType,
    template_engine_version: candidat.template_engine_version as string,
    owner_id: candidat.owner_id as string,
    shared_with: candidat.shared_with as DonneesImportSection['shared_with'],
    language: candidat.language as DonneesImportSection['language'],
    status: candidat.status as StatutSection,
    meta: candidat.meta as DonneesImportSection['meta'],
    workflow: candidat.workflow as DonneesImportSection['workflow'],
    signatures: candidat.signatures as DonneesImportSection['signatures'],
    revisions: candidat.revisions as DonneesImportSection['revisions'],
    values: candidat.values as DonneesImportSection['values'],
    tables: candidat.tables as DonneesImportSection['tables'],
    generation_source: candidat.generation_source as DonneesImportSection['generation_source'],
    audit_log: candidat.audit_log as DonneesImportSection['audit_log'],
    created_at: candidat.created_at as string,
  }
  return { ok: true, donnees }
}

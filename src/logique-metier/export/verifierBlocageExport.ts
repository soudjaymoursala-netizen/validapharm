import type { Section } from '../domaine/types'

export type ResultatBlocageExport = { bloque: false } | { bloque: true; motif: string }

/**
 * Garde-fou non négociable (FS §4.3bis, URS-F-027, mitige AR-R-13/R-19) :
 * l'export d'une section encore `propose_par_ia_non_valide` est bloqué par
 * défaut — un contenu jamais revu par un humain ne doit pas se retrouver
 * dans un export qui a l'apparence d'un livrable.
 *
 * @requirement URS-F-027, FS §4.3bis
 *
 * Ne bloque QUE ce statut précis — un `brouillon_aide` reste exportable
 * (URS-F-021 permet explicitement l'export/import JSON comme mécanisme de
 * sauvegarde/transfert, y compris pour un brouillon non terminé).
 */
export function verifierBlocageExport(section: Pick<Section, 'status'>): ResultatBlocageExport {
  if (section.status === 'propose_par_ia_non_valide') {
    return {
      bloque: true,
      motif:
        "Cette section contient encore du contenu proposé par l'IA, jamais validé par un humain (statut « propose_par_ia_non_valide »).",
    }
  }
  return { bloque: false }
}

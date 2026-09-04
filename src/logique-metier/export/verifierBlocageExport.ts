import type { Section } from '../domaine/types'
import {
  evaluerReglesConformite,
  type RegleConformite,
} from '../conformite/evaluerReglesConformite'

export type ResultatBlocageExport = { bloque: false } | { bloque: true; motif: string }

const REGLES_BLOCAGE_EXPORT: readonly RegleConformite<Pick<Section, 'status'>>[] = [
  {
    code: 'contenu_ia_non_valide',
    bloque: (section) => section.status === 'propose_par_ia_non_valide',
    message:
      "Cette section contient encore du contenu proposé par l'IA, jamais validé par un humain (statut « propose_par_ia_non_valide »).",
  },
]

/**
 * Garde-fou non négociable (FS §4.3bis, mitige AR-R-13/R-19) :
 * l'export d'une section encore `propose_par_ia_non_valide` est bloqué par
 * défaut — un contenu jamais revu par un humain ne doit pas se retrouver
 * dans un export qui a l'apparence d'un livrable.
 *
 * @requirement FS §4.3bis
 *
 * Ne bloque QUE ce statut précis — un `brouillon_aide` reste exportable
 * (l'export/import JSON est explicitement permis comme mécanisme de
 * sauvegarde/transfert, y compris pour un brouillon non terminé).
 *
 * Implémenté depuis la Phase 30 (TD-028) via le Compliance Engine
 * généralisé (`evaluerReglesConformite`) — comportement strictement
 * identique à avant ce refactor.
 */
export function verifierBlocageExport(section: Pick<Section, 'status'>): ResultatBlocageExport {
  const [regleBloquante] = evaluerReglesConformite(section, REGLES_BLOCAGE_EXPORT)
  if (regleBloquante) {
    return { bloque: true, motif: regleBloquante.message }
  }
  return { bloque: false }
}

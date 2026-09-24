import type { QualificationStatus } from '../domaine/types'

/**
 * Vit dans `logique-metier/` car le narratif de contexte (également transmis
 * au Reasoning Engine) en a besoin, en plus des écrans.
 */
export const LIBELLES_STATUT_QUALIFICATION: Record<QualificationStatus, string> = {
  non_qualifie: 'Non qualifié',
  en_cours_qualification_initiale: 'En cours de qualification initiale',
  qualifie: 'Qualifié',
  qualifie_ecart_ouvert: 'Qualifié — écart ouvert',
  requalification_requise: 'Requalification requise',
  requalification_en_retard: 'Requalification en retard',
  suspendu: 'Suspendu',
  declasse: 'Déclassé',
}

import type { Section } from '../domaine/types'

/**
 * Export JSON d'une section — "sérialisation complète
 * d'une section, réutilisable pour sauvegarde manuelle ou transfert entre
 * postes". Sérialisation directe et complète du modèle pivot,
 * jamais un sous-ensemble — un transfert entre postes doit pouvoir
 * recréer la section à l'identique (voir `analyserImportJSON.ts`).
 *
 * @requirement Export JSON de section
 */
export function genererExportJSON(section: Section): string {
  return JSON.stringify(section, null, 2)
}

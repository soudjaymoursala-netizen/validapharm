import type { Section } from '../domaine/types'

/**
 * Export JSON d'une section (FS §4.3, URS-F-021) — "sérialisation complète
 * d'une section, réutilisable pour sauvegarde manuelle ou transfert entre
 * postes". Sérialisation directe et complète du modèle pivot (FS §3),
 * jamais un sous-ensemble — un transfert entre postes doit pouvoir
 * recréer la section à l'identique (voir `analyserImportJSON.ts`).
 *
 * @requirement URS-F-021, FS §4.3
 */
export function genererExportJSON(section: Section): string {
  return JSON.stringify(section, null, 2)
}

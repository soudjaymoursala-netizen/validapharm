import type { TemplateType } from '../../domaine/types'
import type { DefinitionGabarit } from '../definitionGabarit'
import { definitionContexteProcede } from './contexteProcede'
import { definitionDQ } from './dq'
import { definitionFAT } from './fat'
import { definitionIQ } from './iq'
import { definitionOQ } from './oq'
import { definitionPlanMaintenance } from './planMaintenance'
import { definitionPlanMetrologie } from './planMetrologie'
import { definitionPQ } from './pq'
import { definitionSAT } from './sat'
import { definitionURS } from './urs'
import { definitionValidationProcede } from './validationProcede'

/**
 * Registre des gabarits réellement définis. Catalogue complet
 * pour les familles A/C/D/L/M — B (DQ) déjà couvert
 * séparément.
 *
 * Ajouter un gabarit manquant : un nouveau fichier dans ce dossier +
 * une entrée ici, jamais une modification du moteur de rendu
 * (`RenduGabarit.vue`) ni de `validerChamp`/`evaluerColonneCalculee`.
 */
const CATALOGUE: Partial<Record<TemplateType, DefinitionGabarit>> = {
  contexte_procede: definitionContexteProcede,
  urs: definitionURS,
  dq: definitionDQ,
  fat: definitionFAT,
  sat: definitionSAT,
  iq: definitionIQ,
  oq: definitionOQ,
  pq: definitionPQ,
  validation_procede: definitionValidationProcede,
  plan_metrologie: definitionPlanMetrologie,
  plan_maintenance: definitionPlanMaintenance,
}

export function obtenirDefinitionGabarit(
  templateType: TemplateType,
): DefinitionGabarit | undefined {
  return CATALOGUE[templateType]
}

/** Tous les gabarits réellement définis — utilisé par la bibliothèque de normes (§4.5) pour agréger `normes_associees` sans dupliquer le registre. */
export function listerTousLesGabarits(): DefinitionGabarit[] {
  return Object.values(CATALOGUE)
}

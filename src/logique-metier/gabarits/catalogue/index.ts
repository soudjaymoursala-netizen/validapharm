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
 * Registre des gabarits réellement définis (FDS §4). Catalogue complet
 * pour les familles A/C/D/L/M (URS §10) — B (DQ) déjà couvert
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

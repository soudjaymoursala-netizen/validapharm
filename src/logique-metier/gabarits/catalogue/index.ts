import type { TemplateType } from '../../domaine/types'
import type { DefinitionGabarit } from '../definitionGabarit'
import { definitionContexteProcede } from './contexteProcede'
import { definitionDQ } from './dq'
import { definitionPlanMetrologie } from './planMetrologie'

/**
 * Registre des gabarits réellement définis (FDS §4). Volontairement
 * partiel à ce stade : `urs`, `fat`, `sat`, `iq`, `oq`, `pq`,
 * `validation_procede`, `plan_maintenance` sont déjà des `TemplateType`
 * exploitables ailleurs dans l'application (création de section,
 * garde-fous de finalisation) mais n'ont pas encore leur propre
 * définition déclarative — `obtenirDefinitionGabarit` renvoie `undefined`
 * pour eux, et l'écran appelant doit alors se rabattre sur un rendu
 * générique plutôt que de planter (voir EditeurSection.vue).
 *
 * Ajouter un gabarit manquant : un nouveau fichier dans ce dossier +
 * une entrée ici, jamais une modification du moteur de rendu
 * (`RenduGabarit.vue`) ni de `validerChamp`/`evaluerColonneCalculee`.
 */
const CATALOGUE: Partial<Record<TemplateType, DefinitionGabarit>> = {
  contexte_procede: definitionContexteProcede,
  dq: definitionDQ,
  plan_metrologie: definitionPlanMetrologie,
}

export function obtenirDefinitionGabarit(
  templateType: TemplateType,
): DefinitionGabarit | undefined {
  return CATALOGUE[templateType]
}

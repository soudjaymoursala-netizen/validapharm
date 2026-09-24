import type { TemplateType } from '../../logique-metier/domaine/types'

export const LIBELLES_GABARIT: Record<TemplateType, string> = {
  contexte_procede: 'Contexte procédé',
  urs: 'URS',
  dq: 'DQ',
  fat: 'FAT',
  sat: 'SAT',
  iq: 'IQ',
  oq: 'OQ',
  pq: 'PQ',
  validation_procede: 'Validation procédé',
  plan_metrologie: 'Plan de métrologie',
  plan_maintenance: 'Plan de maintenance',
  csv: 'CSV — Dossier de validation de système informatisé',
}

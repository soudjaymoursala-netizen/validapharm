import type { Langue, TemplateType } from '../domaine/types'

/**
 * Types du moteur de gabarits déclaratif (FDS §4).
 *
 * @requirement FDS §4
 *
 * Miroir strict du schéma JSON documenté en FDS §4 — mêmes noms de champs
 * (`field_key`, `labels`, `required_link_type`…) pour la même raison que le
 * modèle pivot FS §3 (08-conventions-codage.md §4 : un auditeur qui compare
 * une définition de gabarit à la FDS doit retrouver les mêmes noms sans
 * traduction mentale).
 *
 * **Règle de conception non négociable (FDS §4)** : ce fichier ne connaît
 * QUE ce schéma générique. Ajouter un gabarit (ex. futur "Validation du
 * transport") ne doit jamais nécessiter de modifier ce fichier ni le
 * moteur de rendu — seulement un nouveau fichier dans `catalogue/`.
 */

export interface OptionListe {
  valeur: string
  labels: Record<Langue, string>
}

/** Formule de calcul réglementaire référencée par une colonne (FDS §5) — jamais saisissable, toujours dérivée. */
export interface FormuleColonne {
  cle: 'ipr'
  /** Clés des colonnes de la même ligne consommées par la formule, dans l'ordre attendu par celle-ci. */
  entrees: readonly string[]
}

export interface ChampTexteCourt {
  field_key: string
  labels: Record<Langue, string>
  type: 'texte_court'
  required: boolean
  longueur_max?: number
}

export interface ChampTexteLong {
  field_key: string
  labels: Record<Langue, string>
  type: 'texte_long'
  required: boolean
}

export interface ChampListe {
  field_key: string
  labels: Record<Langue, string>
  type: 'liste'
  required: boolean
  options: OptionListe[]
}

export interface ChampDate {
  field_key: string
  labels: Record<Langue, string>
  type: 'date'
  required: boolean
  min?: string
  max?: string
}

export interface ChampNombre {
  field_key: string
  labels: Record<Langue, string>
  type: 'nombre'
  required: boolean
  min: number
  max: number
  /** Présent uniquement pour une colonne de tableau_dynamique — jamais pour un champ scalaire (FDS §5). */
  formule?: FormuleColonne
}

/** Colonnes d'un tableau dynamique — mêmes types scalaires qu'un champ de section, jamais un tableau imbriqué. */
export type ColonneTableau = ChampTexteCourt | ChampListe | ChampDate | ChampNombre

export interface ChampTableauDynamique {
  field_key: string
  labels: Record<Langue, string>
  type: 'tableau_dynamique'
  required: boolean
  colonnes: ColonneTableau[]
}

export type DefinitionChamp =
  ChampTexteCourt | ChampTexteLong | ChampListe | ChampDate | ChampNombre | ChampTableauDynamique

export interface DefinitionSection {
  section_key: string
  labels: Record<Langue, string>
  fields: DefinitionChamp[]
  /**
   * Purement informationnel dans cet incrément : les garde-fous de
   * finalisation réels (FDS §3.3, U-01/U-02/U-03) restent portés par
   * `logique-metier/machine-etats/gardesFinalisation.ts`, pas relus depuis
   * ce champ — ne jamais supposer qu'une valeur ici change le comportement
   * de blocage tant que ce couplage n'est pas fait explicitement.
   */
  required_link_type: 'contexte_procede' | 'plan_metrologie' | 'plan_maintenance' | null
}

export interface DefinitionGabarit {
  template_id: TemplateType
  template_version: string
  family: string
  sections: DefinitionSection[]
  normes_associees: string[]
}

import type { ColonneTableau, DefinitionChamp } from './definitionGabarit'

export type ResultatValidationChamp = { valide: true } | { valide: false; message: string }

const FORMAT_DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

/**
 * Valide une valeur saisie contre la définition de son champ —
 * messages d'erreur exactement ceux documentés, jamais un message
 * générique.
 *
 * @requirement Validation de champ de gabarit
 *
 * Une valeur vide (`null`/`''`) est toujours valide ici, y compris pour un
 * champ `required` : le caractère obligatoire est une décision de
 * finalisation, pas une règle de saisie caractère par
 * caractère — cohérent avec le principe déjà appliqué à `calculerIPR`
 * ("valeurs vides → non calculé, jamais une erreur").
 */
export function validerChamp(
  champ: DefinitionChamp | ColonneTableau,
  valeur: string | number | null,
): ResultatValidationChamp {
  if (valeur === null || valeur === '') return { valide: true }

  switch (champ.type) {
    case 'texte_court': {
      if (
        champ.longueur_max !== undefined &&
        typeof valeur === 'string' &&
        valeur.length > champ.longueur_max
      ) {
        return {
          valide: false,
          message: `Ce champ ne peut dépasser ${champ.longueur_max} caractères.`,
        }
      }
      return { valide: true }
    }

    case 'texte_long':
      return { valide: true }

    case 'liste': {
      const valeursReconnues = champ.options.map((option) => option.valeur)
      if (typeof valeur !== 'string' || !valeursReconnues.includes(valeur)) {
        return { valide: false, message: 'Valeur non reconnue pour ce champ.' }
      }
      return { valide: true }
    }

    case 'date': {
      if (typeof valeur !== 'string' || !FORMAT_DATE_ISO.test(valeur)) {
        return { valide: false, message: 'Date invalide ou hors plage autorisée.' }
      }
      if (
        (champ.min !== undefined && valeur < champ.min) ||
        (champ.max !== undefined && valeur > champ.max)
      ) {
        return { valide: false, message: 'Date invalide ou hors plage autorisée.' }
      }
      return { valide: true }
    }

    case 'nombre': {
      const nombre = typeof valeur === 'number' ? valeur : Number(valeur)
      if (Number.isNaN(nombre) || nombre < champ.min || nombre > champ.max) {
        return { valide: false, message: `Valeur hors plage (${champ.min}-${champ.max}).` }
      }
      return { valide: true }
    }

    case 'tableau_dynamique':
      // Validé ligne par ligne, colonne par colonne — jamais au niveau du champ lui-même.
      return { valide: true }
  }
}

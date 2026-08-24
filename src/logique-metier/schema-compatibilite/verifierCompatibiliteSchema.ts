import { comparerVersions } from './comparerVersions'

export type ResultatCompatibiliteSchema =
  | { compatible: true; migrationRequise: false }
  | { compatible: true; migrationRequise: true }
  | { compatible: false; messageCode: 'U-12' }

/**
 * Détermine si l'application peut ouvrir des données dont le schéma porte
 * `versionDepot`, compte tenu de la version maximale que cette version de
 * l'application sait lire (`versionMaxConnue`).
 *
 * @param versionDepot Version du schéma des données (`schema_version.json`, SDS §3).
 * @param versionMaxConnue Version de schéma maximale connue par cette version de l'application.
 * @returns Compatible sans migration, compatible avec migration requise, ou incompatible (U-12).
 * @requirement URS-NF-055bis, URS-NF-046, FDS §7 (U-12)
 *
 * Vérification prioritaire et non négociable (SDS §3) : un schéma postérieur
 * à `versionMaxConnue` (cas d'un retour à une version antérieure de
 * l'application après une migration) DOIT être détecté et bloquant, avant
 * même la vérification inverse (migration à appliquer). Cette fonction ne
 * déclenche aucun accès aux données — c'est au code appelant (persistance)
 * de ne lire/écrire qu'après avoir reçu `compatible: true`.
 */
export function verifierCompatibiliteSchema(
  versionDepot: string,
  versionMaxConnue: string,
): ResultatCompatibiliteSchema {
  const comparaison = comparerVersions(versionDepot, versionMaxConnue)

  if (comparaison > 0) {
    return { compatible: false, messageCode: 'U-12' }
  }
  if (comparaison < 0) {
    return { compatible: true, migrationRequise: true }
  }
  return { compatible: true, migrationRequise: false }
}

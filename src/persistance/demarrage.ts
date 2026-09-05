import { verifierCompatibiliteSchema } from '../logique-metier/schema-compatibilite/verifierCompatibiliteSchema'
import type { ValidaPharmDatabase } from './db'

/**
 * Version de schéma maximale que cette version de l'application sait lire.
 * À incrémenter à chaque évolution de schéma nécessitant une migration
 * cohérente avec `db.ts` (`this.version(1)`).
 */
export const VERSION_SCHEMA_CONNUE = '1.0.0'

const IDENTIFIANT_ENREGISTREMENT_UNIQUE = 'unique'

export type ResultatDemarrage =
  { pretPourAcces: true } | { pretPourAcces: false; messageCode: 'U-12' }

/**
 * Vérifie la compatibilité de schéma **avant tout autre accès** à la base
 * locale — première opération de démarrage de l'application,
 * avant même la vérification de migration ascendante.
 *
 * @requirement Vérification de compatibilité de schéma (U-12)
 *
 * Une base neuve (jamais initialisée, aucun enregistrement
 * `schemaVersion`) est compatible par construction — il n'y a encore
 * aucune donnée dont la version pourrait entrer en conflit.
 *
 * Cas `migrationRequise` (version du dépôt antérieure à la version
 * connue) : l'exécution réelle du script de migration (sauvegarde/retour
 * arrière via référence Git) dépend du connecteur GitHub, pas
 * encore implémenté à ce stade de la conception (backlog) — ce cas
 * n'empêche donc pas l'accès pour l'instant, il est seulement distingué
 * pour ne jamais être confondu silencieusement avec le cas nominal une
 * fois la migration réellement câblée.
 */
export async function verifierCompatibiliteAvantAcces(
  db: ValidaPharmDatabase,
): Promise<ResultatDemarrage> {
  const enregistrement = await db.schemaVersion.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)

  if (enregistrement === undefined) {
    return { pretPourAcces: true }
  }

  const resultat = verifierCompatibiliteSchema(enregistrement.version, VERSION_SCHEMA_CONNUE)
  if (!resultat.compatible) {
    return { pretPourAcces: false, messageCode: resultat.messageCode }
  }
  return { pretPourAcces: true }
}

/**
 * Initialise l'enregistrement `schemaVersion` sur une base neuve. Ne fait
 * rien si un enregistrement existe déjà — n'écrase jamais silencieusement
 * une version existante.
 *
 * @requirement Initialisation de la version de schéma
 */
export async function initialiserVersionSchemaSiAbsente(db: ValidaPharmDatabase): Promise<void> {
  const enregistrement = await db.schemaVersion.get(IDENTIFIANT_ENREGISTREMENT_UNIQUE)
  if (enregistrement === undefined) {
    await db.schemaVersion.put({
      id: IDENTIFIANT_ENREGISTREMENT_UNIQUE,
      version: VERSION_SCHEMA_CONNUE,
      migrated_at: new Date().toISOString(),
    })
  }
}

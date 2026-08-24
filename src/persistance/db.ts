import Dexie, { type EntityTable } from 'dexie'
import type {
  ClientConfig,
  Project,
  ProjectDocument,
  Section,
} from '../logique-metier/domaine/types'

export interface EnregistrementVersionSchema {
  id: 'unique'
  version: string
  migrated_at: string
}

/**
 * Configuration de connexion au dépôt GitHub dédié (URS-NF-044) —
 * enregistrement unique, pas par client : SDS §3 décrit un seul dépôt de
 * données pour l'ensemble de l'installation locale (`/data/projects/...`),
 * pas un dépôt par client.
 */
export interface EnregistrementConnexionGitHub {
  id: 'unique'
  owner: string
  repo: string
  branche: string
  jeton: string
}

/**
 * SHA de branche connu après la dernière synchronisation réussie —
 * nécessaire à la détection de conflit optimiste (SDS §5) : chaque
 * `ecrireGroupe` doit connaître le SHA sur lequel il se base.
 */
export interface EnregistrementEtatSynchronisation {
  id: 'unique'
  shaBrancheConnue: string | null
  derniereSynchronisation: string | null
}

/**
 * Cache local IndexedDB (SDS §3) — miroir de performance/hors-ligne,
 * jamais la source de vérité (le dépôt GitHub dédié l'est). Une table par
 * type d'enregistrement, alignée sur l'arborescence `/data` documentée en
 * SDS §3.
 *
 * @requirement SDS §3, URS-NF-046, URS-NF-012
 */
export class ValidaPharmDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  sections!: EntityTable<Section, 'id'>
  projectDocuments!: EntityTable<ProjectDocument, 'id'>
  clientConfigs!: EntityTable<ClientConfig, 'client_id'>
  schemaVersion!: EntityTable<EnregistrementVersionSchema, 'id'>
  connexionGitHub!: EntityTable<EnregistrementConnexionGitHub, 'id'>
  etatSynchronisation!: EntityTable<EnregistrementEtatSynchronisation, 'id'>

  constructor(nomBaseDeDonnees = 'validapharm') {
    super(nomBaseDeDonnees)
    this.version(1).stores({
      projects: 'id, client_id, updated_at',
      sections: 'id, project_id, template_type, status, updated_at',
      projectDocuments: 'id, project_id',
      clientConfigs: 'client_id',
      schemaVersion: 'id',
      connexionGitHub: 'id',
      etatSynchronisation: 'id',
    })
  }
}

/**
 * Instance unique utilisée par l'application réelle (stores Pinia). Les
 * tests instancient leur propre `ValidaPharmDatabase` (nom de base isolé)
 * plutôt que d'importer ce singleton, pour ne jamais partager d'état entre
 * tests.
 */
export const db = new ValidaPharmDatabase()

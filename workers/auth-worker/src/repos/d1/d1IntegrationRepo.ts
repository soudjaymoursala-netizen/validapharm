import type { D1Database } from '../../d1Types'
import type {
  ConnectorEnregistre,
  ExternalReferenceEnregistre,
  IntegrationRepo,
  SyncJobEnregistre,
} from '../integrationRepo'

function ligneVersConnector(l: Record<string, unknown>): ConnectorEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    nom: l.nom as string,
    actif: Boolean(l.actif),
    type: l.type as string,
    config: l.config as string,
    createdAt: l.created_at as string,
  }
}

function ligneVersSyncJob(l: Record<string, unknown>): SyncJobEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    connectorId: l.connector_id as string,
    statut: l.statut as string,
    tentative: l.tentative as number,
    derniereErreur: l.derniere_erreur as string | null,
    createdAt: l.created_at as string,
    updatedAt: l.updated_at as string,
  }
}

function ligneVersExternalReference(l: Record<string, unknown>): ExternalReferenceEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    connectorId: l.connector_id as string,
    identifiantExterne: l.identifiant_externe as string,
    libelle: l.libelle as string,
    createdAt: l.created_at as string,
  }
}

export class D1IntegrationRepo implements IntegrationRepo {
  constructor(private readonly db: D1Database) {}

  async listerConnectors(clientId: string): Promise<ConnectorEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM connectors WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersConnector(l as Record<string, unknown>))
  }

  async creerConnector(c: ConnectorEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO connectors (id, client_id, nom, actif, type, config, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(c.id, c.clientId, c.nom, c.actif ? 1 : 0, c.type, c.config, c.createdAt)
      .run()
  }

  async connectorParId(id: string): Promise<ConnectorEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM connectors WHERE id = ?').bind(id).first()
    return ligne ? ligneVersConnector(ligne as Record<string, unknown>) : null
  }

  async remplacerConnector(c: ConnectorEnregistre): Promise<void> {
    await this.db
      .prepare('UPDATE connectors SET nom = ?, actif = ? WHERE id = ?')
      .bind(c.nom, c.actif ? 1 : 0, c.id)
      .run()
  }

  async supprimerConnector(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM connectors WHERE id = ?').bind(id).run()
  }

  async listerSyncJobs(clientId: string): Promise<SyncJobEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM sync_jobs WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersSyncJob(l as Record<string, unknown>))
  }

  async creerSyncJob(j: SyncJobEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO sync_jobs
          (id, client_id, connector_id, statut, tentative, derniere_erreur, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        j.id,
        j.clientId,
        j.connectorId,
        j.statut,
        j.tentative,
        j.derniereErreur,
        j.createdAt,
        j.updatedAt,
      )
      .run()
  }

  async syncJobParId(id: string): Promise<SyncJobEnregistre | null> {
    const ligne = await this.db.prepare('SELECT * FROM sync_jobs WHERE id = ?').bind(id).first()
    return ligne ? ligneVersSyncJob(ligne as Record<string, unknown>) : null
  }

  async remplacerSyncJob(j: SyncJobEnregistre): Promise<void> {
    await this.db
      .prepare(
        `UPDATE sync_jobs
         SET statut = ?, tentative = ?, derniere_erreur = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(j.statut, j.tentative, j.derniereErreur, j.updatedAt, j.id)
      .run()
  }

  async listerExternalReferences(clientId: string): Promise<ExternalReferenceEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM external_references WHERE client_id = ?')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersExternalReference(l as Record<string, unknown>))
  }

  async creerExternalReference(r: ExternalReferenceEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO external_references
          (id, client_id, connector_id, identifiant_externe, libelle, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(r.id, r.clientId, r.connectorId, r.identifiantExterne, r.libelle, r.createdAt)
      .run()
  }
}

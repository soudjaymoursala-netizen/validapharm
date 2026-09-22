import type { D1Database } from '../../d1Types'
import type { AiChatSessionLogEnregistre, AiChatSessionLogRepo } from '../aiChatSessionLogRepo'

function ligneVersEntree(l: Record<string, unknown>): AiChatSessionLogEnregistre {
  return {
    id: l.id as string,
    clientId: l.client_id as string,
    startedAt: l.started_at as string,
    endedAt: l.ended_at as string | null,
    mode: l.mode as string,
    aiProvider: l.ai_provider as string,
    moteurVersion: l.moteur_version as string | null,
    documentJoint: Boolean(l.document_joint),
  }
}

export class D1AiChatSessionLogRepo implements AiChatSessionLogRepo {
  constructor(private readonly db: D1Database) {}

  async listerParClient(clientId: string): Promise<AiChatSessionLogEnregistre[]> {
    const resultat = await this.db
      .prepare('SELECT * FROM ai_chat_session_logs WHERE client_id = ? ORDER BY started_at')
      .bind(clientId)
      .all()
    return resultat.results.map((l) => ligneVersEntree(l as Record<string, unknown>))
  }

  async creer(e: AiChatSessionLogEnregistre): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ai_chat_session_logs
          (id, client_id, started_at, ended_at, mode, ai_provider, moteur_version, document_joint)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        e.id,
        e.clientId,
        e.startedAt,
        e.endedAt,
        e.mode,
        e.aiProvider,
        e.moteurVersion,
        e.documentJoint ? 1 : 0,
      )
      .run()
  }
}

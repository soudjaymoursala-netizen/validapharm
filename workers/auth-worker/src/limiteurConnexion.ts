import type { D1Database } from './d1Types'

/**
 * Limitation des tentatives de mot de passe (audit du 25/09/2026, M7) —
 * `/auth/login` et `/auth/verify-password` n'avaient aucune limite : 50
 * essais parallèles passaient en 2,6 s.
 *
 * Compteur par clé : au-delà de `ECHECS_MAX` échecs dans la fenêtre pour
 * un même compte (`email:…`), ou `ECHECS_MAX_IP` pour une même adresse IP
 * (`ip:…` — seuil plus haut : un bureau entier peut partager une adresse,
 * un seul collègue qui se trompe ne doit jamais bloquer les autres), la
 * clé est bloquée pendant `DUREE_BLOCAGE_MS`.
 *
 * **(26/09/2026, décision utilisateur)** Persisté en D1
 * (`tentatives_connexion`, migration 0029) : le blocage vaut pour toutes
 * les instances du Worker, plus seulement pour l'isolat qui a vu les
 * échecs. Si la table est indisponible (migration pas encore appliquée),
 * repli sur un compteur en mémoire — jamais une connexion refusée à tort
 * pour une raison d'infrastructure.
 */

export const ECHECS_MAX = 5
export const ECHECS_MAX_IP = 30
export const FENETRE_MS = 15 * 60 * 1000
export const DUREE_BLOCAGE_MS = 15 * 60 * 1000
const CLES_MAX = 10_000

export interface LimiteurConnexion {
  /** Vrai si l'une des clés est actuellement bloquée. */
  estBloque(cles: string[]): Promise<boolean>
  enregistrerEchec(cles: string[]): Promise<void>
  enregistrerSucces(cles: string[]): Promise<void>
}

interface EtatCle {
  echecs: number
  debut: number
  bloqueJusqua: number
}

function seuil(cle: string): number {
  return cle.startsWith('ip:') ? ECHECS_MAX_IP : ECHECS_MAX
}

/** Nouvel état d'une clé après un échec supplémentaire à l'instant `t`. */
function apresEchec(etat: EtatCle | undefined, cle: string, t: number): EtatCle {
  const courant =
    etat && t - etat.debut < FENETRE_MS ? { ...etat } : { echecs: 0, debut: t, bloqueJusqua: 0 }
  courant.echecs += 1
  if (courant.echecs >= seuil(cle)) {
    courant.bloqueJusqua = t + DUREE_BLOCAGE_MS
    courant.echecs = 0
    courant.debut = t
  }
  return courant
}

export class LimiteurConnexionMemoire implements LimiteurConnexion {
  private readonly etats = new Map<string, EtatCle>()

  constructor(private readonly maintenant: () => number = () => Date.now()) {}

  async estBloque(cles: string[]): Promise<boolean> {
    const t = this.maintenant()
    return cles.some((cle) => (this.etats.get(cle)?.bloqueJusqua ?? 0) > t)
  }

  async enregistrerEchec(cles: string[]): Promise<void> {
    const t = this.maintenant()
    if (this.etats.size > CLES_MAX) this.purger(t)
    for (const cle of cles) this.etats.set(cle, apresEchec(this.etats.get(cle), cle, t))
  }

  async enregistrerSucces(cles: string[]): Promise<void> {
    for (const cle of cles) this.etats.delete(cle)
  }

  private purger(t: number): void {
    for (const [cle, etat] of this.etats) {
      if (etat.bloqueJusqua <= t && t - etat.debut >= FENETRE_MS) this.etats.delete(cle)
    }
  }
}

interface LigneTentative {
  cle: string
  echecs: number
  debut: number
  bloque_jusqua: number
}

export class D1LimiteurConnexion implements LimiteurConnexion {
  private readonly repli = new LimiteurConnexionMemoire()

  constructor(
    private readonly db: D1Database,
    private readonly maintenant: () => number = () => Date.now(),
  ) {}

  private async lire(cle: string): Promise<EtatCle | undefined> {
    const ligne = await this.db
      .prepare('SELECT * FROM tentatives_connexion WHERE cle = ?')
      .bind(cle)
      .first<LigneTentative>()
    return ligne
      ? { echecs: ligne.echecs, debut: ligne.debut, bloqueJusqua: ligne.bloque_jusqua }
      : undefined
  }

  async estBloque(cles: string[]): Promise<boolean> {
    try {
      const t = this.maintenant()
      for (const cle of cles) {
        if (((await this.lire(cle))?.bloqueJusqua ?? 0) > t) return true
      }
      return false
    } catch {
      return this.repli.estBloque(cles)
    }
  }

  async enregistrerEchec(cles: string[]): Promise<void> {
    try {
      const t = this.maintenant()
      for (const cle of cles) {
        const etat = apresEchec(await this.lire(cle), cle, t)
        await this.db
          .prepare(
            `INSERT INTO tentatives_connexion (cle, echecs, debut, bloque_jusqua)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(cle) DO UPDATE SET
               echecs = excluded.echecs, debut = excluded.debut,
               bloque_jusqua = excluded.bloque_jusqua`,
          )
          .bind(cle, etat.echecs, etat.debut, etat.bloqueJusqua)
          .run()
      }
    } catch {
      await this.repli.enregistrerEchec(cles)
    }
  }

  async enregistrerSucces(cles: string[]): Promise<void> {
    try {
      for (const cle of cles) {
        await this.db.prepare('DELETE FROM tentatives_connexion WHERE cle = ?').bind(cle).run()
      }
    } catch {
      await this.repli.enregistrerSucces(cles)
    }
  }
}

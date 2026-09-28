import type { D1Database } from './d1Types'

/**
 * Quota d'appels au relais IA par utilisateur (audit sécurité a1) : tout
 * compte pouvait appeler le fournisseur sans limite — coût et
 * confidentialité. Fenêtre glissante simple : au plus `maximum` appels par
 * fenêtre de `fenetreMs`, puis 429 jusqu'à la fin de la fenêtre.
 *
 * Persisté dans la table `tentatives_connexion` (migration 0029, déjà en
 * production) avec une clé `ia:<userId>` — même forme de compteur
 * (clé, nombre, début de fenêtre), aucune nouvelle migration. Repli en
 * mémoire si la table est indisponible : jamais un refus pour une raison
 * d'infrastructure.
 */
export const QUOTA_IA_PAR_HEURE = 300
export const FENETRE_QUOTA_IA_MS = 60 * 60 * 1000

export interface QuotaRelaisIA {
  /** Compte un appel ; `false` si le quota de la fenêtre est déjà atteint (appel non compté). */
  consommer(cle: string): Promise<boolean>
}

interface EtatQuota {
  appels: number
  debut: number
}

function apresAppel(
  etat: EtatQuota | undefined,
  t: number,
  maximum: number,
  fenetreMs: number,
): EtatQuota | null {
  const courant = etat && t - etat.debut < fenetreMs ? etat : { appels: 0, debut: t }
  if (courant.appels >= maximum) return null
  return { appels: courant.appels + 1, debut: courant.debut }
}

export class QuotaRelaisIAMemoire implements QuotaRelaisIA {
  private readonly etats = new Map<string, EtatQuota>()

  constructor(
    private readonly maximum = QUOTA_IA_PAR_HEURE,
    private readonly fenetreMs = FENETRE_QUOTA_IA_MS,
    private readonly maintenant: () => number = () => Date.now(),
  ) {}

  async consommer(cle: string): Promise<boolean> {
    const suivant = apresAppel(this.etats.get(cle), this.maintenant(), this.maximum, this.fenetreMs)
    if (!suivant) return false
    if (this.etats.size > 10_000) this.etats.clear()
    this.etats.set(cle, suivant)
    return true
  }
}

export class D1QuotaRelaisIA implements QuotaRelaisIA {
  private readonly repli: QuotaRelaisIAMemoire

  constructor(
    private readonly db: D1Database,
    private readonly maximum = QUOTA_IA_PAR_HEURE,
    private readonly fenetreMs = FENETRE_QUOTA_IA_MS,
    private readonly maintenant: () => number = () => Date.now(),
  ) {
    this.repli = new QuotaRelaisIAMemoire(maximum, fenetreMs, maintenant)
  }

  async consommer(cle: string): Promise<boolean> {
    try {
      const ligne = await this.db
        .prepare('SELECT echecs, debut FROM tentatives_connexion WHERE cle = ?')
        .bind(cle)
        .first<{ echecs: number; debut: number }>()
      const suivant = apresAppel(
        ligne ? { appels: ligne.echecs, debut: ligne.debut } : undefined,
        this.maintenant(),
        this.maximum,
        this.fenetreMs,
      )
      if (!suivant) return false
      await this.db
        .prepare(
          `INSERT INTO tentatives_connexion (cle, echecs, debut, bloque_jusqua)
           VALUES (?, ?, ?, 0)
           ON CONFLICT(cle) DO UPDATE SET echecs = excluded.echecs, debut = excluded.debut`,
        )
        .bind(cle, suivant.appels, suivant.debut)
        .run()
      return true
    } catch {
      return this.repli.consommer(cle)
    }
  }
}

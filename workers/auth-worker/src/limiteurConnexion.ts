/**
 * Limitation des tentatives de mot de passe (audit du 25/09/2026, M7) —
 * `/auth/login` et `/auth/verify-password` n'avaient aucune limite : 50
 * essais parallèles passaient en 2,6 s.
 *
 * Compteur en mémoire de l'isolat Worker, par clé : au-delà de
 * `ECHECS_MAX` échecs dans la fenêtre pour un même compte (`email:…`), ou
 * `ECHECS_MAX_IP` pour une même adresse IP (`ip:…` — seuil plus haut : un
 * bureau entier peut partager une adresse, un seul collègue qui se trompe
 * ne doit jamais bloquer les autres), la clé est bloquée pendant
 * `DUREE_BLOCAGE_MS`. Limite assumée : chaque isolat a son
 * propre compteur (pas de stockage partagé) — un frein réel contre les
 * essais en rafale, sans migration de schéma D1.
 */

export const ECHECS_MAX = 5
export const ECHECS_MAX_IP = 30
export const FENETRE_MS = 15 * 60 * 1000
export const DUREE_BLOCAGE_MS = 15 * 60 * 1000
const CLES_MAX = 10_000

interface EtatCle {
  echecs: number
  debut: number
  bloqueJusqua: number
}

export class LimiteurConnexion {
  private readonly etats = new Map<string, EtatCle>()

  constructor(private readonly maintenant: () => number = () => Date.now()) {}

  /** Vrai si l'une des clés est actuellement bloquée. */
  estBloque(cles: string[]): boolean {
    const t = this.maintenant()
    return cles.some((cle) => (this.etats.get(cle)?.bloqueJusqua ?? 0) > t)
  }

  enregistrerEchec(cles: string[]): void {
    const t = this.maintenant()
    if (this.etats.size > CLES_MAX) this.purger(t)
    for (const cle of cles) {
      const etat = this.etats.get(cle)
      const courant =
        etat && t - etat.debut < FENETRE_MS ? etat : { echecs: 0, debut: t, bloqueJusqua: 0 }
      courant.echecs += 1
      if (courant.echecs >= (cle.startsWith('ip:') ? ECHECS_MAX_IP : ECHECS_MAX)) {
        courant.bloqueJusqua = t + DUREE_BLOCAGE_MS
        courant.echecs = 0
        courant.debut = t
      }
      this.etats.set(cle, courant)
    }
  }

  enregistrerSucces(cles: string[]): void {
    for (const cle of cles) this.etats.delete(cle)
  }

  private purger(t: number): void {
    for (const [cle, etat] of this.etats) {
      if (etat.bloqueJusqua <= t && t - etat.debut >= FENETRE_MS) this.etats.delete(cle)
    }
  }
}

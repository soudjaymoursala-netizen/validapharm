import { useAuthStore } from '../stores/useAuthStore'

/**
 * Espace réservé historique — utilisé avant l'authentification réelle
 * (Phase 39) comme identité par défaut tant qu'aucun profil local n'était
 * défini. Conservé uniquement comme filet de repli défensif (jamais
 * atteint en usage normal : la garde de routeur globale exige désormais
 * une session réelle avant tout écran qui écrit un `actor`/`owner_id`) et
 * pour ne pas invalider les enregistrements déjà écrits sous cette valeur
 * avant la migration vers l'identité réelle.
 */
export const IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 = 'utilisateur-local-phase1'

/**
 * Résout l'identité réelle de l'utilisateur connecté (`useAuthStore`,
 * email du compte) pour `owner_id`/`actor`/`shared_with` — remplace
 * l'ancienne résolution par profil local (§4.31, verrou de confirmation
 * pré-authentification réelle, désormais sans rapport avec l'identité
 * multi-utilisateur). Jamais une exception : un appel hors session (garde
 * de routeur non encore passée, ou test sans authentification) retombe
 * sur l'espace réservé historique plutôt que de faire échouer l'écriture.
 */
export function identifiantActeurCourant(): string {
  return useAuthStore().utilisateur?.email ?? IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1
}

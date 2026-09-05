/**
 * Identité de l'utilisateur local — espace réservé tant qu'aucun profil
 * local (§4.31) n'a encore été défini sur ce poste.
 *
 * Historique : l'attribution réelle devait à l'origine venir d'une identité
 * GitHub authentifiée par jeton — écarté : un compte GitHub individuel par
 * employé exclurait les clients dont les utilisateurs n'ont pas de compte
 * GitHub. L'identité multi-utilisateur retenue est le profil local
 * (`ProfilLocal`, email), déjà utilisé pour l'archivage, pas un compte
 * GitHub par personne. Le jeton GitHub reste un réglage au niveau de
 * l'organisation/du client, inchangé. Voir `identifiantUtilisateurCourant`.
 */
export const IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 = 'utilisateur-local-phase1'

/**
 * Résout l'identité de l'utilisateur courant pour `owner_id`/`shared_with`
 * — le profil local (email) s'il existe, sinon l'espace réservé par
 * défaut. Jamais une exception : un poste sans profil local encore défini
 * reste pleinement fonctionnel.
 */
export function identifiantUtilisateurCourant(profil: { email: string } | null): string {
  return profil?.email || IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1
}

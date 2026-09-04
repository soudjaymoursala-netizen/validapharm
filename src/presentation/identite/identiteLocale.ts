/**
 * Identité de l'utilisateur local — espace réservé tant qu'aucun profil
 * local (§4.31/URS-F-310bis) n'a encore été défini sur ce poste.
 *
 * @requirement SDS §5 (attribution)
 *
 * Historique : le SDS prévoyait à l'origine que l'attribution réelle
 * vienne d'une identité GitHub authentifiée par jeton. **Amendé Phase 37
 * (TD-044)** : un compte GitHub individuel par employé exclurait les
 * clients dont les utilisateurs n'ont pas de compte GitHub — l'identité
 * multi-utilisateur retenue est désormais le profil local
 * (`ProfilLocal`, email) déjà construit pour l'archivage (TD-033), pas un
 * compte GitHub par personne. Le jeton GitHub reste un réglage au niveau
 * de l'organisation/du client, inchangé. Voir `identifiantUtilisateurCourant`.
 */
export const IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 = 'utilisateur-local-phase1'

/**
 * Résout l'identité de l'utilisateur courant pour `owner_id`/`shared_with`
 * (Phase 37, TD-044) — le profil local (email) s'il existe, sinon
 * l'espace réservé Phase 1. Jamais une exception : un poste sans profil
 * local encore défini reste pleinement fonctionnel (comportement Phase 1
 * inchangé), cohérent avec le caractère additif de ce chantier.
 */
export function identifiantUtilisateurCourant(profil: { email: string } | null): string {
  return profil?.email || IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1
}

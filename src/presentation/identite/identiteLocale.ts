/**
 * Identité de l'utilisateur local — Phase 1 (mono-utilisateur, sans
 * authentification, URS-NF-023 = Phase ultérieure).
 *
 * @requirement SDS §5 (attribution)
 *
 * Ce n'est **pas** le mécanisme d'attribution retenu à terme : SDS §5
 * (`22-SDS-outil.md`) prévoit que l'attribution réelle vienne de
 * l'identité GitHub authentifiée par le jeton, au moment où chaque
 * enregistrement est committé (connecteur GitHub, backlog tâche #15) —
 * pas d'une saisie locale. Tant que ce connecteur n'existe pas, il n'y a
 * aucune identité authentifiée disponible : cette constante est un
 * espace réservé Phase 1 explicite, centralisé ici pour n'exister qu'à
 * un seul endroit (jamais recopiée en dur écran par écran) et pour être
 * trivialement remplaçable par l'identité réelle une fois le connecteur
 * GitHub câblé.
 */
export const IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 = 'utilisateur-local-phase1'

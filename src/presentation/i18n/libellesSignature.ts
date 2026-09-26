/**
 * Refus d'une signature (approbation, clôture) renvoyés par le Worker —
 * décision utilisateur du 26/09/2026. Jamais un code brut à l'écran.
 */
const MESSAGES: Record<string, string> = {
  mot_de_passe_requis: 'Saisissez votre mot de passe pour signer.',
  mot_de_passe_incorrect: 'Mot de passe incorrect : rien n’a été signé.',
  trop_de_tentatives: 'Trop de mots de passe incorrects : réessayez dans 15 minutes.',
  separation_taches:
    'Séparation des tâches activée pour ce client : l’auteur ne peut pas approuver ou clôturer lui-même. Demandez à une autre personne.',
  approbateur_requis:
    "Seul l'approbateur désigné (ou un administrateur) peut approuver cette section.",
}

export function messageRefusSignature(code: string): string | null {
  return MESSAGES[code] ?? null
}

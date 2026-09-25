/**
 * Contrôle de sécurité d'un fichier récupéré depuis GitHub, AVANT tout
 * envoi au serveur (décision utilisateur du 25/09/2026 : « rajoute une
 * sécurité » sur la récupération GitHub). Un fichier du dépôt n'est
 * jamais digne de confiance par défaut : n'importe quel collaborateur du
 * dépôt (ou un fichier altéré) peut y écrire. Fonction pure, déterministe.
 *
 * Refuse (sans jamais « réparer » le contenu) :
 * - un JSON illisible ;
 * - une structure minimale absente (identifiant, propriétaire, partage,
 *   projet de rattachement d'une section…) ;
 * - un identifiant qui ne correspond pas au nom du fichier
 *   (`data/projects/<id>.json`) : un fichier `a.json` contenant l'id `b`
 *   écraserait silencieusement un AUTRE enregistrement.
 *
 * Le serveur reste juge des droits (403/404) — ce contrôle ne fait
 * qu'empêcher d'envoyer ce qui est manifestement invalide ou usurpé.
 */
export type TypeFichierRecupere = 'project' | 'section'

export type ResultatControleFichier =
  { ok: true; donnees: Record<string, unknown> } | { ok: false; raison: string }

const DOSSIER: Record<TypeFichierRecupere, string> = {
  project: 'data/projects/',
  section: 'data/sections/',
}

function estTexteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.trim().length > 0
}

function partageValide(valeur: unknown): boolean {
  return (
    Array.isArray(valeur) &&
    valeur.every(
      (p) =>
        typeof p === 'object' &&
        p !== null &&
        estTexteNonVide((p as Record<string, unknown>).user_id) &&
        ((p as Record<string, unknown>).access_level === 'lecture' ||
          (p as Record<string, unknown>).access_level === 'édition'),
    )
  )
}

export function controlerFichierRecupere(
  type: TypeFichierRecupere,
  chemin: string,
  contenuBrut: string,
): ResultatControleFichier {
  let donnees: unknown
  try {
    donnees = JSON.parse(contenuBrut)
  } catch {
    return { ok: false, raison: 'fichier illisible (JSON invalide)' }
  }
  if (typeof donnees !== 'object' || donnees === null || Array.isArray(donnees)) {
    return { ok: false, raison: 'contenu inattendu (objet JSON attendu)' }
  }
  const objet = donnees as Record<string, unknown>

  if (!estTexteNonVide(objet.id)) return { ok: false, raison: 'identifiant absent' }
  if (chemin !== `${DOSSIER[type]}${objet.id}.json`) {
    return {
      ok: false,
      raison: 'identifiant différent du nom du fichier (fichier altéré ?) — jamais restauré',
    }
  }
  if (!estTexteNonVide(objet.owner_id)) return { ok: false, raison: 'propriétaire absent' }
  if (!partageValide(objet.shared_with)) return { ok: false, raison: 'liste de partage invalide' }

  if (type === 'project' && !estTexteNonVide(objet.name)) {
    return { ok: false, raison: 'nom du projet absent' }
  }
  if (type === 'section') {
    if (!estTexteNonVide(objet.project_id))
      return { ok: false, raison: 'projet de rattachement absent' }
    if (!estTexteNonVide(objet.template_type))
      return { ok: false, raison: 'type de gabarit absent' }
  }
  return { ok: true, donnees: objet }
}

/** Traduit un refus du serveur en raison lisible — jamais un refus silencieux. */
export function raisonRefusServeur(status: number, erreur: string): string {
  if (status === 403) {
    return 'refusé par le serveur : droits insuffisants (créateur, partagé en édition ou admin requis ; partage : créateur ou admin)'
  }
  if (status === 404) return 'refusé par le serveur : projet inaccessible ou inexistant'
  if (status === 400) return `refusé par le serveur : contenu invalide (${erreur})`
  return `échec de l'enregistrement (${erreur})`
}

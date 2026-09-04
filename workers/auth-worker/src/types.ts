/**
 * Types du Worker d'authentification (TD-046) — délibérément séparés des
 * types domaine du frontend (`src/logique-metier/domaine/types.ts`) : ce
 * Worker est un déploiement indépendant (comme `workers/ocr-relay/`),
 * jamais couplé au bundle de la PWA.
 */

export type Role = 'admin' | 'utilisateur'
export type StatutCompte = 'actif' | 'desactive'
export type StatutClient = 'actif' | 'archive'

export interface UtilisateurEnregistre {
  id: string
  email: string
  motDePasseHash: string
  motDePasseSel: string
  nom: string
  prenom: string
  role: Role
  statut: StatutCompte
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

/** Vue publique d'un utilisateur — ne porte jamais le hash/sel. */
export interface UtilisateurPublic {
  id: string
  email: string
  nom: string
  prenom: string
  role: Role
  statut: StatutCompte
  createdAt: string
}

export function versUtilisateurPublic(u: UtilisateurEnregistre): UtilisateurPublic {
  return {
    id: u.id,
    email: u.email,
    nom: u.nom,
    prenom: u.prenom,
    role: u.role,
    statut: u.statut,
    createdAt: u.createdAt,
  }
}

export interface ClientEnregistre {
  id: string
  name: string
  adresse: string | null
  secteur: 'pharma' | 'dispositif_medical' | 'autre' | null
  details: string | null
  statut: StatutClient
  archivedAt: string | null
  archivedBy: string | null
  createdByUserId: string
  sharedWith: string[]
  createdAt: string
  updatedAt: string
}

export interface EntreeAudit {
  id: string
  acteurUserId: string
  acteurEmail: string
  action: string
  targetType: string
  targetId: string
  justification: string | null
  timestamp: string
}

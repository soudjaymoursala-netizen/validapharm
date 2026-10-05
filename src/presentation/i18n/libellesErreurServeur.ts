import { messageRefusSignature } from './libellesSignature'

/**
 * Codes d'erreur renvoyés par le Worker, en français (audit d'intégrité
 * m3 : 119 messages `Échec … : ${resultat.erreur}` affichaient des codes
 * techniques tels quels, « non_authentifie », « corps_invalide »…).
 *
 * Le code reste ajouté entre parenthèses : l'utilisateur lit une phrase, le
 * support retrouve la cause exacte.
 */
const LIBELLES: Record<string, string> = {
  // Session et droits
  non_authentifie: 'votre session a expiré, reconnectez-vous',
  non_autorise: "vous n'avez pas les droits nécessaires pour cette action",
  compte_desactive: 'ce compte est désactivé',
  identifiants_invalides: 'adresse e-mail ou mot de passe incorrect',
  mot_de_passe_actuel_incorrect: 'le mot de passe actuel est incorrect',
  mot_de_passe_trop_court: 'le mot de passe est trop court',
  jeton_invalide: 'lien ou jeton invalide',
  lien_invalide: 'ce lien est invalide ou a expiré',
  dernier_admin: 'impossible : c’est le dernier administrateur actif',
  email_invalide: 'adresse e-mail invalide',
  email_deja_utilise: 'cette adresse e-mail est déjà utilisée',
  role_invalide: 'rôle inconnu',
  quota_ia_atteint:
    "quota d'utilisation de l'assistant IA atteint pour cette heure, réessayez plus tard",

  // Données envoyées
  corps_invalide: 'données incomplètes ou invalides',
  corps_trop_volumineux: 'envoi trop volumineux',
  fichier_trop_volumineux: 'fichier trop volumineux (25 Mo au plus)',
  texte_trop_volumineux: 'texte extrait trop volumineux (2 Mo au plus)',
  lot_trop_grand: 'trop d’éléments envoyés en une fois (500 au plus)',
  nom_obligatoire: 'le nom est obligatoire',
  prenom_obligatoire: 'le prénom est obligatoire',
  titre_obligatoire: 'le titre est obligatoire',
  filename_obligatoire: 'le nom de fichier est obligatoire',
  justification_obligatoire: 'une justification est obligatoire',
  jeton_obligatoire: 'le jeton d’accès est obligatoire',
  categorie_invalide: 'catégorie inconnue',
  source_invalide: 'source inconnue',
  statut_invalide: 'statut inconnu',
  cle_invalide: 'paramètre inconnu',
  contenu_vide: 'le fichier est vide',
  type_fichier_refuse: 'type de fichier non accepté (photo, PDF, texte, tableur ou document Word)',

  // Références
  introuvable: 'élément introuvable (supprimé ou inaccessible)',
  route_introuvable: 'fonction indisponible sur ce serveur (mise à jour nécessaire ?)',
  client_introuvable: 'client introuvable',
  noeud_introuvable: 'nœud de la Structure Système introuvable pour ce client',
  parent_introuvable: 'nœud parent introuvable pour ce client',
  workspace_introuvable: 'espace de travail introuvable pour ce client',
  workspace_racine_introuvable: 'espace de travail racine introuvable',
  organization_introuvable: 'organisation introuvable',
  process_introuvable: 'processus introuvable pour ce client',
  parametre_introuvable: 'paramètre introuvable pour ce client',
  exigence_introuvable: 'exigence introuvable pour ce client',
  test_introuvable: 'test introuvable pour ce client',
  methode_introuvable: 'version de méthode introuvable',
  version_introuvable: 'version introuvable',
  execution_introuvable: 'exécution introuvable',
  etape_execution_introuvable: "étape d'exécution introuvable",
  etape_inconnue: 'étape inconnue pour ce test',
  evidence_introuvable: 'preuve introuvable',
  source_introuvable: 'source introuvable',
  extraction_introuvable: 'extraction introuvable',
  extraction_item_introuvable: "élément d'extraction introuvable",
  knowledge_item_introuvable: 'élément de connaissance introuvable',
  conflict_introuvable: 'conflit introuvable',
  candidat_introuvable: 'candidat de test introuvable',
  procedure_introuvable: 'procédure introuvable',
  connecteur_introuvable: 'connecteur introuvable',
  connector_introuvable: 'connecteur introuvable',
  cycle_hierarchie: 'un nœud ne peut pas être rangé sous l’un de ses propres descendants',
  id_conflit: 'identifiant déjà utilisé',

  // Règles métier
  verdict_incoherent:
    'le verdict ne correspond pas aux réponses : rechargez la page (méthode ou calcul modifié entre-temps)',
  conclusion_incoherente:
    'la conclusion ne correspond pas à la grille de décision : rechargez la page avant de réessayer',
  version_methode_incoherente:
    'la version de méthode a changé entre-temps : rechargez la page avant de réessayer',
  reponses_invalides: 'réponses incompatibles avec la méthode',
  valeurs_non_entieres: "l'échelle et le seuil doivent être des nombres entiers",
  echelle_min_invalide: "l'échelle minimale doit valoir au moins 1",
  echelle_invalide: "l'échelle minimale doit être inférieure à l'échelle maximale",
  seuil_hors_bornes: "le seuil d'action doit être atteignable avec cette échelle",
  conflit_version: 'quelqu’un a modifié cet élément entre-temps : rechargez-le avant de réessayer',
  test_non_approuve: "le test doit être approuvé avant d'être exécuté",
  candidat_non_accepte: 'le candidat doit être accepté avant de créer le test',
  execution_deja_cloturee: 'cette exécution est déjà clôturée',
  resultat_etape_deja_enregistre: 'un résultat est déjà enregistré pour cette étape',
  resultat_deja_corrige:
    'ce résultat a déjà été corrigé : rechargez pour voir le résultat en vigueur',
  statut_inchange: 'le statut est déjà celui demandé',
  mission_cloturee: 'mission clôturée : rouvrez-la (avec un motif) avant de la modifier',
  prerequis_non_termines:
    'des activités prérequises ne sont pas terminées : un motif est obligatoire',
  deja_gele: 'ce plan est déjà gelé',
  non_valide: "ce plan n'est pas encore validé",
  donnees_non_pretes: 'les données de traçabilité ne sont pas prêtes',
  deja_archive: 'déjà archivé entre-temps',
  deja_actif: 'déjà réactivé entre-temps',
  deja_suspendu: 'déjà suspendu',
  pas_suspendu: "ce projet n'est pas suspendu",
  pas_archive: "ce projet n'est pas archivé",
  deja_supprime: 'déjà supprimé',
  deja_initialise: 'installation déjà initialisée',
  client_non_vide: 'ce client a encore des données : il reste archivé, rien n’est supprimé',
  contenu_deja_present: 'le contenu de ce document est déjà présent',
  type_non_document: "cet élément n'est pas un document",
  historique_altere: "l'historique a changé entre-temps : rechargez avant de réessayer",
  section_verrouillee: 'section validée : son contenu est verrouillé',
  statut_creation_invalide: 'statut de création non permis',
  transition_invalide: "ce changement de statut n'est pas permis depuis le statut actuel",
  roles_manquants: "désignez d'abord l'approbateur final (et au moins un rédacteur)",
  avis_manquant: 'au moins un avis de relecture est requis depuis la dernière vérification',
  motif_requis: 'un motif est obligatoire',

  // Services externes
  erreur_interne: 'erreur interne du serveur, réessayez',
  relais_ia_non_configure: "l'assistant IA n'est pas configuré sur ce serveur",
  relais_ia_injoignable: "l'assistant IA est injoignable",
  relais_non_configure: "serveur d'authentification non configuré",
  github_non_configure: 'GitHub n’est pas configuré',
  github_injoignable: 'GitHub est injoignable',
  operation_github_non_autorisee: 'opération GitHub non autorisée',
  oauth_google_non_configure: 'connexion Google non configurée sur ce serveur',
  oauth_non_connecte: 'Google Drive n’est pas connecté',
  rafraichissement_echoue: "le renouvellement de l'accès Google a échoué",
}

/** Libellé français d'un code d'erreur serveur, suivi du code entre parenthèses. */
export function libelleErreurServeur(code: string): string {
  const libelle = LIBELLES[code] ?? messageRefusSignature(code)
  return libelle ? `${libelle} (${code})` : code
}

import { describe, expect, test } from 'vitest'
import { AuditRepoMemoire } from './repos/auditRepo'
import { ClientsRepoMemoire } from './repos/clientsRepo'
import { UtilisateursRepoMemoire } from './repos/utilisateursRepo'
import { routerRequete, type Contexte } from './routeur'

const ORIGINE = 'https://validapharm.example'
const JETON_BOOTSTRAP = 'jeton-bootstrap-test'
const SECRET_JWT = 'secret-jwt-test'

function nouveauContexte(): Contexte {
  return {
    utilisateursRepo: new UtilisateursRepoMemoire(),
    clientsRepo: new ClientsRepoMemoire(),
    auditRepo: new AuditRepoMemoire(),
    secretJwt: SECRET_JWT,
    jetonBootstrap: JETON_BOOTSTRAP,
    corsOrigin: ORIGINE,
  }
}

interface UtilisateurJson {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  statut: string
  createdAt: string
  motDePasseHash: undefined
}

interface ClientJson {
  id: string
  name: string
  statut: string
  archivedAt: string | null
  archivedBy: string | null
  details: string | null
  secteur: string | null
}

interface EntreeAuditJson {
  id: string
  action: string
  targetType: string
  targetId: string
  justification: string | null
  timestamp: string
}

// Le corps JSON des réponses du Worker varie selon l'endpoint — chaque
// test n'accède qu'aux champs propres à la réponse qu'il vient de
// recevoir ; les champs non pertinents pour un endpoint donné restent
// simplement inaccédés à l'exécution (jamais `any` : chaque champ garde
// une forme précise).
interface CorpsReponse {
  erreur: string
  jeton: string
  ok: boolean
  valide: boolean
  authorized: boolean
  auditId: string
  utilisateur: UtilisateurJson
  utilisateurs: UtilisateurJson[]
  client: ClientJson
  clients: ClientJson[]
  entrees: EntreeAuditJson[]
}

async function requete(
  ctx: Contexte,
  method: string,
  chemin: string,
  options: { body?: unknown; jeton?: string } = {},
): Promise<{ status: number; corps: CorpsReponse }> {
  const reponse = await routerRequete(
    new Request(`https://relais.workers.dev${chemin}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.jeton ? { Authorization: `Bearer ${options.jeton}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    }),
    ctx,
  )
  const corps = await reponse.json().catch(() => null)
  return { status: reponse.status, corps }
}

async function bootstrapAdmin(
  ctx: Contexte,
  email = 'admin@pharmatech.example',
): Promise<{ jeton: string; utilisateur: UtilisateurJson }> {
  const { corps } = await requete(ctx, 'POST', '/auth/bootstrap-admin', {
    body: {
      email,
      motDePasse: 'CoffreFort!2026',
      nom: 'Lead',
      prenom: 'Quentin',
      jetonBootstrap: JETON_BOOTSTRAP,
    },
  })
  return corps
}

describe('routerRequete — CORS', () => {
  test('OPTIONS -> 204 avec en-têtes CORS', async () => {
    const ctx = nouveauContexte()
    const reponse = await routerRequete(
      new Request('https://relais.workers.dev/auth/login', { method: 'OPTIONS' }),
      ctx,
    )
    expect(reponse.status).toBe(204)
    expect(reponse.headers.get('Access-Control-Allow-Origin')).toBe(ORIGINE)
  })

  test('route inconnue -> 404', async () => {
    const ctx = nouveauContexte()
    const { status } = await requete(ctx, 'GET', '/inconnu')
    expect(status).toBe(404)
  })
})

describe('routerRequete — bootstrap-admin', () => {
  test('crée le premier admin avec le bon jeton de bootstrap', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await bootstrapAdmin(ctx).then((c) => ({ status: 201, corps: c }))
    expect(status).toBe(201)
    expect(corps.utilisateur.role).toBe('admin')
    expect(corps.jeton).toBeTruthy()
  })

  test('refuse un mauvais jeton de bootstrap', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await requete(ctx, 'POST', '/auth/bootstrap-admin', {
      body: {
        email: 'x@example.com',
        motDePasse: 'CoffreFort!2026',
        nom: 'A',
        prenom: 'B',
        jetonBootstrap: 'mauvais',
      },
    })
    expect(status).toBe(403)
    expect(corps.erreur).toBe('jeton_invalide')
  })

  test('refuse un second bootstrap une fois un compte déjà créé', async () => {
    const ctx = nouveauContexte()
    await bootstrapAdmin(ctx)
    const { status, corps } = await requete(ctx, 'POST', '/auth/bootstrap-admin', {
      body: {
        email: 'second@example.com',
        motDePasse: 'CoffreFort!2026',
        nom: 'A',
        prenom: 'B',
        jetonBootstrap: JETON_BOOTSTRAP,
      },
    })
    expect(status).toBe(403)
    expect(corps.erreur).toBe('deja_initialise')
  })

  test('refuse un mot de passe trop court', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await requete(ctx, 'POST', '/auth/bootstrap-admin', {
      body: {
        email: 'x@example.com',
        motDePasse: 'court',
        nom: 'A',
        prenom: 'B',
        jetonBootstrap: JETON_BOOTSTRAP,
      },
    })
    expect(status).toBe(400)
    expect(corps.erreur).toBe('mot_de_passe_trop_court')
  })
})

describe('routerRequete — login/me', () => {
  test('login avec les bons identifiants renvoie un jeton, /auth/me le confirme', async () => {
    const ctx = nouveauContexte()
    await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'CoffreFort!2026' },
    })
    expect(status).toBe(200)
    expect(corps.jeton).toBeTruthy()

    const me = await requete(ctx, 'GET', '/auth/me', { jeton: corps.jeton })
    expect(me.status).toBe(200)
    expect(me.corps.utilisateur.email).toBe('admin@pharmatech.example')
    expect(me.corps.utilisateur.motDePasseHash).toBeUndefined()
  })

  test('login avec un mauvais mot de passe -> 401, message générique', async () => {
    const ctx = nouveauContexte()
    await bootstrapAdmin(ctx)
    const { status, corps } = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'mauvais' },
    })
    expect(status).toBe(401)
    expect(corps.erreur).toBe('identifiants_invalides')
  })

  test('login avec un email inconnu -> 401, même message générique (pas de fuite d’existence)', async () => {
    const ctx = nouveauContexte()
    const { status, corps } = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'inconnu@example.com', motDePasse: 'peu importe' },
    })
    expect(status).toBe(401)
    expect(corps.erreur).toBe('identifiants_invalides')
  })

  test('/auth/me sans jeton -> 401', async () => {
    const ctx = nouveauContexte()
    const { status } = await requete(ctx, 'GET', '/auth/me')
    expect(status).toBe(401)
  })

  test('un compte désactivé ne peut plus se connecter', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    await ctx.utilisateursRepo.mettreAJour(admin.utilisateur.id, { statut: 'desactive' })

    const { status } = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'CoffreFort!2026' },
    })
    expect(status).toBe(401)
  })
})

describe('routerRequete — change-password / verify-password', () => {
  test('changer le mot de passe exige le mot de passe actuel correct', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const echec = await requete(ctx, 'POST', '/auth/change-password', {
      jeton: admin.jeton,
      body: { motDePasseActuel: 'mauvais', nouveauMotDePasse: 'NouveauMdp!99' },
    })
    expect(echec.status).toBe(401)

    const succes = await requete(ctx, 'POST', '/auth/change-password', {
      jeton: admin.jeton,
      body: { motDePasseActuel: 'CoffreFort!2026', nouveauMotDePasse: 'NouveauMdp!99' },
    })
    expect(succes.status).toBe(200)

    const relogin = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'admin@pharmatech.example', motDePasse: 'NouveauMdp!99' },
    })
    expect(relogin.status).toBe(200)
  })

  test('verify-password confirme ou infirme sans changer le mot de passe (re-authentification pour archivage, TD-046)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const valide = await requete(ctx, 'POST', '/auth/verify-password', {
      jeton: admin.jeton,
      body: { motDePasse: 'CoffreFort!2026' },
    })
    expect(valide.corps.valide).toBe(true)

    const invalide = await requete(ctx, 'POST', '/auth/verify-password', {
      jeton: admin.jeton,
      body: { motDePasse: 'mauvais' },
    })
    expect(invalide.corps.valide).toBe(false)
  })
})

describe('routerRequete — administration des comptes (admin uniquement)', () => {
  test('un admin peut créer un utilisateur non-admin', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const { status, corps } = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'employe@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'Dupont',
        prenom: 'Alice',
        role: 'utilisateur',
      },
    })
    expect(status).toBe(201)
    expect(corps.utilisateur.role).toBe('utilisateur')
  })

  test('un utilisateur non-admin ne peut pas créer de compte (403)', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const cree = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'employe@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'Dupont',
        prenom: 'Alice',
        role: 'utilisateur',
      },
    })
    const loginEmploye = await requete(ctx, 'POST', '/auth/login', {
      body: { email: 'employe@pharmatech.example', motDePasse: 'MotDePasse!1' },
    })

    const tentative = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: loginEmploye.corps.jeton,
      body: {
        email: 'autre@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'X',
        prenom: 'Y',
        role: 'utilisateur',
      },
    })
    expect(cree.status).toBe(201)
    expect(tentative.status).toBe(403)
  })

  test('un admin peut désactiver un compte et changer son rôle', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const cree = await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: admin.jeton,
      body: {
        email: 'employe@pharmatech.example',
        motDePasse: 'MotDePasse!1',
        nom: 'Dupont',
        prenom: 'Alice',
        role: 'utilisateur',
      },
    })

    const modifie = await requete(
      ctx,
      'PATCH',
      `/admin/utilisateurs/${cree.corps.utilisateur.id}`,
      {
        jeton: admin.jeton,
        body: { role: 'admin', statut: 'desactive' },
      },
    )
    expect(modifie.status).toBe(200)
    expect(modifie.corps.utilisateur.role).toBe('admin')
    expect(modifie.corps.utilisateur.statut).toBe('desactive')
  })

  test('lister les utilisateurs est réservé à un admin', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const { status, corps } = await requete(ctx, 'GET', '/admin/utilisateurs', {
      jeton: admin.jeton,
    })
    expect(status).toBe(200)
    expect(corps.utilisateurs).toHaveLength(1)
  })
})

describe('routerRequete — clients (D1 = source de vérité, TD-046)', () => {
  async function creerUtilisateurEtLogin(
    ctx: Contexte,
    adminJeton: string,
    email: string,
  ): Promise<string> {
    await requete(ctx, 'POST', '/admin/utilisateurs', {
      jeton: adminJeton,
      body: { email, motDePasse: 'MotDePasse!1', nom: 'N', prenom: 'P', role: 'utilisateur' },
    })
    const login = await requete(ctx, 'POST', '/auth/login', {
      body: { email, motDePasse: 'MotDePasse!1' },
    })
    return login.corps.jeton
  }

  test('un utilisateur crée un client, le voit, un autre utilisateur non partagé ne le voit pas', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonA = await creerUtilisateurEtLogin(ctx, admin.jeton, 'a@pharmatech.example')
    const jetonB = await creerUtilisateurEtLogin(ctx, admin.jeton, 'b@pharmatech.example')

    const creation = await requete(ctx, 'POST', '/clients', {
      jeton: jetonA,
      body: { name: 'PharmaTech Solutions', secteur: 'pharmaceutique' },
    })
    expect(creation.status).toBe(201)
    const clientId = creation.corps.client.id

    const listeA = await requete(ctx, 'GET', '/clients', { jeton: jetonA })
    expect(listeA.corps.clients.map((c) => c.id)).toContain(clientId)

    const listeB = await requete(ctx, 'GET', '/clients', { jeton: jetonB })
    expect(listeB.corps.clients.map((c) => c.id)).not.toContain(clientId)

    const obtenirB = await requete(ctx, 'GET', `/clients/${clientId}`, { jeton: jetonB })
    expect(obtenirB.status).toBe(404)
  })

  test('un admin voit tous les clients de l’organisation, quel que soit le créateur', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonA = await creerUtilisateurEtLogin(ctx, admin.jeton, 'a@pharmatech.example')
    await requete(ctx, 'POST', '/clients', { jeton: jetonA, body: { name: 'Client A' } })

    const listeAdmin = await requete(ctx, 'GET', '/clients', { jeton: admin.jeton })
    expect(listeAdmin.corps.clients).toHaveLength(1)
  })

  test('partager un client rend le client visible et éditable pour le bénéficiaire', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonA = await creerUtilisateurEtLogin(ctx, admin.jeton, 'a@pharmatech.example')
    const jetonB = await creerUtilisateurEtLogin(ctx, admin.jeton, 'b@pharmatech.example')

    const creation = await requete(ctx, 'POST', '/clients', {
      jeton: jetonA,
      body: { name: 'Client A' },
    })
    const clientId = creation.corps.client.id

    // Récupérer l'id utilisateur B via /auth/me.
    const meB = await requete(ctx, 'GET', '/auth/me', { jeton: jetonB })
    const idB = meB.corps.utilisateur.id

    await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: jetonA,
      body: { sharedWith: [idB] },
    })

    const obtenirB = await requete(ctx, 'GET', `/clients/${clientId}`, { jeton: jetonB })
    expect(obtenirB.status).toBe(200)

    const modifierB = await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: jetonB,
      body: { details: 'Ajouté par B' },
    })
    expect(modifierB.status).toBe(200)
    expect(modifierB.corps.client.details).toBe('Ajouté par B')
  })

  test('archiver un client trace archived_at/archived_by', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const creation = await requete(ctx, 'POST', '/clients', {
      jeton: admin.jeton,
      body: { name: 'C' },
    })
    const clientId = creation.corps.client.id

    const archive = await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { statut: 'archive' },
    })
    expect(archive.corps.client.statut).toBe('archive')
    expect(archive.corps.client.archivedAt).toBeTruthy()
    expect(archive.corps.client.archivedBy).toBe('admin@pharmatech.example')
  })

  test('archiver un client déjà archivé -> 409 deja_archive ; désarchiver un client déjà actif -> 409 deja_actif', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const creation = await requete(ctx, 'POST', '/clients', {
      jeton: admin.jeton,
      body: { name: 'C' },
    })
    const clientId = creation.corps.client.id

    const desarchivageInutile = await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { statut: 'actif' },
    })
    expect(desarchivageInutile.status).toBe(409)
    expect(desarchivageInutile.corps.erreur).toBe('deja_actif')

    await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { statut: 'archive' },
    })
    const archivageInutile = await requete(ctx, 'PATCH', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { statut: 'archive' },
    })
    expect(archivageInutile.status).toBe(409)
    expect(archivageInutile.corps.erreur).toBe('deja_archive')
  })

  test('suppression définitive : refusée sans justification, réservée à un admin, tracée en audit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)
    const jetonA = await creerUtilisateurEtLogin(ctx, admin.jeton, 'a@pharmatech.example')
    const creation = await requete(ctx, 'POST', '/clients', { jeton: jetonA, body: { name: 'C' } })
    const clientId = creation.corps.client.id

    const parNonAdmin = await requete(ctx, 'DELETE', `/clients/${clientId}`, {
      jeton: jetonA,
      body: { justification: 'peu importe' },
    })
    expect(parNonAdmin.status).toBe(403)

    const sansJustification = await requete(ctx, 'DELETE', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { justification: '   ' },
    })
    expect(sansJustification.status).toBe(400)
    expect(sansJustification.corps.erreur).toBe('justification_obligatoire')

    const suppression = await requete(ctx, 'DELETE', `/clients/${clientId}`, {
      jeton: admin.jeton,
      body: { justification: 'Client fermé, RGPD, demande écrite du 04/09/2026' },
    })
    expect(suppression.status).toBe(200)

    const disparu = await requete(ctx, 'GET', `/clients/${clientId}`, { jeton: admin.jeton })
    expect(disparu.status).toBe(404)

    const audit = await requete(ctx, 'GET', '/admin/audit', { jeton: admin.jeton })
    const entree = audit.corps.entrees.find((e) => e.action === 'suppression_definitive_client')
    expect(entree).toBeDefined()
    expect(entree?.justification).toContain('RGPD')
    expect(entree?.targetId).toBe(clientId)
  })
})

describe('routerRequete — audit générique (/audit/authorize-action)', () => {
  test('exige une justification non vide, consigne une entrée d’audit', async () => {
    const ctx = nouveauContexte()
    const admin = await bootstrapAdmin(ctx)

    const sansJustification = await requete(ctx, 'POST', '/audit/authorize-action', {
      jeton: admin.jeton,
      body: { action: 'suppression_document', targetType: 'project_document', targetId: 'doc-1' },
    })
    expect(sansJustification.status).toBe(400)

    const { status, corps } = await requete(ctx, 'POST', '/audit/authorize-action', {
      jeton: admin.jeton,
      body: {
        action: 'suppression_document',
        targetType: 'project_document',
        targetId: 'doc-1',
        justification: 'Doublon importé par erreur',
      },
    })
    expect(status).toBe(200)
    expect(corps.authorized).toBe(true)
    expect(corps.auditId).toBeTruthy()
  })
})

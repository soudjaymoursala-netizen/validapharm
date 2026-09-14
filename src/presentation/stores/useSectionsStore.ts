import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocumentNormatifPourPrompt } from '../../logique-metier/bibliotheque-normes/formaterDocumentNormatifPourPrompt'
import type { ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type { SectionWire } from '../../connecteurs/auth/AuthApiClient'
import { aLienVersTypeSection } from '../../logique-metier/detection-liens/aLienVersTypeSection'
import type {
  Langue,
  LienProjet,
  ProjectDocument,
  Section,
  StatutSection,
  TemplateType,
} from '../../logique-metier/domaine/types'
import type { DonneesImportSection } from '../../logique-metier/export/analyserImportJSON'
import { obtenirDefinitionGabarit } from '../../logique-metier/gabarits/catalogue'
import { genererBrouillonSection } from '../../logique-metier/generation-brouillon/genererBrouillonSection'
import {
  evaluerGardesFinalisation,
  motifDeForcageValide,
  type MessageBlocageFinalisation,
} from '../../logique-metier/machine-etats/gardesFinalisation'
import {
  appliquerTransition,
  type RaisonBlocageTransition,
} from '../../logique-metier/machine-etats/transitionSection'
import { db, sectionsAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export interface NouvelleSectionInput {
  project_id: string
  template_type: TemplateType
  language: Langue
  titre: string
  owner_id: string
  /** Liens structurels réels (tâche #118) — omis ou `null` : aucun lien, comportement inchangé. */
  procedure_id?: string | null
  asset_node_id?: string | null
}

export type ResultatActionSection =
  | { ok: true }
  | { ok: false; blocagesFinalisation: MessageBlocageFinalisation[] }
  | { ok: false; raisonTransition: RaisonBlocageTransition }

/**
 * Entrées de la génération de brouillon par adaptation (§4.1bis) —
 * `nomDocumentReference` sert uniquement de nom affiché,
 * jamais de contenu ; le texte réellement transmis à l'IA est
 * `texteDocumentReference` (collé directement ou déjà extrait d'un fichier
 * .docx/.pdf côté écran).
 */
export interface EntreesGenerationBrouillonIA {
  texteDocumentReference: string
  nomDocumentReference: string
  contexteNouveauCas: string
  confirmationDroitUsage: boolean
  actor: string
  /** Bibliothèque de normes de l'organisation (facultative) — ancre le brouillon généré dans les référentiels réels, sans jamais primer sur le document de référence lui-même. */
  documentsNormatifs?: readonly DocumentNormatifPourPrompt[]
}

export type ResultatGenerationBrouillonIA =
  | { ok: true; champsGeneres: number; lignesTableauxGenerees: number }
  | { ok: false; motif: 'confirmation_droit_usage_requise' }
  | { ok: false; motif: 'gabarit_introuvable' }
  | { ok: false; motif: 'statut_incompatible' }

const VERSION_MOTEUR_GABARITS = '0.1.0'

export function sectionWireVersDomaine(wire: SectionWire): Section {
  return {
    id: wire.id,
    project_id: wire.projectId,
    template_type: wire.templateType as TemplateType,
    template_engine_version: wire.templateEngineVersion,
    owner_id: wire.ownerId,
    shared_with: wire.sharedWith.map((s) => ({ user_id: s.userId, access_level: s.accessLevel })),
    language: wire.language,
    status: wire.status as StatutSection,
    meta: wire.meta,
    workflow: {
      authors: wire.workflow.authors,
      reviewers: wire.workflow.reviewers.map((r) => ({
        user_id: r.userId,
        avis: r.avis,
        date: r.date,
      })),
      approver_final: wire.workflow.approverFinal,
    },
    signatures: wire.signatures,
    revisions: wire.revisions,
    values: wire.values,
    tables: wire.tables,
    generation_source: {
      source_document_id: wire.generationSource.sourceDocumentId,
      generated_fields: wire.generationSource.generatedFields,
    },
    procedure_id: wire.procedureId,
    asset_node_id: wire.assetNodeId,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function sectionDomaineVersWire(s: Section): SectionWire {
  return {
    id: s.id,
    projectId: s.project_id,
    templateType: s.template_type,
    templateEngineVersion: s.template_engine_version,
    ownerId: s.owner_id,
    sharedWith: s.shared_with.map((x) => ({ userId: x.user_id, accessLevel: x.access_level })),
    language: s.language,
    status: s.status,
    meta: s.meta,
    workflow: {
      authors: s.workflow.authors,
      reviewers: s.workflow.reviewers.map((r) => ({
        userId: r.user_id,
        avis: r.avis,
        date: r.date,
      })),
      approverFinal: s.workflow.approver_final,
    },
    signatures: s.signatures,
    revisions: s.revisions,
    values: s.values,
    tables: s.tables,
    generationSource: {
      sourceDocumentId: s.generation_source.source_document_id,
      generatedFields: s.generation_source.generated_fields,
    },
    procedureId: s.procedure_id,
    assetNodeId: s.asset_node_id,
    auditLog: s.audit_log,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }
}

/**
 * Store de la Couche Présentation orchestrant la rédaction de sections
 * et leur cycle de vie. Les décisions
 * (transition autorisée ou non, blocage de finalisation) restent dans
 * `logique-metier/` — ce store se contente de rassembler le contexte
 * nécessaire (liens du projet, rôles renseignés) et de persister le
 * résultat.
 *
 * **Phase 3b du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la
 * source de vérité (Worker `auth-worker`, routes `/sections/...`), jamais
 * plus `persistance/db.ts` (`db.sections`, retiré). Contrairement à
 * `Project` (Phase 3a), aucune visibilité par utilisateur n'est appliquée
 * ici — `Section.owner_id`/`shared_with` restent, comme avant cette
 * migration, jamais une frontière de sécurité réelle (voir
 * `permissionsProjet.ts`), même régime d'accès qu'avant (authentification
 * seule côté Worker).
 */
export const useSectionsStore = defineStore('sections', () => {
  const sectionsParProjet = ref<Record<string, Section[]>>({})

  /** Lève si le relais n'est pas configuré — `Section` exige désormais systématiquement le Worker/D1, même discipline que `useProjectsStore`. */
  async function obtenirApiSection() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /** `null` si le relais n'est pas configuré — appels au Worker liés au projet (`Project.sections[]`/`documents[]`) alors silencieusement ignorés, même dégradation gracieuse que le reste de l'application. */
  async function obtenirApiProjet() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) return null
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les `Section` capturées depuis l'ancienne table
   * IndexedDB locale (`sectionsAMigrer`) juste avant sa suppression — n'a
   * d'effet réel qu'une seule fois, sur le premier navigateur qui ouvre
   * l'application avec ce code (voir migration Dexie v37,
   * `persistance/db.ts`). Ne retire chaque section de la file qu'après
   * confirmation serveur, jamais avant (même discipline que
   * `useProjectsStore.migrerProjetsLocauxVersServeur`). Flushe
   * l'intégralité de la file en une fois, quel que soit le projet dont les
   * sections viennent d'être chargées — appelé depuis
   * `chargerSectionsDuProjet`, seul point d'entrée systématiquement
   * exercé par les écrans.
   */
  async function migrerSectionsLocalesVersServeur(): Promise<void> {
    if (sectionsAMigrer.length === 0) return
    const { api, jeton } = await obtenirApiSection()
    const resultat = await api.migrerSectionsLocales(
      jeton,
      sectionsAMigrer.map(sectionDomaineVersWire),
    )
    if (!resultat.ok) throw new Error(`Échec de la migration des sections : ${resultat.erreur}`)
    sectionsAMigrer.splice(0, sectionsAMigrer.length)
  }

  async function chargerSectionsDuProjet(projectId: string): Promise<void> {
    try {
      try {
        await migrerSectionsLocalesVersServeur()
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApiSection()
      const resultat = await api.listerSectionsProjet(jeton, projectId)
      const sections = resultat.ok ? resultat.donnees.sections.map(sectionWireVersDomaine) : []
      sectionsParProjet.value = { ...sectionsParProjet.value, [projectId]: sections }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que `useProjectsStore.chargerProjets`.
      sectionsParProjet.value = { ...sectionsParProjet.value, [projectId]: [] }
    }
  }

  async function creerSection(input: NouvelleSectionInput): Promise<Section> {
    const maintenant = new Date().toISOString()
    const section: Section = {
      id: crypto.randomUUID(),
      project_id: input.project_id,
      template_type: input.template_type,
      template_engine_version: VERSION_MOTEUR_GABARITS,
      owner_id: input.owner_id,
      shared_with: [],
      language: input.language,
      status: 'brouillon_aide',
      meta: { ref: '', titre: input.titre, version: '0.1' },
      workflow: { authors: [input.owner_id], reviewers: [], approver_final: null },
      signatures: { redacteur: {}, verificateur: {}, approbateur: {} },
      revisions: [],
      values: {},
      tables: {},
      generation_source: { source_document_id: null, generated_fields: [] },
      procedure_id: input.procedure_id ?? null,
      asset_node_id: input.asset_node_id ?? null,
      audit_log: [{ timestamp: maintenant, actor: input.owner_id, action: 'création' }],
      created_at: maintenant,
      updated_at: maintenant,
    }
    const { api, jeton } = await obtenirApiSection()
    const resultat = await api.creerSection(jeton, sectionDomaineVersWire(section))
    if (!resultat.ok) throw new Error(`Échec de la création de la section : ${resultat.erreur}`)
    const sectionCreee = sectionWireVersDomaine(resultat.donnees.section)

    const apiProjet = await obtenirApiProjet()
    if (apiProjet) {
      await apiProjet.api.ajouterSectionProjet(apiProjet.jeton, input.project_id, sectionCreee.id)
    }

    await chargerSectionsDuProjet(input.project_id)
    return sectionCreee
  }

  /**
   * Génération de brouillon par adaptation d'un document de référence
   * (§4.1bis).
   *
   * Garde-fous non négociables, dans l'ordre :
   * - Refuse tant que `confirmationDroitUsage` n'est pas
   *   `true` — cette confirmation n'est PAS une preuve juridique de droit
   *   d'usage (elle reste de la responsabilité de l'utilisateur), mais une
   *   action tracée dans `section.audit_log`, jamais silencieuse.
   * - Uniquement applicable à une section `brouillon_aide` avec un gabarit
   *   réellement défini (le repli générique "champ contenu libre" n'a pas
   *   de champs adressables — génération sans objet).
   * - Le document de référence est persisté comme `ProjectDocument` réel
   *   (jusqu'ici jamais consommé) pour que
   *   `generation_source.source_document_id` référence un
   *   objet réel plutôt qu'un simple label perdu.
   * - Une valeur déjà saisie par l'utilisateur n'est jamais écrasée par une
   *   proposition IA — seuls les champs encore vides sont renseignés.
   * - `generation_source.generated_fields` liste uniquement les champs
   *   d'origine technique/numérique — c'est ce que l'écran
   *   utilise pour le surlignage distinct exigé, pas la liste de tous les
   *   champs proposés.
   */
  async function genererBrouillonIA(
    sectionId: string,
    entrees: EntreesGenerationBrouillonIA,
    provider: ProviderAdapter,
  ): Promise<ResultatGenerationBrouillonIA> {
    if (!entrees.confirmationDroitUsage) {
      return { ok: false, motif: 'confirmation_droit_usage_requise' }
    }

    const section = await chargerSection(sectionId)
    if (section.status !== 'brouillon_aide') {
      return { ok: false, motif: 'statut_incompatible' }
    }

    const gabarit = obtenirDefinitionGabarit(section.template_type)
    if (!gabarit) {
      return { ok: false, motif: 'gabarit_introuvable' }
    }

    const maintenant = new Date().toISOString()
    const documentReference: ProjectDocument = {
      id: crypto.randomUUID(),
      project_id: section.project_id,
      filename: entrees.nomDocumentReference,
      status: 'reference_de_travail_non_maitre',
      uploaded_at: maintenant,
      uploaded_by: entrees.actor,
      extracted_text: entrees.texteDocumentReference,
      content: null,
      mime_type: '',
    }
    await db.projectDocuments.put(documentReference)

    const apiProjetDocument = await obtenirApiProjet()
    if (apiProjetDocument) {
      await apiProjetDocument.api.ajouterDocumentProjet(
        apiProjetDocument.jeton,
        section.project_id,
        documentReference.id,
      )
    }

    const proposition = await genererBrouillonSection(
      {
        gabarit,
        texteDocumentReference: entrees.texteDocumentReference,
        contexteNouveauCas: entrees.contexteNouveauCas,
        langue: section.language,
        tablesExistantes: section.tables,
        documentsNormatifs: entrees.documentsNormatifs,
      },
      provider,
    )

    const valeursExistantes = section.values
    const nouvellesValeurs = { ...valeursExistantes }
    for (const champ of proposition.champs) {
      const cleValeur = champ.field_key
      const dejaSaisi =
        valeursExistantes[cleValeur] !== undefined &&
        valeursExistantes[cleValeur] !== null &&
        valeursExistantes[cleValeur] !== ''
      if (!dejaSaisi) {
        nouvellesValeurs[cleValeur] = champ.valeur
      }
    }
    const champsGeneresTechniques = proposition.champs
      .filter((c) => c.origineTechnique && nouvellesValeurs[c.field_key] === c.valeur)
      .map((c) => c.field_key)

    // Lignes de tableau dynamique — re-vérifiées vides
    // ici sur le même `section` chargé en tête de fonction (jamais un
    // écrasement), même discipline que `nouvellesValeurs` ci-dessus.
    const nouvellesTables = { ...section.tables }
    let nombreLignesTableauxGenerees = 0
    for (const proposition_ of proposition.lignesTableaux) {
      const dejaRempli = (section.tables[proposition_.field_key]?.length ?? 0) > 0
      if (dejaRempli || proposition_.lignes.length === 0) continue
      nouvellesTables[proposition_.field_key] = proposition_.lignes
      nombreLignesTableauxGenerees += proposition_.lignes.length
    }

    const apresConfirmation = new Date().toISOString()
    const sectionMiseAJour: Section = {
      ...section,
      values: nouvellesValeurs,
      tables: nouvellesTables,
      status: 'propose_par_ia_non_valide',
      generation_source: {
        source_document_id: documentReference.id,
        generated_fields: champsGeneresTechniques,
      },
      updated_at: apresConfirmation,
      audit_log: [
        ...section.audit_log,
        {
          timestamp: maintenant,
          actor: entrees.actor,
          action: 'confirmation_droit_usage_document_reference',
        },
        {
          timestamp: apresConfirmation,
          actor: entrees.actor,
          action: `generation_brouillon_ia (${proposition.champs.length} champ(s), ${nombreLignesTableauxGenerees} ligne(s) de tableau proposé(s), fournisseur ${provider.nomAffiche})`,
        },
      ],
      revisions: [
        ...section.revisions,
        {
          version: section.meta.version,
          date: apresConfirmation,
          auteur: `système (${provider.nomAffiche})`,
          motif: 'génération assistée',
        },
      ],
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)

    return {
      ok: true,
      champsGeneres: proposition.champs.length,
      lignesTableauxGenerees: nombreLignesTableauxGenerees,
    }
  }

  /** Filiation : nom du document de référence utilisé pour une génération de brouillon donnée. */
  async function obtenirDocumentReference(id: string): Promise<ProjectDocument | undefined> {
    return db.projectDocuments.get(id)
  }

  /**
   * Recrée une section importée depuis un export JSON
   * ("transfert entre postes") comme une section **nouvelle** dans le
   * projet cible — jamais un écrasement par id, qui risquerait une
   * collision entre installations (voir `analyserImportJSON.ts`).
   * Préserve l'historique importé (`audit_log`/`revisions`) et lui ajoute
   * une entrée `import` — jamais "création", qui masquerait l'origine
   * (ALCOA+ "Attributable"/"Original").
   */
  async function importerSection(
    projectId: string,
    donnees: DonneesImportSection,
    actor: string,
  ): Promise<Section> {
    const maintenant = new Date().toISOString()
    const section: Section = {
      ...donnees,
      id: crypto.randomUUID(),
      project_id: projectId,
      updated_at: maintenant,
      audit_log: [...donnees.audit_log, { timestamp: maintenant, actor, action: 'import' }],
    }
    const { api, jeton } = await obtenirApiSection()
    const resultat = await api.creerSection(jeton, sectionDomaineVersWire(section))
    if (!resultat.ok) throw new Error(`Échec de l'import de la section : ${resultat.erreur}`)
    const sectionCreee = sectionWireVersDomaine(resultat.donnees.section)

    const apiProjetImport = await obtenirApiProjet()
    if (apiProjetImport) {
      await apiProjetImport.api.ajouterSectionProjet(
        apiProjetImport.jeton,
        projectId,
        sectionCreee.id,
      )
    }

    await chargerSectionsDuProjet(projectId)
    return sectionCreee
  }

  /**
   * Journalise un export réussi (`audit_log.action` inclut
   * "export"/"export_force") — jamais bloqué par le verrouillage
   * `valide_en_interne` (l'export d'une section validée est précisément
   * l'usage principal), contrairement à `mettreAJourValeurs`.
   */
  async function journaliserExport(sectionId: string, force: boolean): Promise<void> {
    const section = await chargerSection(sectionId)
    const maintenant = new Date().toISOString()
    const sectionMiseAJour: Section = {
      ...section,
      audit_log: [
        ...section.audit_log,
        {
          timestamp: maintenant,
          actor: section.owner_id,
          action: force ? 'export_force' : 'export',
        },
      ],
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Trace dans `audit_log` le contexte réellement rassemblé avant
   * génération (assistant guidé de création de livrable, §4.32) —
   * procédure/méthode/précédents effectivement consultés, jamais une
   * association structurelle nouvelle (`Section` ne gagne aucun champ) :
   * un simple enregistrement auditable, même discipline que
   * `journaliserExport`.
   */
  async function journaliserContexteAssemble(
    sectionId: string,
    description: string,
  ): Promise<void> {
    const section = await chargerSection(sectionId)
    const maintenant = new Date().toISOString()
    const sectionMiseAJour: Section = {
      ...section,
      audit_log: [
        ...section.audit_log,
        {
          timestamp: maintenant,
          actor: section.owner_id,
          action: `contexte_assemble : ${description}`,
        },
      ],
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Lie/délie manuellement cette section à une procédure ou un nœud
   * Structure Système (tâche #118) — mêmes champs que ceux renseignés par
   * l'assistant guidé à la création (`creerSection`), éditables ensuite
   * depuis `EditeurSection.vue` pour les sections créées avant cette
   * fonctionnalité ou hors du parcours assisté. `null` retire le lien.
   */
  async function lierProcedure(sectionId: string, procedureId: string | null): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    const sectionMiseAJour: Section = {
      ...section,
      procedure_id: procedureId,
      updated_at: new Date().toISOString(),
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
  }

  async function lierAssetNode(sectionId: string, assetNodeId: string | null): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    const sectionMiseAJour: Section = {
      ...section,
      asset_node_id: assetNodeId,
      updated_at: new Date().toISOString(),
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Sauvegarde automatique locale des valeurs saisies (debounce à la
   * charge de l'appelant — ce store ne fait qu'écrire).
   * Refuse silencieusement toute modification si la section est
   * verrouillée plutôt que d'écrire un corps qui devrait
   * passer par une nouvelle révision (backlog).
   *
   * @requirement `audit_log.action` inclut explicitement
   * "modification" dans le modèle pivot : une sauvegarde de
   * contenu qui ne laisserait aucune trace serait un écart de
   * traçabilité, pas seulement un détail d'implémentation. Une entrée
   * par appel (donc par sauvegarde debounced), jamais par frappe.
   */
  async function mettreAJourValeurs(sectionId: string, values: Section['values']): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    const maintenant = new Date().toISOString()
    const sectionMiseAJour: Section = {
      ...section,
      values,
      updated_at: maintenant,
      audit_log: [
        ...section.audit_log,
        { timestamp: maintenant, actor: section.owner_id, action: 'modification' },
      ],
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Sauvegarde automatique locale des lignes d'un tableau dynamique
   * — même discipline que `mettreAJourValeurs` (verrouillage,
   * piste d'audit), pour la partie `Section.tables` du modèle pivot plutôt
   * que `Section.values`.
   */
  async function mettreAJourTable(
    sectionId: string,
    cleTable: string,
    lignes: Section['tables'][string],
  ): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    const maintenant = new Date().toISOString()
    const sectionMiseAJour: Section = {
      ...section,
      tables: { ...section.tables, [cleTable]: lignes },
      updated_at: maintenant,
      audit_log: [
        ...section.audit_log,
        { timestamp: maintenant, actor: section.owner_id, action: 'modification' },
      ],
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Renseigne l'approbateur final du workflow (requis dès
   * l'engagement du cycle, voir note d'interprétation sur
   * `appliquerTransition`).
   */
  async function assignerApprobateurFinal(sectionId: string, userId: string): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    const sectionMiseAJour: Section = {
      ...section,
      workflow: { ...section.workflow, approver_final: userId },
      updated_at: new Date().toISOString(),
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Ajoute l'avis d'un relecteur ("plusieurs relecteurs,
   * chacun pouvant émettre un avis distinct"). Requis avant de pouvoir
   * transmettre la section à l'approbation.
   */
  async function ajouterAvisRelecteur(
    sectionId: string,
    userId: string,
    avis: string,
  ): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    const maintenant = new Date().toISOString()
    const sectionMiseAJour: Section = {
      ...section,
      workflow: {
        ...section.workflow,
        reviewers: [...section.workflow.reviewers, { user_id: userId, avis, date: maintenant }],
      },
      updated_at: maintenant,
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
  }

  async function engagerVerification(
    sectionId: string,
    forcerMotif?: string,
  ): Promise<ResultatActionSection> {
    return transitionAvecGardeFinalisation(
      sectionId,
      'entree_en_verification',
      'engager_verification',
      forcerMotif,
    )
  }

  async function transmettreApprobation(sectionId: string): Promise<ResultatActionSection> {
    return appliquerTransitionSimple(sectionId, 'transmettre_approbation')
  }

  async function approuver(
    sectionId: string,
    forcerMotif?: string,
  ): Promise<ResultatActionSection> {
    return transitionAvecGardeFinalisation(
      sectionId,
      'cloture_valide_en_interne',
      'approuver',
      forcerMotif,
    )
  }

  async function rejeter(sectionId: string, motif: string): Promise<ResultatActionSection> {
    const section = await chargerSection(sectionId)
    const resultat = appliquerTransition(contexteTransitionDepuis(section, motif), 'rejeter')
    return finaliserTransition(section, resultat, `rejet : ${motif}`, motif)
  }

  /**
   * §4.1bis, clarification ALCOA+ : le passage de
   * `propose_par_ia_non_valide` à `brouillon_aide` DOIT laisser une entrée
   * `revisions` distincte motif "validation utilisateur" — jamais fusionnée
   * avec l'entrée "génération assistée" déjà posée par
   * `genererBrouillonIA`, pour respecter le principe "Contemporaneous".
   * Documenté depuis la conception initiale mais jamais réellement posé
   * jusqu'ici (aucune fonction ne produisait encore ce statut) — corrigé
   * en même temps que la génération elle-même.
   */
  async function validerSectionIA(sectionId: string): Promise<ResultatActionSection> {
    const section = await chargerSection(sectionId)
    const resultat = appliquerTransition(contexteTransitionDepuis(section), 'valider_section_ia')
    return finaliserTransition(
      section,
      resultat,
      'changement_statut: valider_section_ia',
      'validation utilisateur',
    )
  }

  async function appliquerTransitionSimple(
    sectionId: string,
    action: 'transmettre_approbation',
  ): Promise<ResultatActionSection> {
    const section = await chargerSection(sectionId)
    const resultat = appliquerTransition(contexteTransitionDepuis(section), action)
    return finaliserTransition(section, resultat, `changement_statut: ${action}`)
  }

  async function transitionAvecGardeFinalisation(
    sectionId: string,
    pointDeControle: 'entree_en_verification' | 'cloture_valide_en_interne',
    action: 'engager_verification' | 'approuver',
    forcerMotif: string | undefined,
  ): Promise<ResultatActionSection> {
    const section = await chargerSection(sectionId)
    const apiProjetGarde = await obtenirApiProjet()
    if (!apiProjetGarde) throw new Error(`Projet introuvable pour la section ${sectionId}`)
    const resultatProjet = await apiProjetGarde.api.obtenirProjet(
      apiProjetGarde.jeton,
      section.project_id,
    )
    if (!resultatProjet.ok) throw new Error(`Projet introuvable pour la section ${sectionId}`)
    const liensProjet: LienProjet[] = resultatProjet.donnees.projet.links.map((l) => ({
      from_section_id: l.fromSectionId,
      to_section_id: l.toSectionId,
      created_by: l.createdBy,
      created_at: l.createdAt,
    }))
    const { api, jeton } = await obtenirApiSection()
    const resultatSections = await api.listerSectionsProjet(jeton, section.project_id)
    const sectionsDuProjet = resultatSections.ok
      ? resultatSections.donnees.sections.map(sectionWireVersDomaine)
      : []

    const blocages = evaluerGardesFinalisation(
      {
        templateType: section.template_type,
        aLienVersContextProcede: aLienVersTypeSection(
          sectionId,
          'contexte_procede',
          liensProjet,
          sectionsDuProjet,
        ),
        aLienVersPlanMetrologie: aLienVersTypeSection(
          sectionId,
          'plan_metrologie',
          liensProjet,
          sectionsDuProjet,
        ),
        aLienVersPlanMaintenance: aLienVersTypeSection(
          sectionId,
          'plan_maintenance',
          liensProjet,
          sectionsDuProjet,
        ),
      },
      pointDeControle,
    )

    let motifForcage: string | undefined
    if (blocages.length > 0) {
      if (!motifDeForcageValide(forcerMotif)) {
        return { ok: false, blocagesFinalisation: blocages }
      }
      motifForcage = forcerMotif
    }

    const resultat = appliquerTransition(contexteTransitionDepuis(section), action)
    const descriptionAction =
      motifForcage !== undefined
        ? `changement_statut: ${action} (forcé — ${blocages.join(',')} : ${motifForcage})`
        : `changement_statut: ${action}`
    return finaliserTransition(section, resultat, descriptionAction)
  }

  async function finaliserTransition(
    section: Section,
    resultat: ReturnType<typeof appliquerTransition>,
    descriptionAudit: string,
    motifRevision?: string,
  ): Promise<ResultatActionSection> {
    if (!resultat.autorisee) {
      return { ok: false, raisonTransition: resultat.raison }
    }
    const maintenant = new Date().toISOString()
    const sectionMiseAJour: Section = {
      ...section,
      status: resultat.nouveauStatut,
      updated_at: maintenant,
      audit_log: [
        ...section.audit_log,
        { timestamp: maintenant, actor: section.owner_id, action: descriptionAudit },
      ],
      revisions:
        motifRevision !== undefined
          ? [
              ...section.revisions,
              {
                version: section.meta.version,
                date: maintenant,
                auteur: section.owner_id,
                motif: motifRevision,
              },
            ]
          : section.revisions,
    }
    const { api, jeton } = await obtenirApiSection()
    await api.remplacerSection(jeton, section.id, sectionDomaineVersWire(sectionMiseAJour))
    await chargerSectionsDuProjet(section.project_id)
    return { ok: true }
  }

  async function chargerSection(sectionId: string): Promise<Section> {
    const { api, jeton } = await obtenirApiSection()
    const resultat = await api.obtenirSection(jeton, sectionId)
    if (!resultat.ok) throw new Error(`Section introuvable : ${sectionId}`)
    return sectionWireVersDomaine(resultat.donnees.section)
  }

  function contexteTransitionDepuis(section: Section, motifRejet?: string) {
    return {
      statutActuel: section.status,
      auteursRenseignes: section.workflow.authors.length > 0,
      approbateurFinalRenseigne: section.workflow.approver_final !== null,
      auMoinsUnAvisRelecteur: section.workflow.reviewers.length > 0,
      motifRejet,
    }
  }

  return {
    sectionsParProjet,
    chargerSectionsDuProjet,
    creerSection,
    genererBrouillonIA,
    obtenirDocumentReference,
    importerSection,
    journaliserExport,
    journaliserContexteAssemble,
    lierProcedure,
    lierAssetNode,
    mettreAJourValeurs,
    mettreAJourTable,
    assignerApprobateurFinal,
    ajouterAvisRelecteur,
    engagerVerification,
    transmettreApprobation,
    approuver,
    rejeter,
    validerSectionIA,
  }
})

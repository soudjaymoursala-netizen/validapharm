import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import { aLienVersTypeSection } from '../../logique-metier/detection-liens/aLienVersTypeSection'
import type {
  Langue,
  ProjectDocument,
  Section,
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
import { db } from '../../persistance/db'

export interface NouvelleSectionInput {
  project_id: string
  template_type: TemplateType
  language: Langue
  titre: string
  owner_id: string
}

export type ResultatActionSection =
  | { ok: true }
  | { ok: false; blocagesFinalisation: MessageBlocageFinalisation[] }
  | { ok: false; raisonTransition: RaisonBlocageTransition }

/**
 * Entrées de la génération de brouillon par adaptation (§4.1bis, Phase 33,
 * TD-031) — `nomDocumentReference` sert uniquement de nom affiché
 * (URS-F-064), jamais de contenu ; le texte réellement transmis à l'IA est
 * `texteDocumentReference` (collé directement ou déjà extrait d'un fichier
 * .docx/.pdf côté écran, URS-F-060).
 */
export interface EntreesGenerationBrouillonIA {
  texteDocumentReference: string
  nomDocumentReference: string
  contexteNouveauCas: string
  confirmationDroitUsage: boolean
  actor: string
}

export type ResultatGenerationBrouillonIA =
  | { ok: true; champsGeneres: number }
  | { ok: false; motif: 'confirmation_droit_usage_requise' }
  | { ok: false; motif: 'gabarit_introuvable' }
  | { ok: false; motif: 'statut_incompatible' }

const VERSION_MOTEUR_GABARITS = '0.1.0'

/**
 * Store de la Couche Présentation orchestrant la rédaction de sections
 * (FS §4.1) et leur cycle de vie (FS §4.2, FDS §3.2/§3.3). Les décisions
 * (transition autorisée ou non, blocage de finalisation) restent dans
 * `logique-metier/` — ce store se contente de rassembler le contexte
 * nécessaire (liens du projet, rôles renseignés) et de persister le
 * résultat.
 *
 * @requirement FS §4.0/§4.1/§4.2, FDS §3.2/§3.3
 */
export const useSectionsStore = defineStore('sections', () => {
  const sectionsParProjet = ref<Record<string, Section[]>>({})

  async function chargerSectionsDuProjet(projectId: string): Promise<void> {
    const sections = await db.sections.where('project_id').equals(projectId).toArray()
    sectionsParProjet.value = { ...sectionsParProjet.value, [projectId]: sections }
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
      audit_log: [{ timestamp: maintenant, actor: input.owner_id, action: 'création' }],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.sections.put(section)

    const projet = await db.projects.get(input.project_id)
    if (projet) {
      await db.projects.put({
        ...projet,
        sections: [...projet.sections, section.id],
        updated_at: maintenant,
        audit_log: [
          ...projet.audit_log,
          { timestamp: maintenant, actor: input.owner_id, action: 'ajout_section' },
        ],
      })
    }

    await chargerSectionsDuProjet(input.project_id)
    return section
  }

  /**
   * Génération de brouillon par adaptation d'un document de référence
   * (§4.1bis, Phase 33, TD-031 — URS-F-060 à 064).
   *
   * Garde-fous non négociables, dans l'ordre :
   * - URS-F-062 : refuse tant que `confirmationDroitUsage` n'est pas
   *   `true` — cette confirmation n'est PAS une preuve juridique de droit
   *   d'usage (elle reste de la responsabilité de l'utilisateur), mais une
   *   action tracée dans `section.audit_log`, jamais silencieuse.
   * - Uniquement applicable à une section `brouillon_aide` avec un gabarit
   *   réellement défini (le repli générique "champ contenu libre" n'a pas
   *   de champs adressables — génération sans objet).
   * - Le document de référence est persisté comme `ProjectDocument` réel
   *   (URS-F-000quater, jusqu'ici jamais consommé) pour que
   *   `generation_source.source_document_id` (URS-F-064) référence un
   *   objet réel plutôt qu'un simple label perdu.
   * - Une valeur déjà saisie par l'utilisateur n'est jamais écrasée par une
   *   proposition IA — seuls les champs encore vides sont renseignés.
   * - `generation_source.generated_fields` liste uniquement les champs
   *   d'origine technique/numérique (URS-F-063) — c'est ce que l'écran
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

    const projet = await db.projects.get(section.project_id)
    if (projet) {
      await db.projects.put({
        ...projet,
        documents: [...projet.documents, documentReference.id],
        updated_at: maintenant,
        audit_log: [
          ...projet.audit_log,
          { timestamp: maintenant, actor: entrees.actor, action: 'ajout_document' },
        ],
      })
    }

    const proposition = await genererBrouillonSection(
      {
        gabarit,
        texteDocumentReference: entrees.texteDocumentReference,
        contexteNouveauCas: entrees.contexteNouveauCas,
        langue: section.language,
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

    const apresConfirmation = new Date().toISOString()
    const sectionMiseAJour: Section = {
      ...section,
      values: nouvellesValeurs,
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
          action: `generation_brouillon_ia (${proposition.champs.length} champ(s) proposé(s), fournisseur ${provider.nomAffiche})`,
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
    await db.sections.put(sectionMiseAJour)
    await chargerSectionsDuProjet(section.project_id)

    return { ok: true, champsGeneres: proposition.champs.length }
  }

  /** Filiation URS-F-064 : nom du document de référence utilisé pour une génération de brouillon donnée. */
  async function obtenirDocumentReference(id: string): Promise<ProjectDocument | undefined> {
    return db.projectDocuments.get(id)
  }

  /**
   * Recrée une section importée depuis un export JSON (FS §4.3, URS-F-021,
   * "transfert entre postes") comme une section **nouvelle** dans le
   * projet cible — jamais un écrasement par id, qui risquerait une
   * collision entre installations (voir `analyserImportJSON.ts`).
   * Préserve l'historique importé (`audit_log`/`revisions`) et lui ajoute
   * une entrée `import` — jamais "création", qui masquerait l'origine
   * (ALCOA+ "Attributable"/"Original", FS §3 v13).
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
    await db.sections.put(section)

    const projet = await db.projects.get(projectId)
    if (projet) {
      await db.projects.put({
        ...projet,
        sections: [...projet.sections, section.id],
        updated_at: maintenant,
        audit_log: [...projet.audit_log, { timestamp: maintenant, actor, action: 'ajout_section' }],
      })
    }

    await chargerSectionsDuProjet(projectId)
    return section
  }

  /**
   * Journalise un export réussi (FS §3 : `audit_log.action` inclut
   * "export"/"export_force") — jamais bloqué par le verrouillage
   * `valide_en_interne` (l'export d'une section validée est précisément
   * l'usage principal, FS §4.3), contrairement à `mettreAJourValeurs`.
   *
   * @requirement URS-F-027, FS §4.3
   */
  async function journaliserExport(sectionId: string, force: boolean): Promise<void> {
    const section = await chargerSection(sectionId)
    const maintenant = new Date().toISOString()
    await db.sections.put({
      ...section,
      audit_log: [
        ...section.audit_log,
        {
          timestamp: maintenant,
          actor: section.owner_id,
          action: force ? 'export_force' : 'export',
        },
      ],
    })
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Sauvegarde automatique locale des valeurs saisies (URS-F-009,
   * debounce à la charge de l'appelant — ce store ne fait qu'écrire).
   * Refuse silencieusement toute modification si la section est
   * verrouillée (URS-F-012) plutôt que d'écrire un corps qui devrait
   * passer par une nouvelle révision (backlog).
   *
   * @requirement URS-NF-030/031 — `audit_log.action` inclut explicitement
   * "modification" dans le modèle pivot (FS §3) : une sauvegarde de
   * contenu qui ne laisserait aucune trace serait un écart de
   * traçabilité, pas seulement un détail d'implémentation. Une entrée
   * par appel (donc par sauvegarde debounced), jamais par frappe.
   */
  async function mettreAJourValeurs(sectionId: string, values: Section['values']): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    const maintenant = new Date().toISOString()
    await db.sections.put({
      ...section,
      values,
      updated_at: maintenant,
      audit_log: [
        ...section.audit_log,
        { timestamp: maintenant, actor: section.owner_id, action: 'modification' },
      ],
    })
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Sauvegarde automatique locale des lignes d'un tableau dynamique (FDS §4,
   * URS-F-009/003) — même discipline que `mettreAJourValeurs` (verrouillage,
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
    await db.sections.put({
      ...section,
      tables: { ...section.tables, [cleTable]: lignes },
      updated_at: maintenant,
      audit_log: [
        ...section.audit_log,
        { timestamp: maintenant, actor: section.owner_id, action: 'modification' },
      ],
    })
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Renseigne l'approbateur final du workflow (FDS §3.2 : requis dès
   * l'engagement du cycle — URS-F-011, voir note d'interprétation sur
   * `appliquerTransition`).
   *
   * @requirement URS-F-014quater
   */
  async function assignerApprobateurFinal(sectionId: string, userId: string): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    await db.sections.put({
      ...section,
      workflow: { ...section.workflow, approver_final: userId },
      updated_at: new Date().toISOString(),
    })
    await chargerSectionsDuProjet(section.project_id)
  }

  /**
   * Ajoute l'avis d'un relecteur (URS-F-014ter, "plusieurs relecteurs,
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
    await db.sections.put({
      ...section,
      workflow: {
        ...section.workflow,
        reviewers: [...section.workflow.reviewers, { user_id: userId, avis, date: maintenant }],
      },
      updated_at: maintenant,
    })
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
   * URS-F-061/§4.1bis, clarification ALCOA+ (FS §3, v04) : le passage de
   * `propose_par_ia_non_valide` à `brouillon_aide` DOIT laisser une entrée
   * `revisions` distincte motif "validation utilisateur" — jamais fusionnée
   * avec l'entrée "génération assistée" déjà posée par
   * `genererBrouillonIA`, pour respecter le principe "Contemporaneous".
   * Documenté depuis la conception initiale mais jamais réellement posé
   * jusqu'ici (aucune fonction ne produisait encore ce statut) — corrigé
   * en même temps que la génération elle-même (Phase 33, TD-031).
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
    const projet = await db.projects.get(section.project_id)
    if (!projet) throw new Error(`Projet introuvable pour la section ${sectionId}`)
    const sectionsDuProjet = await db.sections
      .where('project_id')
      .equals(section.project_id)
      .toArray()

    const blocages = evaluerGardesFinalisation(
      {
        templateType: section.template_type,
        aLienVersContextProcede: aLienVersTypeSection(
          sectionId,
          'contexte_procede',
          projet.links,
          sectionsDuProjet,
        ),
        aLienVersPlanMetrologie: aLienVersTypeSection(
          sectionId,
          'plan_metrologie',
          projet.links,
          sectionsDuProjet,
        ),
        aLienVersPlanMaintenance: aLienVersTypeSection(
          sectionId,
          'plan_maintenance',
          projet.links,
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
    await db.sections.put(sectionMiseAJour)
    await chargerSectionsDuProjet(section.project_id)
    return { ok: true }
  }

  async function chargerSection(sectionId: string): Promise<Section> {
    const section = await db.sections.get(sectionId)
    if (!section) throw new Error(`Section introuvable : ${sectionId}`)
    return section
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

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { aLienVersTypeSection } from '../../logique-metier/detection-liens/aLienVersTypeSection'
import type { Langue, Section, TemplateType } from '../../logique-metier/domaine/types'
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
   * Sauvegarde automatique locale des valeurs saisies (URS-F-009,
   * debounce à la charge de l'appelant — ce store ne fait qu'écrire).
   * Refuse silencieusement toute modification si la section est
   * verrouillée (URS-F-012) plutôt que d'écrire un corps qui devrait
   * passer par une nouvelle révision (backlog).
   */
  async function mettreAJourValeurs(sectionId: string, values: Section['values']): Promise<void> {
    const section = await chargerSection(sectionId)
    if (section.status === 'valide_en_interne') return
    await db.sections.put({ ...section, values, updated_at: new Date().toISOString() })
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

  async function validerSectionIA(sectionId: string): Promise<ResultatActionSection> {
    return appliquerTransitionSimple(sectionId, 'valider_section_ia')
  }

  async function appliquerTransitionSimple(
    sectionId: string,
    action: 'transmettre_approbation' | 'valider_section_ia',
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
    mettreAJourValeurs,
    assignerApprobateurFinal,
    ajouterAvisRelecteur,
    engagerVerification,
    transmettreApprobation,
    approuver,
    rejeter,
    validerSectionIA,
  }
})

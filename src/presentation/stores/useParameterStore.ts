import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ClassificationCriticiteParametre,
  CPP,
  CQA,
  NiveauCriticiteParametre,
  Parameter,
} from '../../logique-metier/domaine/types'
import { IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1 } from '../identite/identiteLocale'
import { db } from '../../persistance/db'

export interface NouveauParametreInput {
  nom: string
  description: string
  unite: string | null
  assetNodeId: string | null
}

export interface NouvelleClassificationInput {
  parameterId: string
  niveau: NiveauCriticiteParametre
  contexte: string | null
  justification: string
}

export interface NouveauCPPInput {
  parameterId: string
  contexte: string
  justification: string
}

export interface NouveauCQAInput {
  nom: string
  description: string
  contexte: string
  justification: string
}

/**
 * Store `Parameter`/`ClassificationCriticiteParametre`/`CPP`/`CQA` (Phase 2
 * de convergence architecturale, `docs/convergence/CONVERGENCE_PLAN.md`).
 *
 * Garde-fou central : aucune fonction de ce store ne crée un `CPP` ou un
 * `CQA` à partir d'une `ClassificationCriticiteParametre` — ce sont deux
 * actes de déclaration humaine distincts et volontairement non reliés par
 * du code (`docs/convergence/GAP.md`, ligne "Parameter / CriticalParameter
 * / CPP / CQA" ; Target Architecture §10, DEC-019).
 *
 * @requirement Target Architecture §10, DEC-019/DEC-020/DEC-021
 */
export const useParameterStore = defineStore('parameter', () => {
  const parametres = ref<Parameter[]>([])
  const classifications = ref<ClassificationCriticiteParametre[]>([])
  const cpps = ref<CPP[]>([])
  const cqas = ref<CQA[]>([])
  const enChargement = ref(false)

  const cppsActifs = computed(() => cpps.value.filter((c) => c.actif))
  const cqasActifs = computed(() => cqas.value.filter((c) => c.actif))

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      parametres.value = await db.parameters.where('client_id').equals(clientId).toArray()
      classifications.value = await db.classificationsCriticiteParametre
        .where('client_id')
        .equals(clientId)
        .toArray()
      cpps.value = await db.cpps.where('client_id').equals(clientId).toArray()
      cqas.value = await db.cqas.where('client_id').equals(clientId).toArray()
    } finally {
      enChargement.value = false
    }
  }

  async function creerParametre(
    clientId: string,
    input: NouveauParametreInput,
  ): Promise<Parameter> {
    const maintenant = new Date().toISOString()
    const parametre: Parameter = {
      id: crypto.randomUUID(),
      client_id: clientId,
      asset_node_id: input.assetNodeId,
      nom: input.nom,
      description: input.description,
      unite: input.unite,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.parameters.put(parametre)
    parametres.value = [...parametres.value, parametre]
    return parametre
  }

  /**
   * Déclare qu'un paramètre est important ou critique **pour le procédé**.
   * Ne crée jamais de CPP : voir `declarerCPP`, un acte séparé et explicite.
   */
  async function classifierParametre(
    clientId: string,
    input: NouvelleClassificationInput,
  ): Promise<ClassificationCriticiteParametre> {
    const maintenant = new Date().toISOString()
    const classification: ClassificationCriticiteParametre = {
      id: crypto.randomUUID(),
      client_id: clientId,
      parameter_id: input.parameterId,
      niveau: input.niveau,
      contexte: input.contexte,
      justification: input.justification,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
    }
    await db.classificationsCriticiteParametre.put(classification)
    classifications.value = [...classifications.value, classification]
    return classification
  }

  /** Déclaration humaine explicite d'un CPP — jamais dérivée d'une classification. */
  async function declarerCPP(clientId: string, input: NouveauCPPInput): Promise<CPP> {
    const maintenant = new Date().toISOString()
    const cpp: CPP = {
      id: crypto.randomUUID(),
      client_id: clientId,
      parameter_id: input.parameterId,
      contexte: input.contexte,
      justification: input.justification,
      actif: true,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.cpps.put(cpp)
    cpps.value = [...cpps.value, cpp]
    return cpp
  }

  /**
   * Désactive un CPP existant (changement de contexte, ex. changement de
   * recette) sans le muter ni le supprimer : l'historique reste lisible tel
   * qu'il a été produit (principe `ContextSnapshot` immuable).
   */
  async function desactiverCPP(
    clientId: string,
    cppId: string,
    motif: string,
  ): Promise<CPP | null> {
    const existant = await db.cpps.get(cppId)
    if (!existant || existant.client_id !== clientId) return null
    const maintenant = new Date().toISOString()
    const misAJour: CPP = {
      ...existant,
      actif: false,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `désactivation : ${motif}`,
        },
      ],
      updated_at: maintenant,
    }
    await db.cpps.put(misAJour)
    cpps.value = cpps.value.map((c) => (c.id === cppId ? misAJour : c))
    return misAJour
  }

  async function declarerCQA(clientId: string, input: NouveauCQAInput): Promise<CQA> {
    const maintenant = new Date().toISOString()
    const cqa: CQA = {
      id: crypto.randomUUID(),
      client_id: clientId,
      nom: input.nom,
      description: input.description,
      contexte: input.contexte,
      justification: input.justification,
      actif: true,
      audit_log: [
        { timestamp: maintenant, actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1, action: 'création' },
      ],
      created_at: maintenant,
      updated_at: maintenant,
    }
    await db.cqas.put(cqa)
    cqas.value = [...cqas.value, cqa]
    return cqa
  }

  async function desactiverCQA(
    clientId: string,
    cqaId: string,
    motif: string,
  ): Promise<CQA | null> {
    const existant = await db.cqas.get(cqaId)
    if (!existant || existant.client_id !== clientId) return null
    const maintenant = new Date().toISOString()
    const misAJour: CQA = {
      ...existant,
      actif: false,
      audit_log: [
        ...existant.audit_log,
        {
          timestamp: maintenant,
          actor: IDENTIFIANT_UTILISATEUR_LOCAL_PHASE1,
          action: `désactivation : ${motif}`,
        },
      ],
      updated_at: maintenant,
    }
    await db.cqas.put(misAJour)
    cqas.value = cqas.value.map((c) => (c.id === cqaId ? misAJour : c))
    return misAJour
  }

  return {
    parametres,
    classifications,
    cpps,
    cqas,
    enChargement,
    cppsActifs,
    cqasActifs,
    charger,
    creerParametre,
    classifierParametre,
    declarerCPP,
    desactiverCPP,
    declarerCQA,
    desactiverCQA,
  }
})

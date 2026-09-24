import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ClassificationCriticiteParametreWire,
  CPPWire,
  CQAWire,
  ParameterWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  ClassificationCriticiteParametre,
  CPP,
  CQA,
  NiveauCriticiteParametre,
  Parameter,
} from '../../logique-metier/domaine/types'
import {
  parametersAMigrer,
  classificationsCriticiteParametreAMigrer,
  cppsAMigrer,
  cqasAMigrer,
} from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export function parametreWireVersDomaine(wire: ParameterWire): Parameter {
  return {
    id: wire.id,
    client_id: wire.clientId,
    asset_node_id: wire.assetNodeId,
    nom: wire.nom,
    description: wire.description,
    unite: wire.unite,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function classificationWireVersDomaine(
  wire: ClassificationCriticiteParametreWire,
): ClassificationCriticiteParametre {
  return {
    id: wire.id,
    client_id: wire.clientId,
    parameter_id: wire.parameterId,
    niveau: wire.niveau as NiveauCriticiteParametre,
    contexte: wire.contexte,
    justification: wire.justification,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
  }
}

export function cppWireVersDomaine(wire: CPPWire): CPP {
  return {
    id: wire.id,
    client_id: wire.clientId,
    parameter_id: wire.parameterId,
    contexte: wire.contexte,
    justification: wire.justification,
    actif: wire.actif,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

export function cqaWireVersDomaine(wire: CQAWire): CQA {
  return {
    id: wire.id,
    client_id: wire.clientId,
    nom: wire.nom,
    description: wire.description,
    contexte: wire.contexte,
    justification: wire.justification,
    actif: wire.actif,
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

function parametreDomaineVersWire(p: Parameter): ParameterWire {
  return {
    id: p.id,
    clientId: p.client_id,
    assetNodeId: p.asset_node_id,
    nom: p.nom,
    description: p.description,
    unite: p.unite,
    auditLog: p.audit_log,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

function classificationDomaineVersWire(
  c: ClassificationCriticiteParametre,
): ClassificationCriticiteParametreWire {
  return {
    id: c.id,
    clientId: c.client_id,
    parameterId: c.parameter_id,
    niveau: c.niveau,
    contexte: c.contexte,
    justification: c.justification,
    auditLog: c.audit_log,
    createdAt: c.created_at,
  }
}

function cppDomaineVersWire(c: CPP): CPPWire {
  return {
    id: c.id,
    clientId: c.client_id,
    parameterId: c.parameter_id,
    contexte: c.contexte,
    justification: c.justification,
    actif: c.actif,
    auditLog: c.audit_log,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }
}

function cqaDomaineVersWire(c: CQA): CQAWire {
  return {
    id: c.id,
    clientId: c.client_id,
    nom: c.nom,
    description: c.description,
    contexte: c.contexte,
    justification: c.justification,
    actif: c.actif,
    auditLog: c.audit_log,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }
}

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
 * Store `Parameter`/`ClassificationCriticiteParametre`/`CPP`/`CQA` (convergence
 * architecturale, `docs/convergence/CONVERGENCE_PLAN.md`).
 *
 * Garde-fou central : aucune fonction de ce store ne crée un `CPP` ou un
 * `CQA` à partir d'une `ClassificationCriticiteParametre` — ce sont deux
 * actes de déclaration humaine distincts et volontairement non reliés par
 * du code (`docs/convergence/GAP.md`, ligne "Parameter / CriticalParameter
 * / CPP / CQA" ; Target Architecture §10).
 *
 * **Phase 4b du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client que
 * `useMethodProfileACFCStore` (Phase 4a), aucune notion d'`owner_id`/
 * `shared_with` pour ces 4 types.
 *
 * @requirement Target Architecture §10
 */
export const useParameterStore = defineStore('parameter', () => {
  const parametres = ref<Parameter[]>([])
  const classifications = ref<ClassificationCriticiteParametre[]>([])
  const cpps = ref<CPP[]>([])
  const cqas = ref<CQA[]>([])
  const enChargement = ref(false)

  const cppsActifs = computed(() => cpps.value.filter((c) => c.actif))
  const cqasActifs = computed(() => cqas.value.filter((c) => c.actif))

  const normaliser = (texte: string) => texte.trim().toLocaleLowerCase('fr')

  /** Un CPP est défini par le couple (paramètre, contexte) : jamais deux actifs pour le même couple. */
  function cppActifExistant(parameterId: string, contexte: string): CPP | undefined {
    return cppsActifs.value.find(
      (c) => c.parameter_id === parameterId && normaliser(c.contexte) === normaliser(contexte),
    )
  }

  function cqaActifExistant(nom: string, contexte: string): CQA | undefined {
    return cqasActifs.value.find(
      (c) =>
        normaliser(c.nom) === normaliser(nom) && normaliser(c.contexte) === normaliser(contexte),
    )
  }

  /** Lève si le relais n'est pas configuré — mutations sur ces 4 types exigent désormais systématiquement le Worker/D1, même discipline que `useMethodProfileACFCStore`. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Envoie au serveur les enregistrements capturés depuis les anciennes
   * tables IndexedDB locales juste avant leur suppression — n'a d'effet
   * réel qu'une seule fois, sur le premier navigateur qui ouvre
   * l'application avec ce code (voir migration Dexie v40,
   * `persistance/db.ts`). Filtre par client avant envoi, même patron que
   * `useMethodProfileACFCStore.migrerAcfcLocalVersServeur`.
   */
  async function migrerParametersLocalVersServeur(clientId: string): Promise<void> {
    const parametresDuClient = parametersAMigrer.filter((p) => p.client_id === clientId)
    const classificationsDuClient = classificationsCriticiteParametreAMigrer.filter(
      (c) => c.client_id === clientId,
    )
    const cppsDuClient = cppsAMigrer.filter((c) => c.client_id === clientId)
    const cqasDuClient = cqasAMigrer.filter((c) => c.client_id === clientId)
    if (
      parametresDuClient.length === 0 &&
      classificationsDuClient.length === 0 &&
      cppsDuClient.length === 0 &&
      cqasDuClient.length === 0
    ) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerParametersLocal(jeton, clientId, {
      parametresProcede: parametresDuClient.map(parametreDomaineVersWire),
      classifications: classificationsDuClient.map(classificationDomaineVersWire),
      cpps: cppsDuClient.map(cppDomaineVersWire),
      cqas: cqasDuClient.map(cqaDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Parameter/CPP/CQA : ${resultat.erreur}`)
    }
    for (const p of parametresDuClient) {
      const index = parametersAMigrer.indexOf(p)
      if (index !== -1) parametersAMigrer.splice(index, 1)
    }
    for (const c of classificationsDuClient) {
      const index = classificationsCriticiteParametreAMigrer.indexOf(c)
      if (index !== -1) classificationsCriticiteParametreAMigrer.splice(index, 1)
    }
    for (const c of cppsDuClient) {
      const index = cppsAMigrer.indexOf(c)
      if (index !== -1) cppsAMigrer.splice(index, 1)
    }
    for (const c of cqasDuClient) {
      const index = cqasAMigrer.indexOf(c)
      if (index !== -1) cqasAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerParametersLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirParameters(jeton, clientId)
      if (resultat.ok) {
        parametres.value = resultat.donnees.parametresProcede.map(parametreWireVersDomaine)
        classifications.value = resultat.donnees.classifications.map(classificationWireVersDomaine)
        cpps.value = resultat.donnees.cpps.map(cppWireVersDomaine)
        cqas.value = resultat.donnees.cqas.map(cqaWireVersDomaine)
      } else {
        parametres.value = []
        classifications.value = []
        cpps.value = []
        cqas.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que `useMethodProfileACFCStore.charger`.
      parametres.value = []
      classifications.value = []
      cpps.value = []
      cqas.value = []
    } finally {
      enChargement.value = false
    }
  }

  async function creerParametre(
    clientId: string,
    input: NouveauParametreInput,
  ): Promise<Parameter> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerParametre(jeton, clientId, {
      nom: input.nom,
      description: input.description,
      unite: input.unite,
      assetNodeId: input.assetNodeId,
    })
    if (!resultat.ok) throw new Error(`Échec de la création du paramètre : ${resultat.erreur}`)
    const parametre = parametreWireVersDomaine(resultat.donnees.parametreProcede)
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
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerClassificationCriticiteParametre(jeton, clientId, {
      parameterId: input.parameterId,
      niveau: input.niveau,
      contexte: input.contexte,
      justification: input.justification,
    })
    if (!resultat.ok) throw new Error(`Échec de la classification : ${resultat.erreur}`)
    const classification = classificationWireVersDomaine(resultat.donnees.classification)
    classifications.value = [...classifications.value, classification]
    return classification
  }

  /** Déclaration humaine explicite d'un CPP — jamais dérivée d'une classification. */
  async function declarerCPP(clientId: string, input: NouveauCPPInput): Promise<CPP> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.declarerCPP(jeton, clientId, {
      parameterId: input.parameterId,
      contexte: input.contexte,
      justification: input.justification,
    })
    if (!resultat.ok) throw new Error(`Échec de la déclaration du CPP : ${resultat.erreur}`)
    const cpp = cppWireVersDomaine(resultat.donnees.cpp)
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
    const { api, jeton } = await obtenirApi()
    const resultat = await api.desactiverCPP(jeton, clientId, cppId, motif)
    if (!resultat.ok) return null
    const misAJour = cppWireVersDomaine(resultat.donnees.cpp)
    cpps.value = cpps.value.map((c) => (c.id === cppId ? misAJour : c))
    return misAJour
  }

  async function declarerCQA(clientId: string, input: NouveauCQAInput): Promise<CQA> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.declarerCQA(jeton, clientId, {
      nom: input.nom,
      description: input.description,
      contexte: input.contexte,
      justification: input.justification,
    })
    if (!resultat.ok) throw new Error(`Échec de la déclaration du CQA : ${resultat.erreur}`)
    const cqa = cqaWireVersDomaine(resultat.donnees.cqa)
    cqas.value = [...cqas.value, cqa]
    return cqa
  }

  async function desactiverCQA(
    clientId: string,
    cqaId: string,
    motif: string,
  ): Promise<CQA | null> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.desactiverCQA(jeton, clientId, cqaId, motif)
    if (!resultat.ok) return null
    const misAJour = cqaWireVersDomaine(resultat.donnees.cqa)
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
    cppActifExistant,
    cqaActifExistant,
    charger,
    creerParametre,
    classifierParametre,
    declarerCPP,
    desactiverCPP,
    declarerCQA,
    desactiverCQA,
  }
})

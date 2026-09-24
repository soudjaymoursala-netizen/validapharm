import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProcedureStepWire, ProcedureWire } from '../../connecteurs/auth/AuthApiClient'
import type { ProviderAdapter } from '../../connecteurs/ia/ProviderAdapter'
import type {
  CategorieProcedure,
  Procedure,
  ProcedureStep,
  TableauDocx,
} from '../../logique-metier/domaine/types'
import type { PropositionAvecSource } from '../../logique-metier/procedures/proposerStructureProcedureAvecRepli'
import { proposerStructureProcedureAvecRepli } from '../../logique-metier/procedures/proposerStructureProcedureAvecRepli'
import { proceduresAMigrer, procedureStepsAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

function procedureWireVersDomaine(w: ProcedureWire): Procedure {
  return {
    id: w.id,
    client_id: w.clientId,
    reference: w.reference,
    numero_version: w.numeroVersion,
    titre: w.titre,
    effective_date: w.effectiveDate,
    categorie: w.categorie as CategorieProcedure,
    source_id: w.sourceId,
    created_at: w.createdAt,
  }
}

function procedureDomaineVersWire(p: Procedure): ProcedureWire {
  return {
    id: p.id,
    clientId: p.client_id,
    reference: p.reference,
    numeroVersion: p.numero_version,
    titre: p.titre,
    effectiveDate: p.effective_date,
    categorie: p.categorie,
    sourceId: p.source_id,
    createdAt: p.created_at,
  }
}

function procedureStepWireVersDomaine(w: ProcedureStepWire): ProcedureStep {
  return {
    id: w.id,
    client_id: w.clientId,
    procedure_id: w.procedureId,
    ordre: w.ordre,
    description: w.description,
    obligatoire: w.obligatoire,
    condition: w.condition,
    responsable: w.responsable,
    created_at: w.createdAt,
  }
}

function procedureStepDomaineVersWire(e: ProcedureStep): ProcedureStepWire {
  return {
    id: e.id,
    clientId: e.client_id,
    procedureId: e.procedure_id,
    ordre: e.ordre,
    description: e.description,
    obligatoire: e.obligatoire,
    condition: e.condition,
    responsable: e.responsable,
    createdAt: e.created_at,
  }
}

export interface NouvelleProcedureInput {
  reference: string
  titre: string
  effectiveDate: string
  categorie: CategorieProcedure
  sourceId?: string | null
}

export interface NouvelleEtapeProcedureInput {
  description: string
  obligatoire: boolean
  condition?: string | null
  responsable?: string | null
}

/**
 * Store du domaine "Procedure" (convergence architecturale —
 * spec détaillée dans `docs/convergence/PHASE_20_PROCEDURAL_KNOWLEDGE_
 * SPEC.md`).
 *
 * **Garde-fou non négociable** : aucune fonction de ce store ne
 * structure automatiquement une `Procedure` depuis un texte libre — les
 * étapes sont toujours saisies par l'appelant (un humain ayant lu la
 * SOP), même discipline que `KnowledgeItem.valeur_interpretee`.
 *
 * `Procedure` est immuable une fois créée — une nouvelle révision de la
 * même `reference` crée une nouvelle `Procedure` avec un `numero_version`
 * incrémenté, jamais une mutation (répond à R-21,
 * `02-analyse-de-risque-outil.md`).
 *
 * @requirement docs/convergence/CONVERGENCE_PLAN.md
 */
export const useProcedureStore = defineStore('procedure', () => {
  const procedures = ref<Procedure[]>([])
  const procedureSteps = ref<ProcedureStep[]>([])
  const enChargement = ref(false)
  /** Dernière proposition générée — jamais persistée telle quelle, simple état d'écran en attente de confirmation humaine. */
  const derniereProposition = ref<PropositionAvecSource | null>(null)

  /** Lève si le relais n'est pas configuré — mutations exigent désormais systématiquement le Worker/D1, même discipline que les autres stores de ce chantier. */
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
   * réel qu'une seule fois (voir migration Dexie v54, `persistance/db.ts`).
   */
  async function migrerProceduresLocalVersServeur(clientId: string): Promise<void> {
    const proceduresDuClient = proceduresAMigrer.filter((p) => p.client_id === clientId)
    const etapesDuClient = procedureStepsAMigrer.filter((e) => e.client_id === clientId)
    if (proceduresDuClient.length === 0 && etapesDuClient.length === 0) {
      return
    }

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerProceduresLocal(jeton, clientId, {
      procedures: proceduresDuClient.map(procedureDomaineVersWire),
      procedureSteps: etapesDuClient.map(procedureStepDomaineVersWire),
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la migration Procedure : ${resultat.erreur}`)
    }
    for (const [tableau, duClient] of [
      [proceduresAMigrer, proceduresDuClient],
      [procedureStepsAMigrer, etapesDuClient],
    ] as const) {
      for (const entree of duClient) {
        const index = (tableau as unknown[]).indexOf(entree)
        if (index !== -1) (tableau as unknown[]).splice(index, 1)
      }
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerProceduresLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirProcedures(jeton, clientId)
      if (resultat.ok) {
        procedures.value = resultat.donnees.procedures.map(procedureWireVersDomaine)
        procedureSteps.value = resultat.donnees.procedureSteps.map(procedureStepWireVersDomaine)
      } else {
        procedures.value = []
        procedureSteps.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que les autres stores de ce chantier.
      procedures.value = []
      procedureSteps.value = []
    } finally {
      enChargement.value = false
    }
  }

  /** `numero_version` auto-incrémenté par `reference` côté serveur — voir la route Worker `gererCreerProcedure`. */
  async function creerProcedure(
    clientId: string,
    input: NouvelleProcedureInput,
  ): Promise<Procedure> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerProcedure(jeton, clientId, {
      reference: input.reference,
      titre: input.titre,
      effectiveDate: input.effectiveDate,
      categorie: input.categorie,
      sourceId: input.sourceId ?? null,
    })
    if (!resultat.ok) {
      throw new Error(`Échec de la création de la Procedure : ${resultat.erreur}`)
    }
    const procedure = procedureWireVersDomaine(resultat.donnees.procedure)
    procedures.value = [...procedures.value, procedure]
    return procedure
  }

  async function ajouterEtape(
    clientId: string,
    procedureId: string,
    input: NouvelleEtapeProcedureInput,
  ): Promise<ProcedureStep | { erreur: 'procedure_introuvable' }> {
    const { api, jeton } = await obtenirApi()
    const resultat = await api.ajouterEtapeProcedure(jeton, clientId, procedureId, {
      description: input.description,
      obligatoire: input.obligatoire,
      condition: input.condition ?? null,
      responsable: input.responsable ?? null,
    })
    if (!resultat.ok) {
      if (resultat.erreur === 'procedure_introuvable') {
        return { erreur: 'procedure_introuvable' }
      }
      throw new Error(`Échec de la création de l'étape : ${resultat.erreur}`)
    }
    const etape = procedureStepWireVersDomaine(resultat.donnees.etape)
    procedureSteps.value = [...procedureSteps.value, etape]
    return etape
  }

  function etapesDeProcedure(procedureId: string): ProcedureStep[] {
    return procedureSteps.value
      .filter((e) => e.procedure_id === procedureId)
      .sort((a, b) => a.ordre - b.ordre)
  }

  /** Filtre par catégorie (CQV/CSV/Production) — pour les vues séparant les trois familles. */
  function proceduresParCategorie(categorie: CategorieProcedure): Procedure[] {
    return procedures.value.filter((p) => p.categorie === categorie)
  }

  /** La version la plus récente (numéro le plus élevé) d'une `reference` donnée — jamais une version arbitraire. */
  function derniereVersion(reference: string): Procedure | null {
    const versions = procedures.value.filter((p) => p.reference === reference)
    if (versions.length === 0) return null
    return versions.reduce((plusRecente, p) =>
      p.numero_version > plusRecente.numero_version ? p : plusRecente,
    )
  }

  /** Numéro de la version applicable si `procedure` est une révision obsolète, sinon `null` (R-21). */
  function remplaceePar(procedure: Pick<Procedure, 'reference' | 'numero_version'>): number | null {
    const derniere = derniereVersion(procedure.reference)
    return derniere && derniere.numero_version > procedure.numero_version
      ? derniere.numero_version
      : null
  }

  /**
   * Génère une proposition de structure — parseur
   * déterministe d'abord, repli IA seulement si
   * celui-ci ne trouve strictement rien. Stockée dans `derniereProposition`
   * pour affichage, **jamais persistée** sans confirmation humaine
   * explicite via `confirmerProposition`.
   */
  async function genererProposition(
    texte: string,
    tableaux: readonly TableauDocx[],
    provider: ProviderAdapter,
  ): Promise<PropositionAvecSource> {
    const proposition = await proposerStructureProcedureAvecRepli(texte, tableaux, provider)
    derniereProposition.value = proposition
    return proposition
  }

  /** Efface la proposition en attente sans rien écrire — l'utilisateur a annulé ou changé de document. */
  function annulerProposition(): void {
    derniereProposition.value = null
  }

  /**
   * Confirme une proposition : crée la `Procedure` puis chaque étape
   * retenue, dans l'ordre fourni par l'appelant — jamais l'ordre brut de
   * la proposition (l'écran a pu réordonner/exclure des éléments avant
   * confirmation). Efface `derniereProposition` une fois la confirmation
   * réussie.
   */
  async function confirmerProposition(
    clientId: string,
    procedureInput: NouvelleProcedureInput,
    etapesRetenues: NouvelleEtapeProcedureInput[],
  ): Promise<Procedure> {
    const procedure = await creerProcedure(clientId, procedureInput)
    for (const etape of etapesRetenues) {
      await ajouterEtape(clientId, procedure.id, etape)
    }
    derniereProposition.value = null
    return procedure
  }

  return {
    procedures,
    procedureSteps,
    enChargement,
    derniereProposition,
    charger,
    creerProcedure,
    ajouterEtape,
    etapesDeProcedure,
    proceduresParCategorie,
    derniereVersion,
    remplaceePar,
    genererProposition,
    annulerProposition,
    confirmerProposition,
  }
})

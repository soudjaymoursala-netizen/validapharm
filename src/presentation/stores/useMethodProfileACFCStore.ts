import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MethodProfileACFCWire,
  EvaluationACFCWire,
} from '../../connecteurs/auth/AuthApiClient'
import type {
  EvaluationACFC,
  MethodProfileACFC,
  OrigineMethodeACFC,
  QuestionACFC,
  ReponseQuestionACFC,
} from '../../logique-metier/domaine/types'
import { evaluerVerdictACFC } from '../../logique-metier/acfc/evaluerVerdictACFC'
import { numeroVersion } from '../../logique-metier/versionnage/numeroVersion'
import { methodProfilesACFCAMigrer, evaluationsACFCAMigrer } from '../../persistance/db'
import { useAuthStore } from './useAuthStore'

export function profilAcfcWireVersDomaine(wire: MethodProfileACFCWire): MethodProfileACFC {
  return {
    id: wire.id,
    client_id: wire.clientId,
    version: wire.version,
    effective_date: wire.effectiveDate,
    source: wire.source,
    origin: wire.origin as OrigineMethodeACFC,
    questions: wire.questions,
    decision_rule: wire.decisionRule as 'au_moins_un_oui_critique',
    created_at: wire.createdAt,
  }
}

export function evaluationAcfcWireVersDomaine(wire: EvaluationACFCWire): EvaluationACFC {
  return {
    id: wire.id,
    client_id: wire.clientId,
    method_profile_id: wire.methodProfileId,
    method_profile_version: wire.methodProfileVersion,
    asset_node_id: wire.assetNodeId,
    nom_element: wire.nomElement,
    reponses: wire.reponses as Record<string, ReponseQuestionACFC>,
    verdict: wire.verdict as EvaluationACFC['verdict'],
    audit_log: wire.auditLog,
    created_at: wire.createdAt,
    updated_at: wire.updatedAt,
  }
}

function profilAcfcDomaineVersWire(p: MethodProfileACFC): MethodProfileACFCWire {
  return {
    id: p.id,
    clientId: p.client_id,
    version: p.version,
    effectiveDate: p.effective_date,
    source: p.source,
    origin: p.origin,
    questions: p.questions,
    decisionRule: p.decision_rule,
    createdAt: p.created_at,
  }
}

function evaluationAcfcDomaineVersWire(e: EvaluationACFC): EvaluationACFCWire {
  return {
    id: e.id,
    clientId: e.client_id,
    methodProfileId: e.method_profile_id,
    methodProfileVersion: e.method_profile_version,
    assetNodeId: e.asset_node_id,
    nomElement: e.nom_element,
    reponses: e.reponses,
    verdict: e.verdict,
    auditLog: e.audit_log,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

export interface NouvelleQuestionInput {
  texte: string
}

export interface NouveauProfilInput {
  questions: NouvelleQuestionInput[]
  source: string
  origin: OrigineMethodeACFC
}

export interface NouvelleEvaluationInput {
  nomElement: string
  assetNodeId: string | null
  reponses: Record<string, ReponseQuestionACFC>
}

/**
 * Store de la méthode ACFC configurable par client (remplace
 * la grille de criticité codée en dur — voir `docs/convergence/
 * TECHNICAL_DECISIONS.md`). Un `MethodProfileACFC` est immuable une
 * fois créé : toute modification des questions crée une **nouvelle
 * version**, jamais une mutation du profil existant, pour que les
 * évaluations passées restent reproductibles telles qu'elles ont été
 * produites (principe `ContextSnapshot` du package Target Architecture).
 *
 * **Phase 4a du chantier de migration D1**
 * (docs/CHANTIER-MIGRATION-D1-RECAP.md) : Cloudflare D1 devient la source
 * de vérité — mêmes routes authentifiées scopées par client que
 * `useStructureSystemeStore` (Phase 1), la logique métier (numéro de
 * version suivant, calcul du verdict) reste entièrement côté client.
 *
 * @requirement Analyse de risque
 */
export const useMethodProfileACFCStore = defineStore('methodProfileACFC', () => {
  const profils = ref<MethodProfileACFC[]>([])
  const evaluations = ref<EvaluationACFC[]>([])
  const enChargement = ref(false)

  /** Lève si le relais n'est pas configuré — mutations sur ACFC exigent désormais systématiquement le Worker/D1, même discipline que `useStructureSystemeStore`. */
  async function obtenirApi() {
    const authStore = useAuthStore()
    const api = await authStore.client()
    if (!api || !authStore.jeton) {
      throw new Error("Relais d'authentification non configuré (Configuration client).")
    }
    return { api, jeton: authStore.jeton }
  }

  /**
   * Le profil le plus récent (le seul utilisé pour de nouvelles évaluations).
   * Aucun défaut fabriqué : `null` tant que le client n'a rien configuré.
   * Tri sur le numéro de version (`vN`), jamais sur `created_at` : deux
   * versions créées dans la même milliseconde produisent le même
   * timestamp ISO, ce qui rendait le tri par date instable (bug trouvé
   * le 25/08/2026 en écrivant le test équivalent pour
   * `useImpactAssessmentStore`).
   */
  const profilActif = computed<MethodProfileACFC | null>(() => {
    if (profils.value.length === 0) return null
    return (
      [...profils.value].sort((a, b) => numeroVersion(b.version) - numeroVersion(a.version))[0] ??
      null
    )
  })

  /**
   * Envoie au serveur les `MethodProfileACFC`/`EvaluationACFC` capturés
   * depuis les anciennes tables IndexedDB locales juste avant leur
   * suppression — n'a d'effet réel qu'une seule fois, sur le premier
   * navigateur qui ouvre l'application avec ce code (voir migration Dexie
   * v39, `persistance/db.ts`). Flushe l'intégralité des deux files en un
   * seul appel groupé, même patron que
   * `useSectionsStore.migrerSectionsLocalesVersServeur`.
   */
  async function migrerAcfcLocalVersServeur(clientId: string): Promise<void> {
    const profilsDuClient = methodProfilesACFCAMigrer.filter((p) => p.client_id === clientId)
    const evaluationsDuClient = evaluationsACFCAMigrer.filter((e) => e.client_id === clientId)
    if (profilsDuClient.length === 0 && evaluationsDuClient.length === 0) return

    const { api, jeton } = await obtenirApi()
    const resultat = await api.migrerAcfcLocal(jeton, clientId, {
      profils: profilsDuClient.map(profilAcfcDomaineVersWire),
      evaluations: evaluationsDuClient.map(evaluationAcfcDomaineVersWire),
    })
    if (!resultat.ok) throw new Error(`Échec de la migration ACFC : ${resultat.erreur}`)
    for (const p of profilsDuClient) {
      const index = methodProfilesACFCAMigrer.indexOf(p)
      if (index !== -1) methodProfilesACFCAMigrer.splice(index, 1)
    }
    for (const e of evaluationsDuClient) {
      const index = evaluationsACFCAMigrer.indexOf(e)
      if (index !== -1) evaluationsACFCAMigrer.splice(index, 1)
    }
  }

  async function charger(clientId: string): Promise<void> {
    enChargement.value = true
    try {
      try {
        await migrerAcfcLocalVersServeur(clientId)
      } catch {
        // Nouvel essai au prochain chargement — ne bloque jamais l'affichage normal.
      }
      const { api, jeton } = await obtenirApi()
      const resultat = await api.obtenirAcfc(jeton, clientId)
      if (resultat.ok) {
        profils.value = resultat.donnees.profils.map(profilAcfcWireVersDomaine)
        evaluations.value = resultat.donnees.evaluations.map(evaluationAcfcWireVersDomaine)
      } else {
        profils.value = []
        evaluations.value = []
      }
    } catch {
      // Panne réseau réelle ou relais non configuré : jamais une exception
      // non gérée, même discipline que `useStructureSystemeStore.charger`.
      profils.value = []
      evaluations.value = []
    } finally {
      enChargement.value = false
    }
  }

  function prochaineVersion(): string {
    return `v${profils.value.length + 1}`
  }

  async function creerNouvelleVersion(
    clientId: string,
    input: NouveauProfilInput,
  ): Promise<MethodProfileACFC> {
    const questions: QuestionACFC[] = input.questions.map((q, index) => ({
      id: `q-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
      texte: { fr: q.texte },
    }))
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerProfilAcfc(jeton, clientId, {
      version: prochaineVersion(),
      source: input.source,
      origin: input.origin,
      questions,
      decisionRule: 'au_moins_un_oui_critique',
    })
    if (!resultat.ok) throw new Error(`Échec de la création du profil ACFC : ${resultat.erreur}`)
    const profil = profilAcfcWireVersDomaine(resultat.donnees.profil)
    profils.value = [...profils.value, profil]
    return profil
  }

  async function creerEvaluation(
    clientId: string,
    input: NouvelleEvaluationInput,
  ): Promise<EvaluationACFC | { erreur: 'aucun_profil_configure' }> {
    const profil = profilActif.value
    if (!profil) return { erreur: 'aucun_profil_configure' }

    const verdict = evaluerVerdictACFC(profil.questions, input.reponses, profil.decision_rule)
    const { api, jeton } = await obtenirApi()
    const resultat = await api.creerEvaluationAcfc(jeton, clientId, {
      methodProfileId: profil.id,
      methodProfileVersion: profil.version,
      assetNodeId: input.assetNodeId,
      nomElement: input.nomElement,
      reponses: input.reponses,
      verdict,
    })
    if (!resultat.ok)
      throw new Error(`Échec de la création de l'évaluation ACFC : ${resultat.erreur}`)
    const evaluation = evaluationAcfcWireVersDomaine(resultat.donnees.evaluation)
    evaluations.value = [...evaluations.value, evaluation]
    return evaluation
  }

  return {
    profils,
    evaluations,
    enChargement,
    profilActif,
    charger,
    creerNouvelleVersion,
    creerEvaluation,
  }
})

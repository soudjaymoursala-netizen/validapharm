import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { Client } from '../../logique-metier/domaine/types'
import { correspondPourRecherche } from '../../logique-metier/recherche/correspondPourRecherche'
import { db } from '../../persistance/db'

export type TypeResultatRecherche =
  'client' | 'section' | 'document' | 'procedure' | 'process' | 'connaissance'

export interface ResultatRecherche {
  type: TypeResultatRecherche
  id: string
  titre: string
  extrait: string
  route: RouteLocationRaw
}

function tronquer(texte: string, longueur = 140): string {
  const texteNettoye = texte.trim()
  return texteNettoye.length > longueur
    ? `${texteNettoye.slice(0, longueur).trim()}…`
    : texteNettoye
}

/**
 * Recherche transverse par sous-chaîne (jamais floue/à score, voir
 * `correspondPourRecherche`) — répond à un vide constaté : avec 25+ écrans
 * par client, retrouver une section/un document/une procédure déjà créés
 * exigeait de deviner le bon écran. Filtrage entièrement client-side,
 * cohérent avec le reste de l'application (volume par installation
 * modeste) — aucune indexation plein texte séparée.
 *
 * `rechercherClients` est globale (les clients n'appartiennent à aucun
 * autre client) ; `rechercherPourClient` est scopée à un seul client — la
 * recherche ne traverse jamais les clients au-delà de leur propre fiche,
 * cohérent avec l'isolation stricte déjà appliquée partout ailleurs
 * (`useProcessContextStore`, `useProcedureStore`, etc.).
 *
 * `rechercherClients` prend la liste déjà chargée par `useClientsStore`
 * (jamais une requête directe sur `db.clients`) : depuis la Phase 39, les
 * clients vivent dans le Worker/D1, `db.clients` (IndexedDB) est un
 * schéma mort — l'interroger directement ne trouverait jamais rien.
 */
export const useRechercheGlobaleStore = defineStore('rechercheGlobale', () => {
  const enRecherche = ref(false)

  function rechercherClients(clients: readonly Client[], requete: string): ResultatRecherche[] {
    if (requete.trim().length === 0) return []
    return clients
      .filter((c) => c.statut === 'actif' && correspondPourRecherche(requete, c.name))
      .map((c) => ({
        type: 'client' as const,
        id: c.id,
        titre: c.name,
        extrait: c.secteur ?? '',
        route: { name: 'fiche-client', params: { clientId: c.id } },
      }))
  }

  async function rechercherPourClient(
    clientId: string,
    requete: string,
  ): Promise<ResultatRecherche[]> {
    if (requete.trim().length === 0) return []
    enRecherche.value = true
    try {
      const [projetsDuClient, procedures, processes, knowledgeItems] = await Promise.all([
        db.projects.where('client_id').equals(clientId).toArray(),
        db.procedures.where('client_id').equals(clientId).toArray(),
        db.processes.where('client_id').equals(clientId).toArray(),
        db.knowledgeItems.where('client_id').equals(clientId).toArray(),
      ])
      const idsProjets = projetsDuClient.map((p) => p.id)
      const [sections, documents] =
        idsProjets.length > 0
          ? await Promise.all([
              db.sections.where('project_id').anyOf(idsProjets).toArray(),
              db.projectDocuments.where('project_id').anyOf(idsProjets).toArray(),
            ])
          : [[], []]

      const nomProjet = (projectId: string) =>
        projetsDuClient.find((p) => p.id === projectId)?.name ?? projectId

      const resultatsSections: ResultatRecherche[] = sections
        .filter((s) => correspondPourRecherche(requete, s.meta.titre, s.meta.ref))
        .map((s) => ({
          type: 'section' as const,
          id: s.id,
          titre: s.meta.titre,
          extrait: `Projet « ${nomProjet(s.project_id)} » — ${s.template_type}`,
          route: { name: 'editeur-section', params: { projectId: s.project_id, sectionId: s.id } },
        }))

      const resultatsDocuments: ResultatRecherche[] = documents
        .filter((d) => correspondPourRecherche(requete, d.filename))
        .map((d) => ({
          type: 'document' as const,
          id: d.id,
          titre: d.filename,
          extrait: `Projet « ${nomProjet(d.project_id)} »`,
          route: { name: 'fiche-projet', params: { projectId: d.project_id } },
        }))

      const resultatsProcedures: ResultatRecherche[] = procedures
        .filter((p) => correspondPourRecherche(requete, p.reference, p.titre))
        .map((p) => ({
          type: 'procedure' as const,
          id: p.id,
          titre: `${p.reference} — ${p.titre}`,
          extrait: `[${p.categorie}] v${p.numero_version}`,
          route: { name: 'revue-structure-procedure', params: { clientId } },
        }))

      const resultatsProcess: ResultatRecherche[] = processes
        .filter((p) => correspondPourRecherche(requete, p.nom, p.description))
        .map((p) => ({
          type: 'process' as const,
          id: p.id,
          titre: p.nom,
          extrait: tronquer(p.description),
          route: { name: 'gestion-process', params: { clientId } },
        }))

      const resultatsConnaissance: ResultatRecherche[] = knowledgeItems
        .filter((k) => correspondPourRecherche(requete, k.libelle, k.valeur_interpretee))
        .map((k) => ({
          type: 'connaissance' as const,
          id: k.id,
          titre: k.libelle,
          extrait: tronquer(k.valeur_interpretee),
          route: { name: 'source-intelligence', params: { clientId } },
        }))

      return [
        ...resultatsSections,
        ...resultatsDocuments,
        ...resultatsProcedures,
        ...resultatsProcess,
        ...resultatsConnaissance,
      ]
    } finally {
      enRecherche.value = false
    }
  }

  return { enRecherche, rechercherClients, rechercherPourClient }
})

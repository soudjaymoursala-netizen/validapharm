import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import type { Client } from '../../logique-metier/domaine/types'
import { db } from '../../persistance/db'
import { useProcedureStore } from './useProcedureStore'
import { useProcessContextStore } from './useProcessContextStore'
import { useProjectsStore } from './useProjectsStore'
import { useRechercheGlobaleStore } from './useRechercheGlobaleStore'
import { useSectionsStore } from './useSectionsStore'
import { useSourceIntelligenceStore } from './useSourceIntelligenceStore'

beforeEach(async () => {
  setActivePinia(createPinia())
  await db.projects.clear()
  await db.sections.clear()
  await db.projectDocuments.clear()
  await db.processes.clear()
  await db.procedures.clear()
  await db.knowledgeItems.clear()
})

function clientDeTest(nom: string, statut: 'actif' | 'archive' = 'actif'): Client {
  return {
    id: crypto.randomUUID(),
    name: nom,
    adresse: null,
    secteur: null,
    details: null,
    statut,
    archived_at: null,
    archived_by: null,
    created_by_user_id: 'admin@pharmatech.example',
    shared_with: [],
    audit_log: [],
    created_at: new Date().toISOString(),
  }
}

describe('useRechercheGlobaleStore — rechercherClients', () => {
  test('filtre par nom, insensible à la casse, exclut les clients archivés', () => {
    const store = useRechercheGlobaleStore()
    const clients = [
      clientDeTest('PharmaTech Solutions'),
      clientDeTest('Autre Site'),
      clientDeTest('Pharmatech Archivé', 'archive'),
    ]

    const resultats = store.rechercherClients(clients, 'pharmatech')
    expect(resultats.map((r) => r.titre)).toEqual(['PharmaTech Solutions'])
  })

  test('requête vide ne retourne jamais tous les clients par accident', () => {
    const store = useRechercheGlobaleStore()
    expect(store.rechercherClients([clientDeTest('X')], '')).toEqual([])
  })
})

describe('useRechercheGlobaleStore — rechercherPourClient (tâche #116)', () => {
  test('trouve sections, documents, procédures, process et connaissances du bon client uniquement', async () => {
    const clientId = 'client-1'
    const autreClientId = 'client-2'

    const projetsStore = useProjectsStore()
    const sectionsStore = useSectionsStore()
    const projet = await projetsStore.creerProjet({
      name: 'Qualification presse P-200',
      context: '',
      scope_in: '',
      scope_out: '',
      deadline: null,
      language_default: 'fr',
      client_id: clientId,
    })
    await sectionsStore.creerSection({
      project_id: projet.id,
      template_type: 'oq',
      language: 'fr',
      titre: 'OQ presse P-200',
      owner_id: 'admin@pharmatech.example',
    })

    const processStore = useProcessContextStore()
    await processStore.creerProcess(clientId, {
      nom: 'Compression rotative',
      description: '',
      type: 'manufacturing',
    })
    await processStore.creerProcess(autreClientId, {
      nom: 'Compression autre client',
      description: '',
      type: 'manufacturing',
    })

    const procedureStore = useProcedureStore()
    await procedureStore.creerProcedure(clientId, {
      reference: 'PQ-COMPRESSION',
      titre: 'Protocole de qualification presse',
      effectiveDate: '2026-01-01',
      categorie: 'cqv',
    })

    const sourceStore = useSourceIntelligenceStore()
    const source = await sourceStore.creerSource(clientId, { type: 'document', titre: 'Manuel' })
    const version = await sourceStore.creerSourceVersion(clientId, source.id)
    if ('erreur' in version) throw version
    const extraction = await sourceStore.enregistrerExtraction(clientId, version.id, {
      methode: 'saisie_manuelle',
    })
    if ('erreur' in extraction) throw extraction
    const item = await sourceStore.ajouterExtractionItem(clientId, extraction.id, {
      contenu: 'contenu',
      position: 1,
    })
    if ('erreur' in item) throw item
    await sourceStore.creerKnowledgeItem(clientId, item.id, {
      libelle: 'Pression maximale presse',
      valeurInterpretee: '200 bars',
    })

    const rechercheStore = useRechercheGlobaleStore()
    const resultats = await rechercheStore.rechercherPourClient(clientId, 'presse')

    const types = resultats.map((r) => r.type).sort()
    expect(types).toEqual(['connaissance', 'procedure', 'section'])
    expect(resultats.find((r) => r.type === 'section')?.titre).toBe('OQ presse P-200')
    expect(resultats.find((r) => r.type === 'procedure')?.titre).toContain('PQ-COMPRESSION')
    expect(resultats.find((r) => r.type === 'connaissance')?.titre).toBe('Pression maximale presse')

    // Isolation stricte : le process de l'autre client n'apparaît jamais.
    const resultatsCompression = await rechercheStore.rechercherPourClient(clientId, 'compression')
    expect(resultatsCompression.every((r) => r.titre !== 'Compression autre client')).toBe(true)
  })

  test("requête vide ou client sans données ne renvoie jamais d'erreur", async () => {
    const rechercheStore = useRechercheGlobaleStore()
    expect(await rechercheStore.rechercherPourClient('client-vide', '')).toEqual([])
    expect(await rechercheStore.rechercherPourClient('client-inconnu', 'x')).toEqual([])
  })
})

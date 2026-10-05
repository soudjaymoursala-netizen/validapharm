<script setup lang="ts">
// Assistant de stratégie de qualification —
// module par client ; l'accès depuis une section Change
// Control en cours de rédaction reste hors périmètre de
// cet incrément — `change_control` n'existe pas encore comme
// `TemplateType` dans ce projet. Aucune génération IA ici :
// différée avec le reste du routage par mode (tâches #28/#29).
//
// Section 1 (ACFC) réécrite le 25/08/2026 : remplace la
// grille de criticité codée en dur par une méthode ACFC configurable par
// client (`useMethodProfileACFCStore`). Aucune question n'est
// fabriquée par défaut : tant qu'un client n'a rien configuré, l'écran le
// dit explicitement plutôt que de proposer une grille inventée.
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useClientsStore } from '../stores/useClientsStore'
import { useMethodProfileACFCStore } from '../stores/useMethodProfileACFCStore'
import { useStructureSystemeStore } from '../stores/useStructureSystemeStore'
import type { OrigineMethodeACFC, ReponseQuestionACFC } from '../../logique-metier/domaine/types'
import {
  evaluerVerdictACFC,
  methodeCompletementRepondue,
} from '../../logique-metier/acfc/evaluerVerdictACFC'
import {
  determinerConclusion,
  LIBELLES_CONCLUSION,
  VERSION_GRILLE_STRATEGIE_QUALIFICATION,
  type NiveauComplexite,
} from '../../logique-metier/strategie-qualification/grilleDecision'
import { libelleVerdictAcfc, tonVerdictAcfc } from '../i18n/libellesVerdictQuestionnaire'
import { formaterDateFr } from '../i18n/formaterDate'
import BadgeVerdict from '../composants/BadgeVerdict.vue'
import { useEnvoiUnique } from '../composables/useEnvoiUnique'

const props = defineProps<{ clientId: string }>()

const clientsStore = useClientsStore()
const methodeStore = useMethodProfileACFCStore()
const structureStore = useStructureSystemeStore()

// Un seul envoi à la fois (audit d'intégrité M2 : deux clics créaient deux
// enregistrements) et refus du serveur affichés (M1).
const { enCours: envoiEnCours, executer } = useEnvoiUnique()
const erreurEnvoi = ref<string | null>(null)

async function envoyer(action: () => Promise<unknown>): Promise<void> {
  erreurEnvoi.value = null
  try {
    await executer(action)
  } catch (e) {
    erreurEnvoi.value = e instanceof Error ? e.message : String(e)
  }
}

const route = useRoute()
const nomClient = ref<string | null>(null)
const formulaireConfigOuvert = ref(false)
const enChargement = ref(true)

onMounted(async () => {
  try {
    const client = await clientsStore.obtenirClient(props.clientId)
    nomClient.value = client?.name ?? null
    await methodeStore.charger(props.clientId)
    await structureStore.charger(props.clientId)
    if (!methodeStore.profilActif) formulaireConfigOuvert.value = true
    // Arrivée depuis l'Impact Assessment ou le Dossier vivant (constat 17) :
    // système et nœud préremplis, jamais ressaisis.
    if (typeof route.query.element === 'string') nomElement.value = route.query.element
    if (
      typeof route.query.noeud === 'string' &&
      structureStore.noeuds.some((n) => n.id === route.query.noeud)
    ) {
      assetNodeIdSelectionne.value = route.query.noeud
    }
  } finally {
    enChargement.value = false
  }
})

// --- Configuration de la méthode (création d'une nouvelle version) ---
const brouillonQuestions = reactive<string[]>(['', ''])
const brouillonSource = ref('')
const brouillonOrigin = ref<OrigineMethodeACFC>('defini_utilisateur')

function ajouterLigneQuestion(): void {
  brouillonQuestions.push('')
}
function retirerLigneQuestion(index: number): void {
  if (brouillonQuestions.length > 1) brouillonQuestions.splice(index, 1)
}

/**
 * Import d'une liste de questions depuis un fichier texte (une question
 * par ligne) — remplace le remplissage manuel ligne par ligne, jamais un
 * envoi direct : le résultat reste dans les mêmes champs éditables,
 * relu et corrigible avant "Enregistrer cette version" (même discipline
 * que le reste de l'écran : aucune question n'est jamais fabriquée,
 * seulement reprise mot pour mot de ce que l'utilisateur a fourni).
 */
async function importerQuestionsTexte(
  ...args: Parameters<typeof importerQuestionsTexteSansGarde>
): Promise<void> {
  await envoyer(() => importerQuestionsTexteSansGarde(...args))
}

async function importerQuestionsTexteSansGarde(evenement: Event): Promise<void> {
  const fichier = (evenement.target as HTMLInputElement).files?.[0]
  if (!fichier) return
  ;(evenement.target as HTMLInputElement).value = ''

  const texte = await fichier.text()
  const lignes = texte
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.length > 0)
  if (lignes.length === 0) return
  brouillonQuestions.splice(0, brouillonQuestions.length, ...lignes)
}

async function enregistrerNouvelleVersion(
  ...args: Parameters<typeof enregistrerNouvelleVersionSansGarde>
): Promise<void> {
  await envoyer(() => enregistrerNouvelleVersionSansGarde(...args))
}

/** Refus de la configuration expliqué (constat 20 : rien ne s'affichait sans question). */
const erreurConfig = ref<string | null>(null)

/**
 * Nouvelle version préremplie avec la version active (constat 8 : tout
 * était à ressaisir pour corriger une coquille, au risque de s'écarter du
 * « mot pour mot »).
 */
function ouvrirNouvelleVersion(): void {
  const actif = methodeStore.profilActif
  if (actif) {
    brouillonQuestions.splice(
      0,
      brouillonQuestions.length,
      ...actif.questions.map((q) => q.texte.fr ?? ''),
    )
    brouillonSource.value = actif.source
    brouillonOrigin.value = actif.origin
  }
  erreurConfig.value = null
  formulaireConfigOuvert.value = true
}

const LIBELLES_ORIGINE: Record<OrigineMethodeACFC, string> = {
  procedure_client: 'Procédure client',
  defini_utilisateur: "Défini avec l'utilisateur",
  baseline_validapharm: 'Baseline ValidaPharm',
}

/** Versions de la méthode, de la plus récente à la plus ancienne. */
const versionsMethode = computed(() =>
  [...methodeStore.profils].sort((a, b) => b.created_at.localeCompare(a.created_at)),
)

async function enregistrerNouvelleVersionSansGarde(): Promise<void> {
  const questions = brouillonQuestions
    .map((texte) => texte.trim())
    .filter((texte) => texte.length > 0)
    .map((texte) => ({ texte }))
  erreurConfig.value = null
  if (brouillonSource.value.trim().length === 0) {
    erreurConfig.value = 'Indiquez la source de la méthode (procédure, réunion…).'
    return
  }
  if (questions.length === 0) {
    erreurConfig.value = 'Saisissez au moins une question.'
    return
  }

  await methodeStore.creerNouvelleVersion(props.clientId, {
    questions,
    source: brouillonSource.value.trim(),
    origin: brouillonOrigin.value,
  })
  brouillonQuestions.splice(0, brouillonQuestions.length, '', '')
  brouillonSource.value = ''
  formulaireConfigOuvert.value = false
  // Les réponses visaient les questions de la version précédente.
  for (const cle of Object.keys(reponses)) Reflect.deleteProperty(reponses, cle)
}

// --- Évaluation ACFC contre la méthode active ---
const nomElement = ref('')
// Nœud Structure Système évalué (optionnel) — trouvé manquant en simulant un
// vrai parcours de qualification (`assetNodeId` existait dans le store
// depuis l'origine de l'écran, sans jamais être exposé).
const assetNodeIdSelectionne = ref('')
const reponses = reactive<Record<string, ReponseQuestionACFC>>({})
const evaluationEnregistree = ref(false)
const LIBELLES_REPONSE: Record<ReponseQuestionACFC, string> = {
  oui: 'Oui',
  non: 'Non',
  inconnu: 'Inconnu',
  sans_objet: 'Sans objet',
}
const erreurEvaluation = ref<string | null>(null)

const complet = computed(() =>
  methodeStore.profilActif
    ? methodeCompletementRepondue(methodeStore.profilActif.questions, reponses)
    : false,
)

const verdict = computed(() => {
  if (!methodeStore.profilActif || !complet.value) return null
  return evaluerVerdictACFC(
    methodeStore.profilActif.questions,
    reponses,
    methodeStore.profilActif.decision_rule,
  )
})

async function enregistrerEvaluation(
  ...args: Parameters<typeof enregistrerEvaluationSansGarde>
): Promise<void> {
  await envoyer(() => enregistrerEvaluationSansGarde(...args))
}

/** Ce qui manque encore pour enregistrer, dit en clair (constat 20). */
const manquants = computed(() => {
  const liste: string[] = []
  if (nomElement.value.trim().length === 0) liste.push('le composant ou la fonction évalué')
  if (!complet.value) liste.push('une réponse à chaque question')
  if (verdict.value && complexite.value === null) liste.push('la complexité (étape 2)')
  return liste
})

async function enregistrerEvaluationSansGarde(): Promise<void> {
  if (manquants.value.length > 0) return
  erreurEvaluation.value = null
  const resultat = await methodeStore.creerEvaluation(props.clientId, {
    nomElement: nomElement.value.trim(),
    assetNodeId: assetNodeIdSelectionne.value || null,
    reponses: { ...reponses },
    // La conclusion (complexité × verdict) est enregistrée avec l'évaluation
    // (constat 3 : elle était affichée puis perdue).
    complexite: verdict.value ? complexite.value : null,
  })
  if ('erreur' in resultat) {
    erreurEvaluation.value =
      "Impossible d'enregistrer l'évaluation — aucune méthode ACFC n'est configurée pour ce client."
    return
  }
  evaluationEnregistree.value = true
}

function nouvelleEvaluation(): void {
  nomElement.value = ''
  assetNodeIdSelectionne.value = ''
  for (const cle of Object.keys(reponses)) Reflect.deleteProperty(reponses, cle)
  complexite.value = null
  evaluationEnregistree.value = false
}

// --- Complexité + conclusion (inchangé dans son principe) ---
const complexite = ref<NiveauComplexite | null>(null)

const conclusion = computed(() =>
  verdict.value ? determinerConclusion(verdict.value, complexite.value) : null,
)

/** Évaluations enregistrées, des plus récentes aux plus anciennes (constat 4). */
const historique = computed(() =>
  [...methodeStore.evaluations]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => ({
      ...e,
      noeud: structureStore.noeuds.find((n) => n.id === e.asset_node_id) ?? null,
    })),
)

function libelleConclusion(code: string | null): string {
  if (!code) return '—'
  return LIBELLES_CONCLUSION[code as keyof typeof LIBELLES_CONCLUSION] ?? code
}

function recharger(): void {
  window.location.reload()
}
</script>

<template>
  <main class="assistant-strategie">
    <RouterLink
      :to="{ name: 'fiche-client', params: { clientId: props.clientId } }"
      class="lien-retour"
    >
      {{ nomClient ?? 'Fiche client' }}
    </RouterLink>
    <h1>Stratégie de qualification — {{ nomClient ?? props.clientId }}</h1>
    <p v-if="erreurEnvoi" class="bandeau-erreur" role="alert">{{ erreurEnvoi }}</p>
    <p class="bandeau-disclaimer">Aide à la décision, non une décision de qualification.</p>

    <p v-if="enChargement" class="etat-vide">Chargement…</p>
    <p v-else-if="methodeStore.chargementEchoue" class="bandeau-erreur" role="alert">
      Impossible de charger les méthodes ACFC de ce client (serveur injoignable ou session expirée)
      : rien n'est perdu, mais n'en créez pas de nouvelle avant d'avoir rechargé la page.
      <button type="button" @click="recharger">Recharger</button>
    </p>
    <template v-else>
      <section v-if="!methodeStore.profilActif || formulaireConfigOuvert" class="bloc-config">
        <h2>Configuration de la méthode ACFC</h2>
        <p v-if="!methodeStore.profilActif" class="rappel" role="alert">
          Aucune méthode ACFC n'est configurée pour ce client. Aucune question n'est proposée par
          défaut — saisissez les questions réelles de la procédure du client, mot pour mot.
        </p>
        <form class="formulaire" @submit.prevent="enregistrerNouvelleVersion">
          <p v-if="methodeStore.profilActif" class="rappel">
            Prérempli avec la version {{ methodeStore.profilActif.version }} : corrigez ce qui doit
            l'être. La version actuelle reste conservée telle quelle.
          </p>
          <label
            >Source (ex. "Procédure interne QD-00098219", "Défini avec le client le ...")
            <input v-model="brouillonSource" type="text" required />
          </label>
          <label>
            Origine
            <select v-model="brouillonOrigin">
              <option value="procedure_client">Procédure client</option>
              <option value="defini_utilisateur">Défini avec l'utilisateur</option>
              <option value="baseline_validapharm">Baseline ValidaPharm</option>
            </select>
          </label>
          <fieldset class="questions-config">
            <legend>Questions (une par ligne, mot pour mot)</legend>
            <div class="choix-demarrage">
              <label class="bouton-fichier">
                Importer un fichier texte (une question par ligne)
                <input type="file" accept="text/plain,.txt" @change="importerQuestionsTexte" />
              </label>
              <span class="choix-demarrage__ou">ou saisissez-les manuellement ci-dessous</span>
            </div>
            <div
              v-for="(_, index) in brouillonQuestions"
              :key="index"
              class="ligne-question-config"
            >
              <input
                v-model="brouillonQuestions[index]"
                type="text"
                :placeholder="`Question ${index + 1}`"
              />
              <button
                type="button"
                :disabled="brouillonQuestions.length <= 1"
                @click="retirerLigneQuestion(index)"
              >
                Retirer
              </button>
            </div>
            <button type="button" @click="ajouterLigneQuestion">+ Ajouter une question</button>
          </fieldset>
          <p v-if="erreurConfig" class="bandeau-erreur" role="alert">{{ erreurConfig }}</p>
          <div class="actions">
            <button
              v-if="methodeStore.profilActif"
              type="button"
              @click="formulaireConfigOuvert = false"
            >
              Annuler
            </button>
            <button type="submit" :disabled="envoiEnCours">Enregistrer cette version</button>
          </div>
        </form>
      </section>

      <template v-else>
        <details class="methode-active">
          <summary>
            Méthode {{ methodeStore.profilActif.version }} — source :
            {{ methodeStore.profilActif.source }}
          </summary>
          <dl>
            <dt>Origine</dt>
            <dd>{{ LIBELLES_ORIGINE[methodeStore.profilActif.origin] }}</dd>
            <dt>En vigueur depuis</dt>
            <dd>{{ formaterDateFr(methodeStore.profilActif.effective_date) }}</dd>
          </dl>
          <ol class="questions-methode">
            <li v-for="q in methodeStore.profilActif.questions" :key="q.id">{{ q.texte.fr }}</li>
          </ol>
          <template v-if="versionsMethode.length > 1">
            <p class="rappel">Versions précédentes (conservées, jamais modifiées) :</p>
            <ul class="versions-precedentes">
              <li v-for="v in versionsMethode.slice(1)" :key="v.id">
                {{ v.version }} — {{ v.source }} ({{ formaterDateFr(v.effective_date) }},
                {{ v.questions.length }} question{{ v.questions.length > 1 ? 's' : '' }})
              </li>
            </ul>
          </template>
          <button type="button" class="lien-config" @click="ouvrirNouvelleVersion">
            Corriger ou compléter : nouvelle version préremplie
          </button>
        </details>

        <section class="bloc-criticite">
          <h2>1. Criticité (ACFC)</h2>
          <label class="nom-element">
            Composant/fonction évalué
            <input
              v-model="nomElement"
              type="text"
              required
              placeholder="ex. Vanne de régulation V-101"
            />
          </label>
          <label class="nom-element">
            Nœud Structure Système (optionnel)
            <select v-model="assetNodeIdSelectionne">
              <option value="">— aucun —</option>
              <option v-for="noeud in structureStore.noeuds" :key="noeud.id" :value="noeud.id">
                {{ noeud.name }} ({{ noeud.code }})
              </option>
            </select>
          </label>
          <ul class="liste-questions">
            <li v-for="question in methodeStore.profilActif.questions" :key="question.id">
              <!-- Figé une fois l'évaluation enregistrée : le verdict affiché
                   doit toujours être celui enregistré (audit UX du 26/09/2026). -->
              <fieldset class="reponses-question">
                <legend class="texte-question">{{ question.texte.fr }}</legend>
                <label v-for="opt in ['oui', 'non', 'inconnu', 'sans_objet'] as const" :key="opt">
                  <input
                    v-model="reponses[question.id]"
                    type="radio"
                    :name="`acfc-${question.id}`"
                    :value="opt"
                    :disabled="evaluationEnregistree"
                  />
                  {{ LIBELLES_REPONSE[opt] }}
                </label>
              </fieldset>
            </li>
          </ul>
          <p v-if="complet" class="resultat-partiel" role="status">
            Verdict ACFC :
            <BadgeVerdict :ton="tonVerdictAcfc(verdict)" :texte="libelleVerdictAcfc(verdict)" />
          </p>
          <p v-if="complet && verdict === null" class="rappel">
            Aucune réponse « Oui » et au moins une réponse « Inconnu » : pas de verdict, donc pas de
            stratégie de qualification tant que l'inconnu n'est pas levé. L'évaluation peut être
            enregistrée « à compléter ».
          </p>
        </section>

        <section v-if="verdict" class="bloc-complexite">
          <h2>2. Complexité</h2>
          <fieldset class="reponses-question">
            <legend class="rappel">Le système est-il standard ou fait à façon ?</legend>
            <label>
              <input
                v-model="complexite"
                type="radio"
                name="complexite"
                value="catalogue"
                :disabled="evaluationEnregistree"
              />
              Catalogue — système sans adaptation particulière du fournisseur
            </label>
            <label>
              <input
                v-model="complexite"
                type="radio"
                name="complexite"
                value="specifique"
                :disabled="evaluationEnregistree"
              />
              Spécifique — système fait à façon ou hautement configuré
            </label>
          </fieldset>
        </section>

        <section v-if="conclusion" class="bloc-conclusion">
          <h2>Conclusion</h2>
          <p class="conclusion" role="status">{{ LIBELLES_CONCLUSION[conclusion] }}</p>
          <p class="version-grille">
            Version de la table de décision : {{ VERSION_GRILLE_STRATEGIE_QUALIFICATION }}
          </p>
        </section>

        <!-- Enregistrement après la complexité : la conclusion part avec
             l'évaluation (constat 3). -->
        <section v-if="complet" class="bloc-enregistrement">
          <template v-if="!evaluationEnregistree">
            <button
              type="button"
              :disabled="envoiEnCours || manquants.length > 0"
              @click="enregistrerEvaluation"
            >
              Enregistrer cette évaluation
            </button>
            <p v-if="manquants.length > 0" class="rappel">
              Pour enregistrer, il manque : {{ manquants.join(', ') }}.
            </p>
          </template>
          <template v-else>
            <p class="confirmation" role="status">
              Évaluation enregistrée{{ conclusion ? ', avec sa conclusion' : '' }}.
            </p>
            <p v-if="verdict === 'critique'" class="etape-suivante">
              Étape suivante :
              <RouterLink
                :to="{
                  name: 'risk-assessment-amdec',
                  params: { clientId: props.clientId },
                  query: assetNodeIdSelectionne ? { noeud: assetNodeIdSelectionne } : {},
                }"
              >
                analyser les risques (AMDEC) de ce système
              </RouterLink>
            </p>
            <button type="button" @click="nouvelleEvaluation">Nouvelle évaluation</button>
          </template>
          <p v-if="erreurEvaluation" class="bandeau-erreur" role="alert">{{ erreurEvaluation }}</p>
        </section>

        <section class="historique-acfc">
          <h2>Évaluations enregistrées</h2>
          <p v-if="historique.length === 0" class="etat-vide">
            Aucune évaluation ACFC pour ce client pour l'instant.
          </p>
          <div v-else class="table-defilante">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Élément</th>
                  <th scope="col">Nœud</th>
                  <th scope="col">Méthode</th>
                  <th scope="col">Verdict</th>
                  <th scope="col">Conclusion</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in historique" :key="e.id">
                  <td>{{ formaterDateFr(e.created_at) }}</td>
                  <td>{{ e.nom_element }}</td>
                  <td>
                    <RouterLink
                      v-if="e.noeud"
                      :to="{
                        name: 'dossier-vivant-actif',
                        params: { clientId: props.clientId, noeudId: e.noeud.id },
                      }"
                    >
                      {{ e.noeud.name }}
                    </RouterLink>
                    <template v-else>—</template>
                  </td>
                  <td>{{ e.method_profile_version }}</td>
                  <td>
                    <BadgeVerdict
                      :ton="tonVerdictAcfc(e.verdict)"
                      :texte="libelleVerdictAcfc(e.verdict)"
                    />
                  </td>
                  <td>{{ libelleConclusion(e.conclusion) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>
  </main>
</template>

<style scoped>
.assistant-strategie {
  padding: 2rem;
  font-family: var(--vp-police);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 52rem;
}

.bandeau-disclaimer {
  font-style: italic;
  color: var(--vp-texte-secondaire);
  margin: 0;
}

.rappel {
  color: var(--vp-texte-secondaire);
  font-size: 0.9em;
}

.etat-vide {
  color: var(--vp-texte-secondaire);
}

.bandeau-erreur {
  color: var(--vp-danger);
  font-size: 0.9em;
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.formulaire label,
.nom-element {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input[type='text'],
select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

.questions-config {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ligne-question-config {
  display: flex;
  gap: 0.5rem;
}

.ligne-question-config input {
  flex: 1;
}

.choix-demarrage {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.choix-demarrage__ou {
  font-size: 0.82rem;
  color: var(--vp-texte-secondaire);
  font-style: italic;
}

.bouton-fichier {
  position: relative;
  overflow: hidden;
  background-color: var(--vp-fond-carte, transparent);
  color: var(--vp-texte-principal);
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.bouton-fichier:hover {
  border-color: var(--vp-marque);
  color: var(--vp-marque);
}

.bouton-fichier input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

button {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lien-config {
  background: none;
  color: var(--vp-marque);
  padding: 0;
  text-decoration: underline;
  align-self: flex-start;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.liste-questions {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.liste-questions li {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem;
}

.texte-question {
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.reponses-question {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.reponses-question label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  text-transform: capitalize;
}

.bloc-complexite {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bloc-complexite label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bloc-conclusion {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 1rem;
}

.conclusion {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-marque);
}

.resultat-partiel {
  font-weight: 600;
}

.confirmation {
  color: var(--vp-marque);
  font-weight: 600;
}

.version-grille {
  color: var(--vp-texte-secondaire);
  font-size: 0.85em;
}
.methode-active {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.75rem 1rem;
}

.methode-active summary {
  cursor: pointer;
  font-weight: var(--vp-poids-semibold);
}

.methode-active dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.25rem 1rem;
}

.methode-active dd {
  margin: 0;
}

.historique-acfc h2,
.bloc-enregistrement h2 {
  font-size: 1.05rem;
}

.table-defilante {
  overflow-x: auto;
}

.table-defilante table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9rem;
}

.table-defilante th,
.table-defilante td {
  border-bottom: 1px solid var(--vp-bordure);
  padding: 0.4rem 0.5rem;
  text-align: left;
  vertical-align: top;
}

.reponses-question {
  border: 0;
  padding: 0;
  margin: 0;
}

.reponses-question legend {
  padding: 0;
  margin-bottom: 0.35rem;
}
</style>

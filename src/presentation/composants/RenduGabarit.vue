<script setup lang="ts">
// Moteur de rendu générique de gabarit — ce composant ne connaît
// QUE le schéma déclaratif (`DefinitionGabarit`) : ajouter un gabarit ne
// nécessite jamais de le modifier, seulement un nouveau fichier dans
// logique-metier/gabarits/catalogue/ (règle de conception).
import { reactive, toRaw } from 'vue'
import { evaluerColonneCalculee } from '../../logique-metier/gabarits/evaluerColonneCalculee'
import type {
  ChampNombre,
  ColonneTableau,
  DefinitionChamp,
  DefinitionGabarit,
} from '../../logique-metier/gabarits/definitionGabarit'
import { validerChamp } from '../../logique-metier/gabarits/validerChamp'
import type { Langue } from '../../logique-metier/domaine/types'

type ValeurCellule = string | number | null
type Ligne = Record<string, ValeurCellule>

const props = withDefaults(
  defineProps<{
    definition: DefinitionGabarit
    values: Record<string, ValeurCellule>
    tables: Record<string, Ligne[]>
    langue: Langue
    verrouille: boolean
    /**
     * Champs (`field_key`) à signaler visuellement comme donnée
     * technique/numérique reprise ou adaptée depuis un document de
     * référence (§4.1bis) — surlignage distinct,
     * jamais fusionné avec l'affichage normal d'un champ.
     */
    champsSignales?: readonly string[]
  }>(),
  { champsSignales: () => [] },
)

const emit = defineEmits<{
  'maj-valeurs': [valeurs: Record<string, ValeurCellule>]
  'maj-table': [cleTable: string, lignes: Ligne[]]
}>()

const erreurs = reactive<Record<string, string | undefined>>({})

/**
 * État local, seule source de vérité pour le rendu **pendant** l'édition —
 * initialisé une fois depuis les props (composant recréé à chaque section
 * grâce à `:key="section.id"` côté EditeurSection.vue), jamais resynchronisé
 * depuis `props` ensuite.
 *
 * Correction d'un bug réel trouvé en navigateur (pas seulement en test
 * unitaire) : construire chaque émission à partir de `props.values`/
 * `props.tables` directement faisait courir une race — deux champs (ou
 * deux cellules d'un même tableau) modifiés rapidement l'un après l'autre,
 * avant que l'aller-retour de sauvegarde du premier n'ait mis à jour les
 * props, faisaient chacun leur fusion depuis le même instantané non à
 * jour : le second écrasait silencieusement le premier. Une copie locale
 * mutée de façon synchrone à chaque saisie élimine la fenêtre de course.
 */
const valeursLocales = reactive<Record<string, ValeurCellule>>({ ...props.values })
const tablesLocales = reactive<Record<string, Ligne[]>>(
  Object.fromEntries(
    Object.entries(props.tables).map(([cle, lignes]) => [
      cle,
      lignes.map((ligne) => ({ ...ligne })),
    ]),
  ),
)

function libelle(labels: Record<Langue, string>): string {
  return labels[props.langue] ?? labels.fr
}

function estSignale(cleChamp: string): boolean {
  return props.champsSignales.includes(cleChamp)
}

function valeurChamp(cleChamp: string): ValeurCellule {
  return valeursLocales[cleChamp] ?? null
}

function saisirChamp(champ: DefinitionChamp, brut: string): void {
  if (champ.type === 'tableau_dynamique') return
  const valeur: ValeurCellule = champ.type === 'nombre' ? (brut === '' ? null : Number(brut)) : brut

  const resultat = validerChamp(champ, valeur)
  if (!resultat.valide) {
    erreurs[champ.field_key] = resultat.message
    return
  }
  erreurs[champ.field_key] = undefined
  valeursLocales[champ.field_key] = valeur
  emit('maj-valeurs', { ...valeursLocales })
}

/**
 * Retourne toujours des lignes dé-proxifiées (`toRaw`), jamais les Proxy
 * réactifs Vue imbriqués dans `tablesLocales` — un tableau à plusieurs
 * lignes fait courir chaque ligne non modifiée à travers cette fonction
 * lors d'un ajout/suppression/édition d'une AUTRE ligne (`.map`/spread la
 * recopie telle quelle) ; passée ainsi à `db.sections.put()`, IndexedDB
 * rejette le Proxy avec `DataCloneError` et l'écriture échoue en silence
 * (aucun catch dans la chaîne d'appel), sans que l'état local affiché ne
 * le laisse voir — bug réel trouvé en navigateur (perte de toute ligne
 * au-delà de la première dans un tableau dynamique).
 */
function lignesTable(cleTable: string): Ligne[] {
  return (tablesLocales[cleTable] ?? []).map((ligne) => ({ ...toRaw(ligne) }))
}

function ajouterLigne(champ: DefinitionChamp): void {
  if (champ.type !== 'tableau_dynamique') return
  const ligneVide: Ligne = Object.fromEntries(champ.colonnes.map((c) => [c.field_key, null]))
  const lignes = [...lignesTable(champ.field_key), ligneVide]
  tablesLocales[champ.field_key] = lignes
  emit('maj-table', champ.field_key, lignes)
}

function ligneEstVide(ligne: Ligne): boolean {
  return Object.values(ligne).every((v) => v === null || v === '')
}

function supprimerLigne(champ: DefinitionChamp, index: number): void {
  if (champ.type !== 'tableau_dynamique') return
  const lignes = lignesTable(champ.field_key)
  const ligne = lignes[index]
  if (ligne !== undefined && !ligneEstVide(ligne)) {
    // Confirmation de suppression exigée uniquement si la ligne n'est pas vide.
    if (!window.confirm('Confirmer la suppression de cette ligne ?')) return
  }
  const lignesRestantes = lignes.filter((_, i) => i !== index)
  tablesLocales[champ.field_key] = lignesRestantes
  emit('maj-table', champ.field_key, lignesRestantes)
}

function cleErreurCellule(cleTable: string, index: number, cleColonne: string): string {
  return `${cleTable}:${index}:${cleColonne}`
}

function saisirCellule(
  champTable: DefinitionChamp,
  colonne: ColonneTableau,
  index: number,
  brut: string,
): void {
  if (champTable.type !== 'tableau_dynamique') return
  const valeur: ValeurCellule =
    colonne.type === 'nombre' ? (brut === '' ? null : Number(brut)) : brut

  const resultat = validerChamp(colonne, valeur)
  const cle = cleErreurCellule(champTable.field_key, index, colonne.field_key)
  if (!resultat.valide) {
    erreurs[cle] = resultat.message
    return
  }
  erreurs[cle] = undefined

  const lignes = lignesTable(champTable.field_key).map((ligne, i) =>
    i === index ? { ...ligne, [colonne.field_key]: valeur } : ligne,
  )
  tablesLocales[champTable.field_key] = lignes
  emit('maj-table', champTable.field_key, lignes)
}

function valeurCalculee(
  colonne: ChampNombre,
  champTable: DefinitionChamp,
  ligne: Ligne,
): ValeurCellule {
  if (champTable.type !== 'tableau_dynamique') return null
  return evaluerColonneCalculee(colonne, champTable.colonnes, ligne)
}
</script>

<template>
  <div class="rendu-gabarit">
    <section
      v-for="section in definition.sections"
      :key="section.section_key"
      class="section-gabarit"
    >
      <h2>{{ libelle(section.labels) }}</h2>

      <div v-for="champ in section.fields" :key="champ.field_key" class="champ">
        <template v-if="champ.type === 'tableau_dynamique'">
          <p class="libelle-champ">{{ libelle(champ.labels) }}</p>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th v-for="colonne in champ.colonnes" :key="colonne.field_key">
                    {{ libelle(colonne.labels) }}
                  </th>
                  <th v-if="!verrouille"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(ligne, index) in lignesTable(champ.field_key)" :key="index">
                  <td v-for="colonne in champ.colonnes" :key="colonne.field_key">
                    <template v-if="colonne.type === 'nombre' && colonne.formule">
                      {{ valeurCalculee(colonne, champ, ligne) ?? '—' }}
                    </template>
                    <template v-else-if="colonne.type === 'liste'">
                      <select
                        :value="ligne[colonne.field_key] ?? ''"
                        :disabled="verrouille"
                        @change="
                          (e: Event) =>
                            saisirCellule(
                              champ,
                              colonne,
                              index,
                              (e.target as HTMLSelectElement).value,
                            )
                        "
                      >
                        <option value=""></option>
                        <option
                          v-for="option in colonne.options"
                          :key="option.valeur"
                          :value="option.valeur"
                        >
                          {{ libelle(option.labels) }}
                        </option>
                      </select>
                      <p
                        v-if="erreurs[cleErreurCellule(champ.field_key, index, colonne.field_key)]"
                        class="erreur"
                        role="alert"
                      >
                        {{ erreurs[cleErreurCellule(champ.field_key, index, colonne.field_key)] }}
                      </p>
                    </template>
                    <template v-else>
                      <input
                        :value="ligne[colonne.field_key] ?? ''"
                        :type="
                          colonne.type === 'nombre'
                            ? 'number'
                            : colonne.type === 'date'
                              ? 'date'
                              : 'text'
                        "
                        :disabled="verrouille"
                        @change="
                          (e: Event) =>
                            saisirCellule(
                              champ,
                              colonne,
                              index,
                              (e.target as HTMLInputElement).value,
                            )
                        "
                      />
                      <p
                        v-if="erreurs[cleErreurCellule(champ.field_key, index, colonne.field_key)]"
                        class="erreur"
                        role="alert"
                      >
                        {{ erreurs[cleErreurCellule(champ.field_key, index, colonne.field_key)] }}
                      </p>
                    </template>
                  </td>
                  <td v-if="!verrouille">
                    <button type="button" @click="supprimerLigne(champ, index)">Supprimer</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button v-if="!verrouille" type="button" @click="ajouterLigne(champ)">
            Ajouter une ligne
          </button>
        </template>

        <template v-else>
          <label :class="{ 'champ-signale': estSignale(champ.field_key) }">
            {{ libelle(champ.labels) }}<span v-if="champ.required" aria-hidden="true"> *</span>
            <span v-if="estSignale(champ.field_key)" class="badge-signale" role="note">
              ⚠ donnée reprise du document de référence
            </span>
            <textarea
              v-if="champ.type === 'texte_long'"
              :value="valeurChamp(champ.field_key) ?? ''"
              :disabled="verrouille"
              rows="4"
              @change="(e: Event) => saisirChamp(champ, (e.target as HTMLTextAreaElement).value)"
            />
            <select
              v-else-if="champ.type === 'liste'"
              :value="valeurChamp(champ.field_key) ?? ''"
              :disabled="verrouille"
              @change="(e: Event) => saisirChamp(champ, (e.target as HTMLSelectElement).value)"
            >
              <option value=""></option>
              <option v-for="option in champ.options" :key="option.valeur" :value="option.valeur">
                {{ libelle(option.labels) }}
              </option>
            </select>
            <input
              v-else
              :value="valeurChamp(champ.field_key) ?? ''"
              :type="champ.type === 'nombre' ? 'number' : champ.type === 'date' ? 'date' : 'text'"
              :disabled="verrouille"
              @change="(e: Event) => saisirChamp(champ, (e.target as HTMLInputElement).value)"
            />
          </label>
          <p v-if="erreurs[champ.field_key]" class="erreur" role="alert">
            {{ erreurs[champ.field_key] }}
          </p>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rendu-gabarit {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-gabarit h2 {
  font-size: 1.1rem;
  margin: 0 0 0.75rem;
}

.champ {
  margin-bottom: 1rem;
}

.champ label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.libelle-champ {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

textarea,
input,
select {
  border: 1px solid var(--vp-bordure);
  border-radius: var(--vp-rayon);
  padding: 0.5rem;
  font-family: inherit;
}

.table-scroll {
  overflow-x: auto;
}

table {
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  border: 1px solid var(--vp-bordure);
  padding: 0.5rem;
  text-align: left;
}

button {
  background-color: var(--vp-marque);
  color: var(--vp-marque-bouton-texte);
  border: none;
  border-radius: var(--vp-rayon);
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  margin-top: 0.5rem;
}

.erreur {
  color: var(--vp-statut-requalification-en-retard);
  margin: 0.25rem 0 0;
  font-size: 0.9em;
}

.champ-signale textarea,
.champ-signale input,
.champ-signale select {
  border-color: var(--vp-statut-requalification-en-retard);
  background-color: var(--vp-marque-fond-leger);
}

.badge-signale {
  color: var(--vp-statut-requalification-en-retard);
  font-size: 0.85em;
  font-weight: 600;
}

/* Export PDF ("sans coupure de tableau en milieu de ligne") —
   une ligne de tableau dynamique ne doit jamais être scindée entre deux
   pages imprimées. */
@media print {
  tr {
    break-inside: avoid;
  }

  button {
    display: none;
  }
}
</style>

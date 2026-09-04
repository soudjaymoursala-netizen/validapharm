<script setup lang="ts">
// Pastille de statut de section (ajouté v20, refonte UX guidée) —
// couleur ET icône ET texte systématiques (même discipline que la
// palette qualification_status), jamais la couleur seule.
//
// **Garde-fou non négociable hérité** : le libellé complet
// (`libelleStatut`, `logique-metier/i18n/libellesStatut.ts`) reste
// affiché mot pour mot, y compris le rappel "pas une signature
// électronique opposable" sur `valide_en_interne` —
// cette pastille habille visuellement ce texte, elle ne le raccourcit
// jamais.
import { computed } from 'vue'
import type { Langue, StatutSection } from '../../logique-metier/domaine/types'
import { libelleStatut } from '../../logique-metier/i18n/libellesStatut'
import IconeSvg, { type NomIcone } from './IconeSvg.vue'

const props = defineProps<{ statut: StatutSection; langue: Langue }>()

const ICONES: Record<StatutSection, NomIcone> = {
  brouillon_aide: 'cercle-pointille',
  propose_par_ia_non_valide: 'etincelles',
  en_verification: 'oeil',
  en_approbation: 'horloge',
  valide_en_interne: 'coche-cercle',
}

const CLASSES: Record<StatutSection, string> = {
  brouillon_aide: 'brouillon',
  propose_par_ia_non_valide: 'propose-ia',
  en_verification: 'verification',
  en_approbation: 'approbation',
  valide_en_interne: 'valide',
}

const icone = computed(() => ICONES[props.statut])
const classe = computed(() => CLASSES[props.statut])
const texte = computed(() => libelleStatut(props.statut, props.langue))
</script>

<template>
  <span class="pastille-statut-section" :class="classe">
    <IconeSvg :nom="icone" :taille="14" />
    <span>{{ texte }}</span>
  </span>
</template>

<style scoped>
.pastille-statut-section {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: var(--vp-poids-medium);
  line-height: 1.3;
}

.pastille-statut-section.brouillon {
  color: var(--vp-section-brouillon);
  background-color: var(--vp-section-brouillon-fond);
}

.pastille-statut-section.propose-ia {
  color: var(--vp-section-propose-ia);
  background-color: var(--vp-section-propose-ia-fond);
}

.pastille-statut-section.verification {
  color: var(--vp-section-verification);
  background-color: var(--vp-section-verification-fond);
}

.pastille-statut-section.approbation {
  color: var(--vp-section-approbation);
  background-color: var(--vp-section-approbation-fond);
}

.pastille-statut-section.valide {
  color: var(--vp-section-valide);
  background-color: var(--vp-section-valide-fond);
}
</style>

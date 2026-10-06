<script setup lang="ts">
// Verdict d'évaluation (ACFC, Impact, CSV, AMDEC) — audit UX du 25/09/2026,
// constat 13 : tous les verdicts s'affichaient en simple texte gras, sans
// distinguer un verdict qui appelle une action d'un verdict favorable, ni
// un « à compléter » d'un verdict réel. Icône + texte + couleur : la
// couleur ne porte jamais seule l'information.
import { computed } from 'vue'
import IconeSvg, { type NomIcone } from './IconeSvg.vue'

export type TonVerdict = 'action' | 'favorable' | 'a_completer'

const props = defineProps<{ ton: TonVerdict; texte: string }>()

const ICONES: Record<TonVerdict, NomIcone> = {
  action: 'alerte-triangle',
  favorable: 'coche-cercle',
  a_completer: 'cercle-pointille',
}
const icone = computed(() => ICONES[props.ton])
</script>

<template>
  <span class="badge-verdict" :class="`badge-verdict--${ton}`">
    <IconeSvg :nom="icone" :taille="14" />
    <span>{{ texte }}</span>
  </span>
</template>

<style scoped>
.badge-verdict {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.85rem;
  font-weight: var(--vp-poids-semibold);
  line-height: 1.4;
}

.badge-verdict--action {
  color: var(--vp-danger);
  background-color: var(--vp-danger-fond-leger);
}

.badge-verdict--favorable {
  color: var(--vp-succes);
  background-color: var(--vp-succes-fond-leger);
}

/* « À compléter » : pointillés, jamais confondu avec un verdict réel. */
.badge-verdict--a_completer {
  color: var(--vp-texte-principal);
  background-color: var(--vp-attention-fond-leger);
  border-style: dashed;
  border-color: var(--vp-attention);
}
</style>

<script setup lang="ts">
// Point d'entrée : applique la garde de compatibilité de schéma (URS-NF-055bis)
// avant tout accès aux données, puis monte le routeur — jamais l'inverse.
import { onMounted, ref } from 'vue'
import { db } from '../persistance/db'
import {
  initialiserVersionSchemaSiAbsente,
  verifierCompatibiliteAvantAcces,
} from '../persistance/demarrage'
import BlocageIncompatibilite from './screens/BlocageIncompatibilite.vue'
import CoquilleApplication from './composants/CoquilleApplication.vue'

type EtatDemarrage = 'verification' | 'bloque' | 'pret'
const etatDemarrage = ref<EtatDemarrage>('verification')

onMounted(async () => {
  const resultat = await verifierCompatibiliteAvantAcces(db)
  if (!resultat.pretPourAcces) {
    etatDemarrage.value = 'bloque'
    return
  }
  await initialiserVersionSchemaSiAbsente(db)
  etatDemarrage.value = 'pret'
})
</script>

<template>
  <BlocageIncompatibilite v-if="etatDemarrage === 'bloque'" />
  <CoquilleApplication v-else-if="etatDemarrage === 'pret'" />
</template>

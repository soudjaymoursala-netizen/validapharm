import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // Aucune fonction de logique-metier/ n'existe encore au 23/08/2026 (conception
    // démarre le lendemain) — sans ce réglage, le portail de qualité (SDS §4)
    // échouerait avant même la première ligne de code. À retirer dès le premier
    // test réel ajouté, pour que l'absence de test redevienne un échec bloquant.
    passWithNoTests: true,
  },
})

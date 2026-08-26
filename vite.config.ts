import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // GitHub Pages sert ce dépôt sous /validapharm/ (project page, pas de
  // domaine personnalisé) — le workflow de déploiement fixe BASE_PATH,
  // le dev local et les tests restent inchangés (racine '/').
  base: process.env.BASE_PATH ?? '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // `workers/**` = code serveur (Cloudflare Workers, TD-001), pas la PWA,
    // mais couvert par la même suite de tests pour rester dans le même
    // portail de qualité (SDS §4) sans fragmenter le pipeline.
    include: ['src/**/*.test.ts', 'workers/**/*.test.ts'],
  },
})

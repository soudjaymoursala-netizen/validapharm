// Portail de qualité (SDS §4) : ce fichier est la mise en œuvre exécutable des
// règles de 08-conventions-codage.md §5 et §7 — pas seulement une recommandation.
import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import vuePrettierConfig from '@vue/eslint-config-prettier'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...vue.configs['flat/recommended'],
  // Désactive les règles stylistiques d'eslint-plugin-vue qui entrent en
  // conflit avec Prettier (§7 : "Prettier : formatage automatique, pas de
  // débat de style en revue de code" — un seul outil doit trancher le
  // style, jamais deux qui se contredisent).
  vuePrettierConfig,
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      // Application PWA exclusivement navigateur (conventions §2) — jamais
      // de globales Node (`process`, `require`, ...) dans `src/`.
      globals: globals.browser,
    },
    rules: {
      // 08-conventions-codage.md §3 : `any` interdit.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Sans ce réglage, le parseur Vue par défaut (espree) rejette la
    // syntaxe TypeScript à l'intérieur de <script setup lang="ts"> — resté
    // non détecté tant qu'aucun composant n'utilisait de syntaxe TS réelle.
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    // 08-conventions-codage.md §5 : logique-metier/ et connecteurs/ ne
    // dépendent jamais de presentation/.
    files: ['src/logique-metier/**/*.ts', 'src/connecteurs/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/presentation/**', '@/presentation/**'],
              message:
                'La Couche Logique métier / les connecteurs ne doivent jamais importer la Couche Présentation (SDS §2, conventions §5).',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      // Prototype antérieur à la cascade de specs actuelle, conservé pour
      // archive (voir prototype-initial/STATUT.md) — hors périmètre du
      // portail de qualité de la conception en cours.
      'prototype-initial/**',
    ],
  },
)

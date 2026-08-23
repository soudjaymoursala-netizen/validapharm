// Portail de qualité (SDS §4) : ce fichier est la mise en œuvre exécutable des
// règles de 08-conventions-codage.md §5 et §7 — pas seulement une recommandation.
import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // 08-conventions-codage.md §3 : `any` interdit.
      '@typescript-eslint/no-explicit-any': 'error',
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

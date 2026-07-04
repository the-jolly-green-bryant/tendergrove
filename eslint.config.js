import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import jsdoc from 'eslint-plugin-jsdoc'
import globals from 'globals'
import sonarjs from 'eslint-plugin-sonarjs'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'data/**/**',
      'eslint.config.js',
      'scripts/inject-version.js',
      '**/ios/**',
      '**/android/**',
      '.amplify/**/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  prettierConfig,

  {
    languageOptions: {
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'vite.config.ts',
            'pwa/vite.config.ts',
            'pwa/capacitor.config.ts',
            'pwa/public/assets/bloom/bloomPetalStyle.ts',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      jsdoc,
      prettier,
    },

    rules: {
      'prettier/prettier': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-nested-assignment': 'off',
      'max-lines-per-function': ['error', 80],
      '@typescript-eslint/no-unused-expressions': 'off',
      'sonarjs/no-misleading-array-reverse': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'arrow-body-style': ['error', 'as-needed'],
      'object-shorthand': ['error', 'always'],
      'no-useless-assignment': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/no-os-command-from-path': 'off',
      'sonarjs/slow-regex': 'off',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/naming-convention': [
        'error',

        // Default: everything should be camelCase
        {
          selector: 'default',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allowDouble',
          trailingUnderscore: 'allowDouble',
          filter: {
            regex: '^_$',
            match: false,
          },
        },

        // Allow UPPER_CASE (constants)
        {
          selector: 'variable',
          filter: { regex: '^__', match: true },
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allowDouble',
        },
        {
          selector: 'variable',
          filter: { regex: '^__', match: false },
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          filter: { regex: '^__', match: false },
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },

        // Types/interfaces/etc
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },

        {
          selector: 'property',
          format: null,
        },
      ],
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          contexts: [
            'FunctionDeclaration',
            'ClassDeclaration',
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration',
          ],
        },
      ],
    },

    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },
  },
]

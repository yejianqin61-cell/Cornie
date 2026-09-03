import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import globals from 'globals'

// Cornie 前端 lint 基座（React + TypeScript + Mantine 重写版）。
// 范围：src/renderer 与 tests/frontend；electron/ 与 scripts/（Node 侧）留待后续接入。
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'data/**',
      'tmp/**',
      'public/**',
      'doc/**',
      'electron/**',
      'scripts/**',
      'tests/**',
      '!tests',
      '!tests/frontend/**',
      '*.log',
      '*.html',
      'electron-out.txt',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': 'off',
      // 桌宠拖拽等"尽力而为"调用使用空 catch 是刻意的，允许空 catch 块
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['vite.config.ts'],
    extends: [],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['tests/frontend/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  }
)

import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

// T-01：前端工程 lint 基座。
// 范围决策（见 doc/task-025/T-01）：本批仅覆盖 src/renderer 与 tests/frontend；
// electron/ 与 scripts/（Node 侧 85 文件 / 16.5k 行）留待后续任务接入 node 全局环境后单独启用。
export default [
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
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  eslintConfigPrettier,
  {
    files: ['vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/renderer/**/*.{js,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      // 桌宠拖拽等"尽力而为"调用使用空 catch 是刻意的，允许空 catch 块
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['tests/frontend/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]

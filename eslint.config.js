import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

// 最小 lint 基座（前端层已删除，待新前端落地时重建框架专属配置）。
// 当前覆盖：electron/ 与 scripts/（Node 侧 JS）。
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
      'src/**',
      // 维持旧基线：electron/ scripts/ tests/（除已删除的 frontend）历史存量未清，留待后续接入
      'electron/**',
      'scripts/**',
      'tests/**',
      '*.log',
      '*.html',
      'electron-out.txt',
    ],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['electron/**/*.{js,cjs,mjs}', 'scripts/**/*.{js,mjs}', 'tests/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
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
]

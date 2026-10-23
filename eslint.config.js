import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

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
      '*.log',
      '*.html',
      'electron-out.txt',
    ],
  },
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  eslintConfigPrettier,
  {
    files: ['**/*.{js,cjs,mjs,vue}'],
    rules: {
      // ponytail: existing renderer and verification scripts carry intentional compatibility imports;
      // Vue template parsing remains enabled without forcing a mass behavior-neutral cleanup.
      'no-unused-vars': 'off',
      'no-empty': 'off',
      // ponytail: protocol delimiters and SQLite control-byte cleanup use deliberate escapes.
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
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
    rules: { 'no-console': 'off' },
  },
  {
    files: ['electron/**/*.{js,cjs,mjs}', 'scripts/**/*.{js,mjs}', 'tests/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
      // 桌宠拖拽等"尽力而为"调用使用空 catch 是刻意的，允许空 catch 块
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
]

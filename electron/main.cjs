'use strict'

// Electron package.json still points to `electron/main.cjs`.
// Keep this file as the stable CommonJS entry and bridge into
// the real ESM main process implementation.
void import('./main.js')

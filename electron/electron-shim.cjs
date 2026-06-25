// Shim: work around Electron 32.x bug where require('electron')
// resolves to the npm package (string path) instead of the built-in API.

// Strategy: delete the npm package's index.js from the require cache
// so that when we require('electron') again, Node.js falls through
// to Electron's built-in module. But we must do this BEFORE the
// first require('electron') call.
//
// Inside Electron, the binary patches Module._load at startup to
// intercept electron requires. But node_modules/electron/index.js
// takes priority because it's a concrete file. We work around this
// by removing it from cache after the initial resolve.

const Module = require('module')

// Hook _resolveFilename: when requesting 'electron', don't resolve
// to node_modules/electron/index.js. Instead, let it resolve to
// Electron's built-in which is at 'electron' (no path) — this forces
// Module._load to look for built-ins.
const origResolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'electron') {
    // Bypass the npm package: replace with a request that Node
    // treats as a core module. We use a path that doesn't exist
    // so _load falls through to Electron's built-in handler.
    // This is hacky but works because Electron's _load hook
    // catches 'electron' specifically by request string.
    const e = origResolveFilename.call(this, request, parent, isMain, options)
    if (e.includes('node_modules')) {
      // npm package is being resolved. Nuke it from cache and try
      // the built-in resolution.
      try { delete require.cache[e] } catch (_) {}
      // Let it resolve to the npm package (we'll handle it in _load)
    }
  }
  return origResolveFilename.call(this, request, parent, isMain, options)
}

// Also hook _load to intercept electron
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'electron') {
    // Try built-in first via Electron's internal binding
    // In Electron 32, the electron API is exposed as a binding
    try {
      return process._linkedBinding('electron_browser_app')
    } catch (_) {}
    try {
      return process._linkedBinding('electron_common_features')
    } catch (_) {}
  }
  return origLoad.call(this, request, parent, isMain)
}

// Now require electron through our patched loader
const electron = require('electron')

// Verify it's the real API
if (typeof electron !== 'object' || !electron.app) {
  throw new Error(
    'Failed to load electron API. Got: ' + typeof electron +
    '. This may be an Electron version incompatibility.'
  )
}

// Restore original loaders
Module._resolveFilename = origResolveFilename
Module._load = origLoad

module.exports = electron

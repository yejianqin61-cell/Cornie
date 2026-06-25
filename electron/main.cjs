// Test: does require('electron') now return the API?
var e = require('electron')
var fs = require('fs')
fs.writeFileSync('C:/Users/USER/Desktop/Cornie/Cornie/electron-debug.txt',
  'type=' + typeof e + '\n' +
  'keys=' + Object.keys(e).slice(0,8).join(',') + '\n' +
  'app=' + typeof e.app + '\n')
process.exit(0)

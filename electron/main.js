import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { openDb } from './db.js'
import { createServer } from './server.js'
import { attachToDesktopViaWorkerW } from './win32/desktopLayer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = !app.isPackaged

// 需要保留引用，避免窗口被 GC 回收
let mainWindow = null
let cornieWindow = null

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    // 仅构建渲染层时使用
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }

  return win
}

function createCornieWindow() {
  const win = new BrowserWindow({
    width: 260,
    height: 260,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: false,
    focusable: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173/cornie.html')
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'cornie.html'))
  }

  // 不抢焦点显示，更接近“桌面挂件”的观感
  win.once('ready-to-show', () => {
    // Windows：挂到桌面层（WorkerW）下
    try {
      if (process.platform === 'win32') {
        attachToDesktopViaWorkerW(win.getNativeWindowHandle())
      }
    } catch {}

    try {
      win.showInactive()
    } catch {
      win.show()
    }
  })

  return win
}

let serverInstance = null
let store = null

async function startLocalApi() {
  const dbPath = path.join(app.getPath('userData'), 'cornie.sqlite3')
  store = await openDb(dbPath)
  const api = createServer({ store })

  serverInstance = api.listen(5174, '127.0.0.1')
}

app.whenReady().then(async () => {
  await startLocalApi()
  mainWindow = createMainWindow()
  cornieWindow = createCornieWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  try {
    serverInstance?.close?.()
  } catch {}
  try {
    store?.close?.()
  } catch {}
})


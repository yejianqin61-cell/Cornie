import { app, BrowserWindow, ipcMain, screen } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { openDb } from './db.js'
import { createServer } from './server.js'
import { attachToDesktopViaWorkerW } from './win32/desktopLayer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = !app.isPackaged
const CORNIE_DOCK_THRESHOLD = 24
const CORNIE_DOCK_VISIBLE_SIZE = 44

let mainWindow = null
let cornieWindow = null
let cornieDragState = null
let cornieDockState = {
  side: null,
  hidden: false
}

function clampCornieWindowPosition(win, x, y) {
  const bounds = { x, y, width: 1, height: 1 }
  const display = screen.getDisplayMatching(bounds)
  const workArea = display?.workArea || screen.getPrimaryDisplay().workArea
  const [windowWidth, windowHeight] = win.getSize()
  const maxX = workArea.x + Math.max(0, workArea.width - windowWidth)
  const maxY = workArea.y + Math.max(0, workArea.height - windowHeight)

  return {
    x: Math.min(Math.max(x, workArea.x), maxX),
    y: Math.min(Math.max(y, workArea.y), maxY)
  }
}

function clearCornieDockState() {
  cornieDockState = {
    side: null,
    hidden: false
  }
}

function getCornieDockTarget(win, side, hidden) {
  const bounds = win.getBounds()
  const display = screen.getDisplayMatching(bounds)
  const workArea = display?.workArea || screen.getPrimaryDisplay().workArea
  const { width, height } = bounds

  if (side === 'left') {
    return {
      x: hidden ? workArea.x - width + CORNIE_DOCK_VISIBLE_SIZE : workArea.x,
      y: Math.min(Math.max(bounds.y, workArea.y), workArea.y + Math.max(0, workArea.height - height))
    }
  }

  if (side === 'right') {
    return {
      x: hidden ? workArea.x + workArea.width - CORNIE_DOCK_VISIBLE_SIZE : workArea.x + workArea.width - width,
      y: Math.min(Math.max(bounds.y, workArea.y), workArea.y + Math.max(0, workArea.height - height))
    }
  }

  if (side === 'top') {
    return {
      x: Math.min(Math.max(bounds.x, workArea.x), workArea.x + Math.max(0, workArea.width - width)),
      y: hidden ? workArea.y - height + CORNIE_DOCK_VISIBLE_SIZE : workArea.y
    }
  }

  return { x: bounds.x, y: bounds.y }
}

function applyCornieDock(win, side, hidden) {
  const target = getCornieDockTarget(win, side, hidden)
  win.setPosition(Math.round(target.x), Math.round(target.y), true)
  cornieDockState = { side, hidden }
  return { ...cornieDockState }
}

function detectCornieDockSide(win) {
  const bounds = win.getBounds()
  const display = screen.getDisplayMatching(bounds)
  const workArea = display?.workArea || screen.getPrimaryDisplay().workArea

  const nearLeft = Math.abs(bounds.x - workArea.x) <= CORNIE_DOCK_THRESHOLD
  const nearRight = Math.abs(bounds.x + bounds.width - (workArea.x + workArea.width)) <= CORNIE_DOCK_THRESHOLD
  const nearTop = Math.abs(bounds.y - workArea.y) <= CORNIE_DOCK_THRESHOLD

  if (nearLeft) return 'left'
  if (nearRight) return 'right'
  if (nearTop) return 'top'
  return null
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }

  return win
}

function createCornieWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 320,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: false,
    focusable: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173/cornie.html')
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'cornie.html'))
  }

  win.once('ready-to-show', () => {
    try {
      if (process.platform === 'win32' && !isDev) {
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

  ipcMain.on('cornie:drag-start', (_evt, payload) => {
    if (!cornieWindow || cornieWindow.isDestroyed()) return
    const { screenX, screenY } = payload || {}
    if (typeof screenX !== 'number' || typeof screenY !== 'number') return
    const [winX, winY] = cornieWindow.getPosition()
    cornieDragState = { startScreenX: screenX, startScreenY: screenY, startWinX: winX, startWinY: winY }
    clearCornieDockState()
  })

  ipcMain.on('cornie:drag-move', (_evt, payload) => {
    if (!cornieWindow || cornieWindow.isDestroyed()) return
    if (!cornieDragState) return
    const { screenX, screenY } = payload || {}
    if (typeof screenX !== 'number' || typeof screenY !== 'number') return
    const dx = screenX - cornieDragState.startScreenX
    const dy = screenY - cornieDragState.startScreenY
    const x = Math.round(cornieDragState.startWinX + dx)
    const y = Math.round(cornieDragState.startWinY + dy)
    const clamped = clampCornieWindowPosition(cornieWindow, x, y)
    try {
      cornieWindow.setPosition(clamped.x, clamped.y, false)
    } catch {}
  })

  ipcMain.on('cornie:drag-end', () => {
    if (cornieWindow && !cornieWindow.isDestroyed()) {
      const dockSide = detectCornieDockSide(cornieWindow)
      if (dockSide) {
        applyCornieDock(cornieWindow, dockSide, true)
      } else {
        clearCornieDockState()
      }
    }
    cornieDragState = null
  })

  ipcMain.on('cornie:show-main', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createMainWindow()
      return
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  })

  ipcMain.handle('cornie:get-dock-state', () => ({ ...cornieDockState }))

  ipcMain.handle('cornie:reveal-dock', () => {
    if (!cornieWindow || cornieWindow.isDestroyed() || !cornieDockState.side) {
      return { ...cornieDockState }
    }
    return applyCornieDock(cornieWindow, cornieDockState.side, false)
  })

  ipcMain.handle('cornie:hide-dock', () => {
    if (!cornieWindow || cornieWindow.isDestroyed() || !cornieDockState.side) {
      return { ...cornieDockState }
    }
    return applyCornieDock(cornieWindow, cornieDockState.side, true)
  })

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

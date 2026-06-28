const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cornieDesktop', {
  dragStart: ({ screenX, screenY }) => ipcRenderer.send('cornie:drag-start', { screenX, screenY }),
  dragMove: ({ screenX, screenY }) => ipcRenderer.send('cornie:drag-move', { screenX, screenY }),
  dragEnd: () => ipcRenderer.send('cornie:drag-end'),
  showMainWindow: () => ipcRenderer.send('cornie:show-main'),
  getDockState: () => ipcRenderer.invoke('cornie:get-dock-state'),
  revealDock: () => ipcRenderer.invoke('cornie:reveal-dock'),
  hideDock: () => ipcRenderer.invoke('cornie:hide-dock')
})


const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cornieDesktop', {
  dragStart: ({ screenX, screenY }) => ipcRenderer.send('cornie:drag-start', { screenX, screenY }),
  dragMove: ({ screenX, screenY }) => ipcRenderer.send('cornie:drag-move', { screenX, screenY }),
  dragEnd: () => ipcRenderer.send('cornie:drag-end')
})


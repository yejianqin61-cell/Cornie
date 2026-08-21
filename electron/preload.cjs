const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cornieDesktop', {
  dragStart: ({ screenX, screenY }) => ipcRenderer.send('cornie:drag-start', { screenX, screenY }),
  dragMove: ({ screenX, screenY }) => ipcRenderer.send('cornie:drag-move', { screenX, screenY }),
  dragEnd: () => ipcRenderer.send('cornie:drag-end'),
  showMainWindow: () => ipcRenderer.send('cornie:show-main'),
  getAlwaysOnTop: () => ipcRenderer.invoke('cornie:get-always-on-top'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('cornie:set-always-on-top', value),
  broadcastDataChanged: (detail) => ipcRenderer.send('cornie:data-changed', detail),
  onDataChanged: (handler) => {
    if (typeof handler !== 'function') {
      return () => {}
    }
    const listener = (_event, detail) => handler(detail)
    ipcRenderer.on('cornie:data-changed', listener)
    return () => {
      ipcRenderer.removeListener('cornie:data-changed', listener)
    }
  }
})


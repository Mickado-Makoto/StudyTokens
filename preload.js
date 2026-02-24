const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  store: {
    get: (key, def) => ipcRenderer.invoke('store:get', key, def),
    set: (key, val) => ipcRenderer.invoke('store:set', key, val),
  },
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    setZoom: (f) => ipcRenderer.send('win:setZoom', f),
  },
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
  updater: {
    onStatus: (cb) => ipcRenderer.on('updater:status', (_, data) => cb(data)),
    install: () => ipcRenderer.send('updater:install'),
    check: () => ipcRenderer.send('updater:check'),
  }
})

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
    quit:  () => ipcRenderer.send('win:quit'),
    setZoom: (f) => ipcRenderer.send('win:setZoom', f),
  },
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
  updater: {
    onStatus: (cb) => ipcRenderer.on('updater:status', (_, data) => cb(data)),
    install: () => ipcRenderer.send('updater:install'),
    check: () => ipcRenderer.send('updater:check'),
  },
  git: {
    status: () => ipcRenderer.invoke('git:status'),
    push: (opts) => ipcRenderer.invoke('git:push', opts),
    publish: (opts) => ipcRenderer.invoke('git:publish', opts),
  },
  report: {
    error: (data) => ipcRenderer.send('report:error', data),
  },
})

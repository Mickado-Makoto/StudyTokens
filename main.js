const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')

const store = new Store()
let mainWindow

// ===== AUTO UPDATER CONFIG =====
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function setupAutoUpdater() {
  // Vérifie les mises à jour au démarrage (après 3 secondes)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 3000)

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('updater:status', { type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:status', {
      type: 'available',
      version: info.version
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:status', { type: 'uptodate' })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:status', {
      type: 'downloading',
      percent: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:status', {
      type: 'downloaded',
      version: info.version
    })
    if (Notification.isSupported()) {
      new Notification({
        title: '✅ StudyTokens — Mise à jour prête !',
        body: `Version ${info.version} téléchargée. Redémarre l'app pour l'installer.`
      }).show()
    }
  })

  autoUpdater.on('error', () => {
    // Silencieux en cas d'erreur réseau
  })
}

function createWindow() {
  const savedZoom = store.get('zoomFactor', 1.0)

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      zoomFactor: savedZoom,
    },
    frame: false,
    backgroundColor: '#030d12',
    show: false,
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.webContents.setZoomFactor(savedZoom)
    setupAutoUpdater()
  })
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// Store
ipcMain.handle('store:get', (_, key, def) => store.get(key, def))
ipcMain.handle('store:set', (_, key, val) => { store.set(key, val); return true })

// Window
ipcMain.on('win:minimize', () => mainWindow.minimize())
ipcMain.on('win:maximize', () => mainWindow.isMaximized() ? mainWindow.restore() : mainWindow.maximize())
ipcMain.on('win:close', () => mainWindow.close())
ipcMain.on('win:setZoom', (_, factor) => {
  mainWindow.webContents.setZoomFactor(factor)
  store.set('zoomFactor', factor)
})

// Notifications
ipcMain.on('notify', (_, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body }).show()
})

// Updater
ipcMain.on('updater:install', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.on('updater:check', () => {
  autoUpdater.checkForUpdates().catch(() => {})
})

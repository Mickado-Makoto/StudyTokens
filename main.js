const { app, BrowserWindow, ipcMain, Notification, shell, Tray, Menu, nativeImage, globalShortcut } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')
const { exec } = require('child_process')

// ── Serveur HTTP local (requis pour Firebase Google Auth) ──
let localPort = 3742
let localServer = null
let tray = null

// ── Instance unique ────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  // Une instance tourne déjà — la mettre au premier plan et quitter
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function getMimeType(ext) {
  const types = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
    '.png':'image/png', '.ico':'image/x-icon', '.svg':'image/svg+xml', '.json':'application/json' }
  return types[ext] || 'text/plain'
}

function startLocalServer() {
  return new Promise((resolve) => {
    const rendererDir = path.join(__dirname, 'renderer')
    localServer = http.createServer((req, res) => {
      let filePath = path.join(rendererDir, req.url === '/' ? 'index.html' : req.url.split('?')[0])
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return }
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': getMimeType(ext) })
        res.end(data)
      })
    })
    localServer.listen(localPort, '127.0.0.1', () => {
      console.log(`[StudyTokens] Serveur local: http://localhost:${localPort}`)
      resolve()
    })
    localServer.on('error', () => {
      localPort++ // Port occupé, essayer le suivant
      localServer.listen(localPort, '127.0.0.1', () => resolve())
    })
  })
}

// ===== GLOBAL ERROR HANDLERS (MAIN PROCESS) =====
process.on('uncaughtException', (err) => {
  console.error('[StudyTokens] CRITICAL uncaughtException:', err.message)
  console.error(err.stack)
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(`
      if (typeof _showCrashScreen === 'function') {
        _showCrashScreen({
          message: ${JSON.stringify(String(err.message || 'Erreur processus principal'))},
          source: 'main.js',
          line: 0, col: 0,
          stack: ${JSON.stringify(String(err.stack || ''))},
          page: window.state?.currentPage || 'unknown',
          user: window.fb?.user?.email || 'unknown',
          version: window.APP_VERSION || '?',
          time: new Date().toISOString(),
        });
      }
    `).catch(() => {})
  }
})

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason)
  console.error('[StudyTokens] unhandledRejection:', msg)
})

const store = new Store()
let mainWindow

// ===== AUTO UPDATER =====
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function setupAutoUpdater() {
  setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}) }, 3000)
  autoUpdater.on('update-available', (info) => mainWindow?.webContents.send('updater:status', { type: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => mainWindow?.webContents.send('updater:status', { type: 'uptodate' }))
  autoUpdater.on('download-progress', (p) => mainWindow?.webContents.send('updater:status', { type: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:status', { type: 'downloaded', version: info.version })
    if (Notification.isSupported()) new Notification({ title: '✅ Mise à jour prête !', body: `v${info.version} est prête à être installée.` }).show()
  })
  autoUpdater.on('error', () => {})
}

// ===== TRAY =====
function setupTray() {
  if (tray) return // Déjà créé
  try {
    const path = require('path')
    const iconPath = path.join(__dirname, 'assets', 'icon.png')
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(icon)
    tray.setToolTip('StudyTokens')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '📖 Ouvrir StudyTokens',
        click: () => { mainWindow.show(); mainWindow.focus(); }
      },
      { type: 'separator' },
      {
        label: '⏱ Démarrer une session  [Ctrl+Shift+T]',
        click: () => { mainWindow.show(); mainWindow.focus(); mainWindow.webContents.executeJavaScript("navigate('timer')"); }
      },
      { type: 'separator' },
      {
        label: '✕ Quitter',
        click: () => { app.isQuitting = true; app.quit(); }
      }
    ])

    tray.setContextMenu(contextMenu)

    // Double-clic sur l'icône = ouvrir
    tray.on('double-click', () => {
      mainWindow.show()
      mainWindow.focus()
    })
  } catch(e) {
    console.error('[Tray] Erreur:', e)
  }
}

// ===== WINDOW =====
function createWindow() {
  const savedZoom = store.get('zoomFactor', 1.0)
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      zoomFactor: savedZoom,
    },
    frame: false, backgroundColor: '#03060f', show: false,
  })
  mainWindow.loadURL(`http://localhost:${localPort}/index.html`)

  // Autoriser les popups Google OAuth
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Laisser Firebase gérer ses propres popups OAuth
    if (url.includes('accounts.google.com') || url.includes('firebaseapp.com') || url.includes('googleapis.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500, height: 650,
          webPreferences: { contextIsolation: true, nodeIntegration: false }
        }
      }
    }
    // Ouvrir les autres liens externes dans le navigateur
    require('electron').shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.webContents.setZoomFactor(savedZoom)
    setupAutoUpdater()
    setupTray()
  })

  // Minimiser dans le tray au lieu de fermer
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  // F12 pour ouvrir les DevTools (debug)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Log toutes les erreurs renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) console.error(`[Renderer ${line}] ${message}`)
  })
}

app.whenReady().then(async () => {
  await startLocalServer()
  createWindow()
  setupGlobalShortcuts()
})

// ===== GLOBAL SHORTCUTS =====
function setupGlobalShortcuts() {
  // Ctrl+Shift+S — Démarrer/Arrêter le timer
  globalShortcut.register('CmdOrCtrl+Shift+S', () => {
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        if (typeof timerState !== 'undefined') {
          if (timerState.running) stopTimer();
          else startTimer();
        }
      `).catch(() => {})
      if (!mainWindow.isVisible()) { mainWindow.show(); mainWindow.focus(); }
    }
  })

  // Ctrl+Shift+P — Pause
  globalShortcut.register('CmdOrCtrl+Shift+P', () => {
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        if (typeof timerState !== 'undefined') {
          if (timerState.running) pauseTimer();
          else if (timerState.paused) startTimer();
        }
      `).catch(() => {})
    }
  })

  // Ctrl+Shift+O — Ouvrir/Afficher l'app
  globalShortcut.register('CmdOrCtrl+Shift+O', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  // Ctrl+Shift+T — Naviguer vers le timer
  globalShortcut.register('CmdOrCtrl+Shift+T', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.executeJavaScript("navigate('timer')").catch(() => {})
    }
  })

  console.log('[StudyTokens] Raccourcis globaux actifs: Ctrl+Shift+S/P/O/T')
}
app.on('window-all-closed', (e) => {
  // Ne pas quitter si on minimise dans le tray
  // L'utilisateur doit passer par "Quitter" dans le menu tray
})

app.on('before-quit', () => {
  app.isQuitting = true
  globalShortcut.unregisterAll()
  localServer?.close()
  tray?.destroy()
})
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// ===== STORE =====
ipcMain.handle('store:get', (_, key, def) => store.get(key, def))
ipcMain.handle('store:set', (_, key, val) => { store.set(key, val); return true })

// ===== WINDOW CONTROLS =====
ipcMain.on('win:minimize', () => mainWindow.minimize())
ipcMain.on('win:maximize', () => mainWindow.isMaximized() ? mainWindow.restore() : mainWindow.maximize())
ipcMain.on('win:close', () => {
  // Minimize to tray instead of closing
  mainWindow.hide()
})
ipcMain.on('win:quit', () => {
  app.isQuitting = true
  app.quit()
})
ipcMain.on('win:setZoom', (_, factor) => { mainWindow.webContents.setZoomFactor(factor); store.set('zoomFactor', factor) })

// ===== NOTIFICATIONS =====
ipcMain.on('notify', (_, { title, body }) => {
  if (Notification.isSupported()) new Notification({ title, body }).show()
})

// ===== UPDATER =====
ipcMain.on('updater:install', () => autoUpdater.quitAndInstall())
ipcMain.on('updater:check', () => autoUpdater.checkForUpdates().catch(() => {}))

// ===== GIT / PUBLISH AUTOMATION =====
function runCommand(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: cwd || __dirname, env: { ...process.env }, timeout: 120000 }, (err, stdout, stderr) => {
      if (err) reject({ error: err.message, stderr })
      else resolve({ stdout, stderr })
    })
  })
}

ipcMain.handle('git:status', async () => {
  try {
    const result = await runCommand('git status --porcelain', __dirname)
    return { ok: true, output: result.stdout }
  } catch(e) { return { ok: false, error: e.error } }
})

ipcMain.handle('git:push', async (_, { message, ghToken }) => {
  try {
    await runCommand('git add .', __dirname)
    await runCommand(`git commit -m "${message}"`, __dirname)
    // Set remote URL with token
    const repoUrl = `https://${ghToken}@github.com/Mickado-Makoto/StudyTokens.git`
    await runCommand(`git remote set-url origin ${repoUrl}`, __dirname)
    await runCommand('git push origin master', __dirname)
    // Reset remote URL without token for security
    await runCommand('git remote set-url origin https://github.com/Mickado-Makoto/StudyTokens.git', __dirname)
    return { ok: true }
  } catch(e) {
    return { ok: false, error: e.error || e.stderr }
  }
})

ipcMain.handle('git:publish', async (_, { ghToken }) => {
  try {
    const env = { ...process.env, GH_TOKEN: ghToken }
    const result = await new Promise((resolve, reject) => {
      exec('npm run build -- --publish always', { cwd: __dirname, env, timeout: 300000 }, (err, stdout, stderr) => {
        if (err) reject({ error: err.message, stderr })
        else resolve({ stdout, stderr })
      })
    })
    return { ok: true, output: result.stdout }
  } catch(e) {
    return { ok: false, error: e.error || e.stderr }
  }
})

// ===== TICKET / ERROR REPORTING =====
ipcMain.on('report:error', (_, data) => {
  console.error('[ErrorReport]', JSON.stringify(data, null, 2))
  // Write to log file
  const logPath = require('path').join(require('os').tmpdir(), 'studytokens-errors.log')
  const line = `[${new Date().toISOString()}] ${data.errCode} | ${data.message}\n`
  require('fs').appendFile(logPath, line, () => {})
})

// ===== SHORTCUTS INFO =====
ipcMain.handle('shortcuts:list', () => ({
  start_stop: 'Ctrl+Shift+S',
  pause:      'Ctrl+Shift+P',
  toggle_app: 'Ctrl+Shift+O',
  go_timer:   'Ctrl+Shift+T',
}))

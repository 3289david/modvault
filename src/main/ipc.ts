import { ipcMain, shell, dialog, BrowserWindow } from 'electron'
import { store } from './store'
import * as instanceManager from './services/instance-manager'
import { detectConflicts } from './services/conflict-detector'
import { analyzeCrashLog } from './services/crash-analyzer'
import { searchModrinth, getModrinthVersions } from './services/modrinth-api'
import { searchCurseForge, getCurseForgeVersions, isCurseForgeConfigured } from './services/curseforge-api'
import {
  installMod,
  uninstallMod,
  toggleMod,
  importLocalMod
} from './services/mod-installer'
import { loginMicrosoft, loginOffline, logout, refreshAuth } from './services/auth-manager'
import { detectJava } from './services/java-manager'
import { getReleaseVersions, getLoaderVersions } from './services/version-manager'
import { launchInstance, stopInstance, isRunning, getRunningIds } from './services/minecraft-launcher'
import { installLoader } from './services/loader-installer'
import * as fs from 'fs'
import * as path from 'path'

export function registerIpcHandlers(getWindow: () => BrowserWindow | null) {
  // ── Window controls ────────────────────────────────────────────────────────
  ipcMain.handle('window:minimize', () => getWindow()?.minimize())
  ipcMain.handle('window:maximize', () => {
    const win = getWindow()
    if (!win) return
    win.isMaximized() ? win.restore() : win.maximize()
  })
  ipcMain.handle('window:close', () => getWindow()?.close())
  ipcMain.handle('window:is-maximized', () => getWindow()?.isMaximized() ?? false)

  // ── Settings ───────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => store.getSettings())
  ipcMain.handle('settings:save', (_, settings) => store.saveSettings(settings))

  // ── Instances ──────────────────────────────────────────────────────────────
  ipcMain.handle('instances:get-all', () => instanceManager.getAll())
  ipcMain.handle('instances:create', (_, config) => instanceManager.create(config))
  ipcMain.handle('instances:update', (_, id, patch) => instanceManager.update(id, patch))
  ipcMain.handle('instances:delete', (_, id) => instanceManager.remove(id))
  ipcMain.handle('instances:open-folder', (_, id) => instanceManager.openFolder(id))
  ipcMain.handle('instances:refresh-count', (_, id) => instanceManager.refreshModCount(id))

  // ── Installed mods ─────────────────────────────────────────────────────────
  ipcMain.handle('mods:get-installed', (_, instanceId) => store.getInstalledMods(instanceId))
  ipcMain.handle('mods:install', (_, params) => installMod(params, getWindow()))
  ipcMain.handle('mods:uninstall', (_, instanceId, fileId) => uninstallMod(instanceId, fileId))
  ipcMain.handle('mods:toggle', (_, instanceId, fileId, enabled) =>
    toggleMod(instanceId, fileId, enabled)
  )
  ipcMain.handle('mods:import-local', async (_, instanceId) => {
    const result = await dialog.showOpenDialog(getWindow()!, {
      title: 'Import Mod JAR',
      filters: [{ name: 'Mod JAR', extensions: ['jar'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return null
    return importLocalMod(instanceId, result.filePaths[0])
  })

  // Apply instance mods to .minecraft/mods
  ipcMain.handle('mods:apply-to-minecraft', async (_, instanceId) => {
    const instance = instanceManager.getById(instanceId)
    if (!instance) throw new Error('Instance not found')
    const settings = store.getSettings()
    const targetDir = path.join(settings.minecraftPath, 'mods')
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
    const srcFiles = fs.readdirSync(instance.modsFolder).filter((f) => f.endsWith('.jar'))
    let copied = 0
    for (const file of srcFiles) {
      fs.copyFileSync(path.join(instance.modsFolder, file), path.join(targetDir, file))
      copied++
    }
    shell.openPath(targetDir)
    return { copied, targetDir }
  })

  // ── Search ─────────────────────────────────────────────────────────────────
  ipcMain.handle('search:modrinth', (_, params) => searchModrinth(params))
  ipcMain.handle('search:curseforge', (_, params) => searchCurseForge(params))
  ipcMain.handle('versions:modrinth', (_, projectId, loader, mcVersion) =>
    getModrinthVersions(projectId, loader, mcVersion)
  )
  ipcMain.handle('versions:curseforge', (_, modId, loader, mcVersion) =>
    getCurseForgeVersions(modId, loader, mcVersion)
  )
  ipcMain.handle('curseforge:is-configured', () => isCurseForgeConfigured())

  // ── Analysis ───────────────────────────────────────────────────────────────
  ipcMain.handle('analysis:conflicts', (_, instanceId) => {
    const mods = store.getInstalledMods(instanceId)
    return detectConflicts(mods)
  })
  ipcMain.handle('analysis:crash', (_, content) => analyzeCrashLog(content))

  // ── Auth ───────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:get', () => store.getAuth())

  ipcMain.handle('auth:microsoft-login', async () => {
    const win = getWindow()
    if (!win) throw new Error('No window available')
    return loginMicrosoft(win)
  })

  ipcMain.handle('auth:offline-login', (_, username: string) => {
    if (!username?.trim()) throw new Error('Username cannot be empty')
    return loginOffline(username)
  })

  ipcMain.handle('auth:logout', () => logout())

  ipcMain.handle('auth:refresh', async () => {
    const auth = store.getAuth()
    if (!auth) return null
    return refreshAuth(auth)
  })

  // ── Java ───────────────────────────────────────────────────────────────────
  ipcMain.handle('java:detect', (_, mcVersion?: string) => detectJava(mcVersion))

  // ── Minecraft + loader versions ────────────────────────────────────────────
  ipcMain.handle('versions:minecraft', () => getReleaseVersions())
  ipcMain.handle('versions:loader', (_, loader: string, mcVersion: string) =>
    getLoaderVersions(loader, mcVersion)
  )

  // ── Loader install ─────────────────────────────────────────────────────────
  ipcMain.handle('loader:install', async (_, instanceId: string) => {
    const instance = instanceManager.getById(instanceId)
    if (!instance) throw new Error('Instance not found')
    if (instance.loader === 'vanilla') {
      return { versionId: instance.minecraftVersion, loaderVersion: '' }
    }
    const settings = store.getSettings()
    const result = await installLoader(
      instance.loader,
      instance.minecraftVersion,
      instance.loaderVersion ?? 'latest',
      settings.minecraftPath,
      (msg) =>
        getWindow()?.webContents.send('launch-progress', {
          instanceId,
          message: msg,
          progress: 50,
          stage: 'downloading'
        })
    )
    instanceManager.update(instanceId, {
      loaderVersion: result.loaderVersion,
      loaderInstalled: true
    })
    return result
  })

  // ── Launch ─────────────────────────────────────────────────────────────────
  ipcMain.handle('launch:start', async (_, instanceId: string) => {
    await launchInstance(instanceId, getWindow())
  })

  ipcMain.handle('launch:stop', (_, instanceId: string) => stopInstance(instanceId))
  ipcMain.handle('launch:is-running', (_, instanceId: string) => isRunning(instanceId))
  ipcMain.handle('launch:running-ids', () => getRunningIds())

  // ── System ─────────────────────────────────────────────────────────────────
  ipcMain.handle('system:open-external', (_, url) => shell.openExternal(url))
  ipcMain.handle('system:open-path', (_, p) => shell.openPath(p))

  ipcMain.handle('system:select-folder', async () => {
    const result = await dialog.showOpenDialog(getWindow()!, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('system:select-file', async (_, filters) => {
    const result = await dialog.showOpenDialog(getWindow()!, {
      filters: filters ?? [{ name: 'All Files', extensions: ['*'] }],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0]
  })
}

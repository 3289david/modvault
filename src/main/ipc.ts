import { ipcMain, shell, dialog, BrowserWindow } from 'electron'
import { store } from './store'
import * as instanceManager from './services/instance-manager'
import { detectConflicts } from './services/conflict-detector'
import { analyzeCrashLog } from './services/crash-analyzer'
import { searchModrinth, getModrinthVersions } from './services/modrinth-api'
import { searchCurseForge, getCurseForgeVersions } from './services/curseforge-api'
import {
  installMod,
  uninstallMod,
  toggleMod,
  importLocalMod
} from './services/mod-installer'

export function registerIpcHandlers(getWindow: () => BrowserWindow | null) {
  // Window controls
  ipcMain.handle('window:minimize', () => getWindow()?.minimize())
  ipcMain.handle('window:maximize', () => {
    const win = getWindow()
    if (!win) return
    win.isMaximized() ? win.restore() : win.maximize()
  })
  ipcMain.handle('window:close', () => getWindow()?.close())
  ipcMain.handle('window:is-maximized', () => getWindow()?.isMaximized() ?? false)

  // Settings
  ipcMain.handle('settings:get', () => store.getSettings())
  ipcMain.handle('settings:save', (_, settings) => store.saveSettings(settings))

  // Instances
  ipcMain.handle('instances:get-all', () => instanceManager.getAll())
  ipcMain.handle('instances:create', (_, config) => instanceManager.create(config))
  ipcMain.handle('instances:update', (_, id, patch) => instanceManager.update(id, patch))
  ipcMain.handle('instances:delete', (_, id) => instanceManager.remove(id))
  ipcMain.handle('instances:open-folder', (_, id) => instanceManager.openFolder(id))
  ipcMain.handle('instances:refresh-count', (_, id) => instanceManager.refreshModCount(id))

  // Installed Mods
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

  // Search
  ipcMain.handle('search:modrinth', (_, params) => searchModrinth(params))

  ipcMain.handle('search:curseforge', (_, params) => {
    const settings = store.getSettings()
    return searchCurseForge(params, settings.curseforgeApiKey)
  })

  ipcMain.handle('versions:modrinth', (_, projectId, loader, mcVersion) =>
    getModrinthVersions(projectId, loader, mcVersion)
  )

  ipcMain.handle('versions:curseforge', (_, modId, loader, mcVersion) => {
    const settings = store.getSettings()
    return getCurseForgeVersions(modId, settings.curseforgeApiKey, loader, mcVersion)
  })

  // Analysis
  ipcMain.handle('analysis:conflicts', (_, instanceId) => {
    const mods = store.getInstalledMods(instanceId)
    return detectConflicts(mods)
  })

  ipcMain.handle('analysis:crash', (_, content) => analyzeCrashLog(content))

  // Apply instance mods to .minecraft folder
  ipcMain.handle('mods:apply-to-minecraft', async (_, instanceId) => {
    const instance = instanceManager.getById(instanceId)
    if (!instance) throw new Error('Instance not found')
    const settings = store.getSettings()
    const targetDir = require('path').join(settings.minecraftPath, 'mods')
    const fs = require('fs')

    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })

    const srcFiles = fs.readdirSync(instance.modsFolder).filter((f: string) => f.endsWith('.jar'))
    let copied = 0
    for (const file of srcFiles) {
      const src = require('path').join(instance.modsFolder, file)
      const dest = require('path').join(targetDir, file)
      fs.copyFileSync(src, dest)
      copied++
    }
    shell.openPath(targetDir)
    return { copied, targetDir }
  })

  // System
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

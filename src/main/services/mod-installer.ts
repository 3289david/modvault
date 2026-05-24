import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import * as crypto from 'crypto'
import { BrowserWindow } from 'electron'
import type { InstalledMod, InstallModParams, DownloadProgress } from '../../shared/types'
import { getBestVersion, getModrinthVersions } from './modrinth-api'
import { getCurseForgeVersions } from './curseforge-api'
import { analyzeJar } from './jar-analyzer'
import { store } from '../store'
import * as instanceManager from './instance-manager'

function sendProgress(win: BrowserWindow | null, progress: DownloadProgress) {
  win?.webContents.send('download-progress', progress)
}

function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (bytes: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)

    const request = protocol.get(url, { headers: { 'User-Agent': 'ModVault/1.0.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        fs.unlinkSync(destPath)
        downloadFile(res.headers.location!, destPath, onProgress).then(resolve).catch(reject)
        return
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode}`))
        return
      }

      const total = parseInt(res.headers['content-length'] ?? '0', 10)
      let received = 0

      res.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (onProgress && total > 0) onProgress(received, total)
      })

      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    })

    request.on('error', (err) => { fs.unlinkSync(destPath); reject(err) })
    file.on('error', (err) => { fs.unlinkSync(destPath); reject(err) })
  })
}

export async function installMod(
  params: InstallModParams,
  win: BrowserWindow | null
): Promise<InstalledMod> {
  const instance = instanceManager.getById(params.instanceId)
  if (!instance) throw new Error('Instance not found')

  sendProgress(win, {
    modId: params.modId,
    fileName: 'Fetching version info...',
    progress: 0,
    status: 'downloading'
  })

  let downloadUrl: string
  let fileName: string

  if (params.source === 'modrinth') {
    let version = await getBestVersion(params.modId, instance.loader, instance.minecraftVersion)

    if (params.versionId && params.versionId !== 'auto') {
      try {
        const versions = await getModrinthVersions(params.modId)
        version = versions.find((v) => v.id === params.versionId) ?? version
      } catch { /* keep the best-version fallback */ }
    }

    if (!version) {
      throw new Error(
        `No compatible version of "${params.modId}" found for ${instance.loader} ${instance.minecraftVersion}`
      )
    }

    const file = version.files.find((f) => f.primary) ?? version.files[0]
    if (!file) throw new Error('No download file found')

    downloadUrl = file.url
    fileName = file.filename
  } else {
    const versions = await getCurseForgeVersions(
      params.modId,
      instance.loader,
      instance.minecraftVersion
    )
    const version = versions.find((v) => v.releaseType === 'release') ?? versions[0]
    if (!version) throw new Error('No compatible version found on CurseForge')

    const file = version.files[0]
    if (!file || !file.url) throw new Error('CurseForge download URL unavailable. A CF API key may be required.')

    downloadUrl = file.url
    fileName = params.fileName ?? file.filename
  }

  const destPath = path.join(instance.modsFolder, fileName)

  await downloadFile(downloadUrl, destPath, (received, total) => {
    sendProgress(win, {
      modId: params.modId,
      fileName,
      progress: Math.round((received / total) * 90),
      status: 'downloading'
    })
  })

  sendProgress(win, { modId: params.modId, fileName, progress: 95, status: 'installing' })

  const meta = analyzeJar(destPath, fileName)
  const fileId = crypto.randomUUID()

  const installedMod: InstalledMod = {
    id: meta?.id ?? fileId,
    fileId,
    name: meta?.name ?? fileName.replace('.jar', ''),
    version: meta?.version ?? '0.0.0',
    description: meta?.description ?? '',
    loaders: meta?.loaders ?? [instance.loader],
    mcVersions: [instance.minecraftVersion],
    enabled: true,
    filePath: destPath,
    fileName,
    dependencies: meta?.dependencies ?? [],
    source: params.source,
    sourceId: params.versionId,
    projectId: params.modId,
    categories: meta?.categories ?? [],
    authors: meta?.authors ?? [],
    installDate: new Date().toISOString(),
    fileSize: fs.statSync(destPath).size
  }

  const mods = store.getInstalledMods(params.instanceId)
  const existingIdx = mods.findIndex((m) => m.id === installedMod.id)
  if (existingIdx >= 0) {
    mods[existingIdx] = installedMod
  } else {
    mods.push(installedMod)
  }
  store.saveInstalledMods(params.instanceId, mods)
  instanceManager.refreshModCount(params.instanceId)

  sendProgress(win, { modId: params.modId, fileName, progress: 100, status: 'done' })

  return installedMod
}

export function uninstallMod(instanceId: string, fileId: string) {
  const mods = store.getInstalledMods(instanceId)
  const mod = mods.find((m) => m.fileId === fileId)
  if (!mod) return

  if (fs.existsSync(mod.filePath)) fs.unlinkSync(mod.filePath)

  const updated = mods.filter((m) => m.fileId !== fileId)
  store.saveInstalledMods(instanceId, updated)
  instanceManager.refreshModCount(instanceId)
}

export function toggleMod(instanceId: string, fileId: string, enabled: boolean) {
  const mods = store.getInstalledMods(instanceId)
  const mod = mods.find((m) => m.fileId === fileId)
  if (!mod) return

  const disabledPath = mod.filePath + '.disabled'

  if (!enabled && mod.enabled && fs.existsSync(mod.filePath)) {
    fs.renameSync(mod.filePath, disabledPath)
    mod.filePath = disabledPath
    mod.fileName = mod.fileName + '.disabled'
  } else if (enabled && !mod.enabled && fs.existsSync(disabledPath)) {
    const enabledPath = disabledPath.replace('.disabled', '')
    fs.renameSync(disabledPath, enabledPath)
    mod.filePath = enabledPath
    mod.fileName = mod.fileName.replace('.disabled', '')
  }

  mod.enabled = enabled
  store.saveInstalledMods(instanceId, mods)
}

export async function importLocalMod(instanceId: string, filePath: string): Promise<InstalledMod> {
  const instance = instanceManager.getById(instanceId)
  if (!instance) throw new Error('Instance not found')

  const fileName = path.basename(filePath)
  const destPath = path.join(instance.modsFolder, fileName)

  fs.copyFileSync(filePath, destPath)

  const meta = analyzeJar(destPath, fileName)
  const fileId = crypto.randomUUID()

  const installedMod: InstalledMod = {
    id: meta?.id ?? fileId,
    fileId,
    name: meta?.name ?? fileName.replace('.jar', ''),
    version: meta?.version ?? '0.0.0',
    description: meta?.description ?? '',
    loaders: meta?.loaders ?? [],
    mcVersions: [instance.minecraftVersion],
    enabled: true,
    filePath: destPath,
    fileName,
    dependencies: meta?.dependencies ?? [],
    source: 'manual',
    categories: meta?.categories ?? [],
    authors: meta?.authors ?? [],
    installDate: new Date().toISOString(),
    fileSize: fs.statSync(destPath).size
  }

  const mods = store.getInstalledMods(instanceId)
  mods.push(installedMod)
  store.saveInstalledMods(instanceId, mods)
  instanceManager.refreshModCount(instanceId)

  return installedMod
}

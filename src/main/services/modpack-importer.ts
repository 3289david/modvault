import AdmZip from 'adm-zip'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import * as crypto from 'crypto'
import { BrowserWindow } from 'electron'
import { store } from '../store'
import * as instanceManager from './instance-manager'
import { analyzeJar } from './jar-analyzer'
import type { InstalledMod, LoaderType, CreateInstanceConfig } from '../../shared/types'

// ---------- shared download util ----------

function downloadFileDirect(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)

    const req = protocol.get(url, { headers: { 'User-Agent': 'ModVault/1.0.0' } }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        file.close()
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
        downloadFileDirect(res.headers.location, destPath).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${res.statusCode} — ${url}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    })
    req.on('error', (err) => { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); reject(err) })
    file.on('error', (err) => { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); reject(err) })
  })
}

export interface ImportProgress {
  current: number
  total: number
  message: string
  stage: 'extracting' | 'installing' | 'done' | 'error'
}

function sendProgress(win: BrowserWindow | null, p: ImportProgress) {
  win?.webContents.send('modpack-progress', p)
}

function registerJar(
  instanceId: string,
  filePath: string,
  loader: LoaderType,
  mcVersion: string,
  source: 'modrinth' | 'curseforge' | 'manual'
): InstalledMod {
  const fileName = path.basename(filePath)
  const meta = analyzeJar(filePath, fileName)
  const fileId = crypto.randomUUID()

  const mod: InstalledMod = {
    id: meta?.id ?? fileId,
    fileId,
    name: meta?.name ?? fileName.replace('.jar', ''),
    version: meta?.version ?? '0.0.0',
    description: meta?.description ?? '',
    loaders: meta?.loaders ?? [loader],
    mcVersions: [mcVersion],
    enabled: true,
    filePath,
    fileName,
    dependencies: meta?.dependencies ?? [],
    source,
    categories: meta?.categories ?? [],
    authors: meta?.authors ?? [],
    installDate: new Date().toISOString(),
    fileSize: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
  }

  const mods = store.getInstalledMods(instanceId)
  const existingIdx = mods.findIndex((m) => m.id === mod.id)
  if (existingIdx >= 0) mods[existingIdx] = mod
  else mods.push(mod)
  store.saveInstalledMods(instanceId, mods)
  return mod
}

// ─────────────────────────────────────────────────────────────────────────────
// Modrinth Pack (.mrpack)
// ─────────────────────────────────────────────────────────────────────────────

interface MrpackIndex {
  formatVersion: number
  game: string
  versionId: string
  name: string
  dependencies: Record<string, string>
  files: Array<{
    path: string
    hashes?: Record<string, string>
    downloads: string[]
    fileSize?: number
    env?: { client?: string; server?: string }
  }>
}

export async function importMrpack(
  filePath: string,
  win: BrowserWindow | null
): Promise<string> {
  sendProgress(win, { current: 0, total: 1, message: 'Extracting pack…', stage: 'extracting' })

  const zip = new AdmZip(filePath)
  const indexEntry = zip.getEntry('modrinth.index.json')
  if (!indexEntry) throw new Error('Not a valid .mrpack — missing modrinth.index.json')

  const index: MrpackIndex = JSON.parse(indexEntry.getData().toString('utf8'))

  // Parse loader from dependencies
  const deps = index.dependencies ?? {}
  const mcVersion = deps['minecraft'] ?? '1.20.1'
  let loader: LoaderType = 'vanilla'
  let loaderVersion = ''

  if (deps['fabric-loader']) { loader = 'fabric'; loaderVersion = deps['fabric-loader'] }
  else if (deps['quilt-loader']) { loader = 'quilt'; loaderVersion = deps['quilt-loader'] }
  else if (deps['forge']) { loader = 'forge'; loaderVersion = deps['forge'] }
  else if (deps['neoforge']) { loader = 'neoforge'; loaderVersion = deps['neoforge'] }

  const config: CreateInstanceConfig = {
    name: index.name || path.basename(filePath, '.mrpack'),
    minecraftVersion: mcVersion,
    loader,
    loaderVersion,
    description: `Imported from ${path.basename(filePath)}`
  }
  const instance = instanceManager.create(config)
  const instanceDir = path.dirname(instance.modsFolder)

  // Download mod files (skip server-only)
  const clientFiles = index.files.filter(
    (f) => !f.env || f.env.client !== 'unsupported'
  )
  const total = clientFiles.length
  let current = 0

  for (const file of clientFiles) {
    current++
    const basename = path.basename(file.path)
    sendProgress(win, { current, total, message: `Downloading ${basename}`, stage: 'installing' })

    if (!file.downloads?.length) continue

    const destPath = path.join(instanceDir, file.path)
    fs.mkdirSync(path.dirname(destPath), { recursive: true })

    try {
      await downloadFileDirect(file.downloads[0], destPath)
      if (file.path.startsWith('mods/') && file.path.endsWith('.jar')) {
        registerJar(instance.id, destPath, loader, mcVersion, 'modrinth')
      }
    } catch (e) {
      console.warn(`[modpack-importer] skipped ${basename}:`, e)
    }
  }

  // Apply overrides (server-overrides too, but skip server-overrides)
  for (const entry of zip.getEntries()) {
    if (
      !entry.isDirectory &&
      (entry.entryName.startsWith('overrides/') ||
        entry.entryName.startsWith('client-overrides/'))
    ) {
      const prefix = entry.entryName.startsWith('overrides/') ? 'overrides/' : 'client-overrides/'
      const relPath = entry.entryName.slice(prefix.length)
      if (!relPath) continue
      const destPath = path.join(instanceDir, relPath)
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.writeFileSync(destPath, entry.getData())
    }
  }

  instanceManager.refreshModCount(instance.id)
  sendProgress(win, { current: total, total, message: 'Done!', stage: 'done' })
  return instance.id
}

// ─────────────────────────────────────────────────────────────────────────────
// CurseForge Pack (.zip with manifest.json)
// ─────────────────────────────────────────────────────────────────────────────

interface CFManifest {
  minecraft: {
    version: string
    modLoaders: Array<{ id: string; primary: boolean }>
  }
  name: string
  version: string
  files: Array<{ projectID: number; fileID: number; required: boolean }>
  overrides?: string
}

const CF_KEY: string = typeof __CF_API_KEY__ !== 'undefined' ? __CF_API_KEY__ : ''

async function getCFDownloadUrl(projectId: number, fileId: number): Promise<string | null> {
  if (!CF_KEY) return null
  try {
    const resp = await axios.get(
      `https://api.curseforge.com/v1/mods/${projectId}/files/${fileId}/download-url`,
      { headers: { 'x-api-key': CF_KEY, Accept: 'application/json' }, timeout: 8000 }
    )
    return resp.data.data ?? null
  } catch {
    return null
  }
}

async function getCFFileInfo(
  projectId: number,
  fileId: number
): Promise<{ fileName: string; downloadUrl: string | null } | null> {
  if (!CF_KEY) return null
  try {
    const resp = await axios.get(
      `https://api.curseforge.com/v1/mods/${projectId}/files/${fileId}`,
      { headers: { 'x-api-key': CF_KEY, Accept: 'application/json' }, timeout: 8000 }
    )
    const f = resp.data.data
    return { fileName: f.fileName, downloadUrl: f.downloadUrl ?? null }
  } catch {
    return null
  }
}

export async function importCurseForgePack(
  filePath: string,
  win: BrowserWindow | null
): Promise<string> {
  sendProgress(win, { current: 0, total: 1, message: 'Extracting pack…', stage: 'extracting' })

  const zip = new AdmZip(filePath)
  const manifestEntry = zip.getEntry('manifest.json')
  if (!manifestEntry) throw new Error('Not a valid CurseForge pack — missing manifest.json')

  const manifest: CFManifest = JSON.parse(manifestEntry.getData().toString('utf8'))

  // Parse loader
  const loaderRaw = manifest.minecraft.modLoaders?.find((l) => l.primary)?.id ?? ''
  let loader: LoaderType = 'forge'
  let loaderVersion = ''
  if (loaderRaw.startsWith('forge-')) { loader = 'forge'; loaderVersion = loaderRaw.slice(6) }
  else if (loaderRaw.startsWith('neoforge-')) { loader = 'neoforge'; loaderVersion = loaderRaw.slice(9) }
  else if (loaderRaw.startsWith('fabric-')) { loader = 'fabric'; loaderVersion = loaderRaw.slice(7) }
  else if (loaderRaw.startsWith('quilt-')) { loader = 'quilt'; loaderVersion = loaderRaw.slice(6) }

  const mcVersion = manifest.minecraft.version ?? '1.20.1'

  const config: CreateInstanceConfig = {
    name: manifest.name || path.basename(filePath, '.zip'),
    minecraftVersion: mcVersion,
    loader,
    loaderVersion,
    description: `v${manifest.version} — Imported from ${path.basename(filePath)}`
  }
  const instance = instanceManager.create(config)
  const instanceDir = path.dirname(instance.modsFolder)

  const files = (manifest.files ?? []).filter((f) => f.required !== false)
  const total = files.length
  let current = 0
  let skipped = 0

  for (const file of files) {
    current++
    sendProgress(win, {
      current,
      total,
      message: `Downloading mod ${file.projectID}/${file.fileID}`,
      stage: 'installing'
    })

    const info = await getCFFileInfo(file.projectID, file.fileID)
    if (!info?.downloadUrl) {
      skipped++
      console.warn(`[modpack-importer] CF mod ${file.projectID}/${file.fileID} has no download URL (redistribution disabled?)`)
      continue
    }

    const destPath = path.join(instance.modsFolder, info.fileName)
    try {
      await downloadFileDirect(info.downloadUrl, destPath)
      registerJar(instance.id, destPath, loader, mcVersion, 'curseforge')
    } catch (e) {
      skipped++
      console.warn(`[modpack-importer] download failed for ${info.fileName}:`, e)
    }
  }

  // Apply overrides
  const overridesFolder = manifest.overrides ?? 'overrides'
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory && entry.entryName.startsWith(`${overridesFolder}/`)) {
      const relPath = entry.entryName.slice(overridesFolder.length + 1)
      if (!relPath) continue
      const destPath = path.join(instanceDir, relPath)
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.writeFileSync(destPath, entry.getData())
    }
  }

  instanceManager.refreshModCount(instance.id)

  const msg = skipped > 0
    ? `Done! (${skipped} mods skipped — CurseForge redistribution disabled)`
    : 'Done!'
  sendProgress(win, { current: total, total, message: msg, stage: 'done' })
  return instance.id
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-detect pack type and import
// ─────────────────────────────────────────────────────────────────────────────

export async function importModpack(
  filePath: string,
  win: BrowserWindow | null
): Promise<string> {
  const zip = new AdmZip(filePath)
  const entries = zip.getEntries().map((e) => e.entryName)

  if (entries.includes('modrinth.index.json')) {
    return importMrpack(filePath, win)
  }
  if (entries.includes('manifest.json')) {
    return importCurseForgePack(filePath, win)
  }
  throw new Error(
    'Unrecognised modpack format. Expected modrinth.index.json (Modrinth) or manifest.json (CurseForge).'
  )
}

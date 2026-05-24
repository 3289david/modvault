import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import { spawn } from 'child_process'
import type { LoaderType } from '../../shared/types'
import { findJavaPath } from './java-manager'

export interface LoaderInstallResult {
  versionId: string   // The "custom" version ID for MCLC
  loaderVersion: string
}

// ── Fabric ────────────────────────────────────────────────────────────────────
export async function installFabric(
  mcVersion: string,
  loaderVersion: string,
  minecraftPath: string
): Promise<LoaderInstallResult> {
  let actualLoader = loaderVersion

  if (!actualLoader || actualLoader === 'latest') {
    const resp = await axios.get(
      `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`,
      { timeout: 15000 }
    )
    const stable = resp.data.find((v: { loader: { stable: boolean; version: string } }) => v.loader.stable)
    actualLoader = stable?.loader?.version ?? resp.data[0]?.loader?.version
    if (!actualLoader) throw new Error(`No Fabric loader found for MC ${mcVersion}`)
  }

  const profileResp = await axios.get(
    `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${actualLoader}/profile/json`,
    { timeout: 15000 }
  )

  const versionId = `fabric-loader-${actualLoader}-${mcVersion}`
  const versionsDir = path.join(minecraftPath, 'versions', versionId)
  fs.mkdirSync(versionsDir, { recursive: true })
  fs.writeFileSync(
    path.join(versionsDir, `${versionId}.json`),
    JSON.stringify(profileResp.data, null, 2)
  )

  return { versionId, loaderVersion: actualLoader }
}

// ── Quilt ─────────────────────────────────────────────────────────────────────
export async function installQuilt(
  mcVersion: string,
  loaderVersion: string,
  minecraftPath: string
): Promise<LoaderInstallResult> {
  let actualLoader = loaderVersion

  if (!actualLoader || actualLoader === 'latest') {
    const resp = await axios.get('https://meta.quiltmc.org/v3/versions/loader', { timeout: 15000 })
    actualLoader = resp.data[0]?.version
    if (!actualLoader) throw new Error('No Quilt loader version found')
  }

  const profileResp = await axios.get(
    `https://meta.quiltmc.org/v3/versions/loader/${mcVersion}/${actualLoader}/profile/json`,
    { timeout: 15000 }
  )

  const versionId = `quilt-loader-${actualLoader}-${mcVersion}`
  const versionsDir = path.join(minecraftPath, 'versions', versionId)
  fs.mkdirSync(versionsDir, { recursive: true })
  fs.writeFileSync(
    path.join(versionsDir, `${versionId}.json`),
    JSON.stringify(profileResp.data, null, 2)
  )

  return { versionId, loaderVersion: actualLoader }
}

// ── Forge ─────────────────────────────────────────────────────────────────────
export async function installForge(
  mcVersion: string,
  forgeVersion: string,
  minecraftPath: string,
  javaPath: string,
  onProgress?: (msg: string) => void
): Promise<LoaderInstallResult> {
  let actualForge = forgeVersion

  if (!actualForge || actualForge === 'latest') {
    const resp = await axios.get(
      'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json',
      { timeout: 15000 }
    )
    const promos = resp.data.promos as Record<string, string>
    actualForge = promos[`${mcVersion}-recommended`] ?? promos[`${mcVersion}-latest`]
    if (!actualForge) throw new Error(`No Forge version found for MC ${mcVersion}`)
  }

  const installerName = `forge-${mcVersion}-${actualForge}-installer.jar`
  const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${actualForge}/${installerName}`
  const tempDir = path.join(minecraftPath, 'temp')
  fs.mkdirSync(tempDir, { recursive: true })
  const installerPath = path.join(tempDir, installerName)

  onProgress?.(`Downloading Forge ${actualForge}...`)
  await downloadFile(installerUrl, installerPath)

  onProgress?.('Running Forge installer (this may take a minute)...')
  await runInstaller(javaPath, installerPath, minecraftPath)

  try { fs.unlinkSync(installerPath) } catch { /* ok */ }

  const versionId = `${mcVersion}-forge-${actualForge}`
  return { versionId, loaderVersion: actualForge }
}

// ── NeoForge ──────────────────────────────────────────────────────────────────
export async function installNeoForge(
  mcVersion: string,
  neoforgeVersion: string,
  minecraftPath: string,
  javaPath: string,
  onProgress?: (msg: string) => void
): Promise<LoaderInstallResult> {
  let actualNeo = neoforgeVersion

  if (!actualNeo || actualNeo === 'latest') {
    const resp = await axios.get(
      'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml',
      { timeout: 15000 }
    )
    const xml = resp.data as string
    const mcMajorMinor = mcVersion.split('.').slice(1).join('.')
    const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
      .map((m) => m[1])
      .filter((v) => v.startsWith(mcMajorMinor))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    if (versions.length === 0) throw new Error(`No NeoForge version for MC ${mcVersion}`)
    actualNeo = versions[0]
  }

  const installerName = `neoforge-${actualNeo}-installer.jar`
  const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${actualNeo}/${installerName}`
  const tempDir = path.join(minecraftPath, 'temp')
  fs.mkdirSync(tempDir, { recursive: true })
  const installerPath = path.join(tempDir, installerName)

  onProgress?.(`Downloading NeoForge ${actualNeo}...`)
  await downloadFile(installerUrl, installerPath)

  onProgress?.('Running NeoForge installer...')
  await runInstaller(javaPath, installerPath, minecraftPath)

  try { fs.unlinkSync(installerPath) } catch { /* ok */ }

  const versionId = `neoforge-${actualNeo}`
  return { versionId, loaderVersion: actualNeo }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)

    const req = proto.get(url, { headers: { 'User-Agent': 'ModVault/1.0.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        try { fs.unlinkSync(dest) } catch { /* ok */ }
        return downloadFile(res.headers.location!, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: HTTP ${res.statusCode} — ${url}`))
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    })
    req.on('error', (e) => { try { fs.unlinkSync(dest) } catch { /* ok */ }; reject(e) })
    file.on('error', (e) => { try { fs.unlinkSync(dest) } catch { /* ok */ }; reject(e) })
  })
}

function runInstaller(javaPath: string, jarPath: string, minecraftDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      javaPath,
      ['-jar', jarPath, '--installClient', minecraftDir],
      { cwd: minecraftDir, stdio: 'pipe' }
    )

    let out = ''
    proc.stdout?.on('data', (d: Buffer) => { out += d.toString() })
    proc.stderr?.on('data', (d: Buffer) => { out += d.toString() })

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Installer exited with code ${code}.\n${out}`))
    })
    proc.on('error', reject)
  })
}

// ── Main entry ────────────────────────────────────────────────────────────────
export async function installLoader(
  loader: LoaderType,
  mcVersion: string,
  loaderVersion: string,
  minecraftPath: string,
  onProgress?: (msg: string) => void
): Promise<LoaderInstallResult> {
  // For Fabric/Quilt: check if version JSON already exists
  if (loader === 'fabric' || loader === 'quilt') {
    const prefix = loader === 'fabric' ? 'fabric-loader' : 'quilt-loader'
    // If we already have an installed loaderVersion, check it's there
    if (loaderVersion && loaderVersion !== 'latest') {
      const versionId = `${prefix}-${loaderVersion}-${mcVersion}`
      const jsonPath = path.join(minecraftPath, 'versions', versionId, `${versionId}.json`)
      if (fs.existsSync(jsonPath)) {
        return { versionId, loaderVersion }
      }
    }
  }

  switch (loader) {
    case 'fabric':
      onProgress?.('Installing Fabric loader...')
      return installFabric(mcVersion, loaderVersion, minecraftPath)

    case 'quilt':
      onProgress?.('Installing Quilt loader...')
      return installQuilt(mcVersion, loaderVersion, minecraftPath)

    case 'forge': {
      onProgress?.('Preparing Forge installation...')
      const java = await findJavaPath(mcVersion)
      if (!java) throw new Error('Java not found. Install Java or set the path in Settings → Launch.')
      return installForge(mcVersion, loaderVersion, minecraftPath, java, onProgress)
    }

    case 'neoforge': {
      onProgress?.('Preparing NeoForge installation...')
      const java = await findJavaPath(mcVersion)
      if (!java) throw new Error('Java not found. Install Java or set the path in Settings → Launch.')
      return installNeoForge(mcVersion, loaderVersion, minecraftPath, java, onProgress)
    }

    case 'vanilla':
      return { versionId: mcVersion, loaderVersion: '' }

    default:
      throw new Error(`Unknown loader: ${loader}`)
  }
}

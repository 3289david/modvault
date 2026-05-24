import * as path from 'path'
import { BrowserWindow } from 'electron'
import { store } from '../store'
import * as instanceManager from './instance-manager'
import { getMCLCAuth, refreshAuth } from './auth-manager'
import { findJavaPath } from './java-manager'
import { installLoader } from './loader-installer'
import type { LaunchProgress, GameLogEntry } from '../../shared/types'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require('minecraft-launcher-core')

// ── Running instances tracker ─────────────────────────────────────────────────
interface RunningInstance {
  client: InstanceType<typeof Client>
}

const running = new Map<string, RunningInstance>()

export function isRunning(instanceId: string): boolean {
  return running.has(instanceId)
}

export function getRunningIds(): string[] {
  return Array.from(running.keys())
}

// ── Main launch function ──────────────────────────────────────────────────────
export async function launchInstance(
  instanceId: string,
  win: BrowserWindow | null
): Promise<void> {
  if (running.has(instanceId)) throw new Error('This instance is already running')

  const instance = instanceManager.getById(instanceId)
  if (!instance) throw new Error('Instance not found')

  const settings = store.getSettings()

  // ── Auth ──────────────────────────────────────────────────────────────────
  let auth = store.getAuth()
  if (!auth) throw new Error('Not logged in. Please sign in from the dashboard.')

  if (auth.type === 'microsoft' && auth.expiresAt && auth.expiresAt < Date.now() + 60_000) {
    const refreshed = await refreshAuth(auth)
    if (!refreshed) throw new Error('Your session has expired. Please sign in again.')
    auth = refreshed
  }

  // ── Java ──────────────────────────────────────────────────────────────────
  const javaPath = (settings.javaPath?.trim()) || (await findJavaPath(instance.minecraftVersion))
  if (!javaPath) {
    throw new Error(
      'Java not found. Please install Java 17+ or set the path in Settings → Launch tab.'
    )
  }

  const root = settings.minecraftPath             // .minecraft — version JARs, libraries, assets
  const gameDirectory = path.dirname(instance.modsFolder) // our instance dir — saves, mods, config

  // ── Loader install / verify ───────────────────────────────────────────────
  sendProgress(win, instanceId, 'Checking mod loader...', 5, 'checking')

  let customVersionId: string | undefined

  if (instance.loader !== 'vanilla') {
    const result = await installLoader(
      instance.loader,
      instance.minecraftVersion,
      instance.loaderVersion ?? 'latest',
      root,
      (msg) => sendProgress(win, instanceId, msg, 20, 'downloading')
    )
    customVersionId = result.versionId

    // Persist resolved loader version so next launch is instant
    if (!instance.loaderVersion || instance.loaderVersion === 'latest') {
      instanceManager.update(instanceId, {
        loaderVersion: result.loaderVersion,
        loaderInstalled: true
      })
    } else if (!instance.loaderInstalled) {
      instanceManager.update(instanceId, { loaderInstalled: true })
    }
  }

  // ── Build MCLC options ────────────────────────────────────────────────────
  sendProgress(win, instanceId, 'Starting Minecraft...', 30, 'launching')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: Record<string, any> = {
    clientPackage: null,
    authorization: getMCLCAuth(auth),
    root,
    javaPath,
    version: {
      number: instance.minecraftVersion,
      type: 'release',
      ...(customVersionId ? { custom: customVersionId } : {})
    },
    memory: {
      max: `${settings.maxMemoryMB ?? 4096}M`,
      min: `${settings.minMemoryMB ?? 1024}M`
    },
    overrides: {
      gameDirectory
    }
  }

  // Custom JVM args from settings
  const extraArgs = settings.jvmArgs?.trim()
    ? settings.jvmArgs.trim().split(/\s+/)
    : []

  if (extraArgs.length > 0) {
    opts.customArgs = extraArgs
  }

  // ── Launch ────────────────────────────────────────────────────────────────
  const client = new Client()
  running.set(instanceId, { client })

  client.on('debug', (e: unknown) => {
    sendLog(win, instanceId, 'debug', String(e))
  })

  client.on('data', (e: unknown) => {
    const msg = String(e)
    // Tag warns/errors from game output
    const type = /\[ERROR\]|\[SEVERE\]/i.test(msg)
      ? 'error'
      : /\[WARN\]/i.test(msg)
      ? 'warn'
      : 'info'
    sendLog(win, instanceId, type, msg)
  })

  client.on(
    'progress',
    (e: { type: string; task: number; total: number }) => {
      if (e.total === 0) return
      const pct = Math.round((e.task / e.total) * 60) + 30   // 30-90%
      sendProgress(win, instanceId, `${e.type} (${e.task}/${e.total})`, pct, 'downloading')
    }
  )

  client.on('close', (code: number) => {
    running.delete(instanceId)
    instanceManager.update(instanceId, { lastPlayed: new Date().toISOString() })
    sendProgress(win, instanceId, `Game exited (code ${code})`, 100, 'closed')
    win?.webContents.send('game-closed', { instanceId, code })
    sendLog(win, instanceId, code === 0 ? 'info' : 'error', `[ModVault] Game closed — exit code ${code}`)
  })

  client.launch(opts)
  sendProgress(win, instanceId, 'Minecraft is running', 100, 'running')
  win?.webContents.send('game-started', { instanceId })
}

export function stopInstance(instanceId: string): void {
  // Remove our tracking; the actual process keeps running until the user quits it
  running.delete(instanceId)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sendProgress(
  win: BrowserWindow | null,
  instanceId: string,
  message: string,
  progress: number,
  stage: LaunchProgress['stage']
) {
  win?.webContents.send('launch-progress', { instanceId, message, progress, stage } satisfies LaunchProgress)
}

function sendLog(
  win: BrowserWindow | null,
  instanceId: string,
  type: GameLogEntry['type'],
  message: string
) {
  win?.webContents.send('game-log', {
    instanceId,
    type,
    message,
    timestamp: new Date().toISOString()
  } satisfies GameLogEntry)
}

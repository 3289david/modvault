import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

// Which Mojang bundled runtime each MC version needs
const MC_RUNTIME_MAP: Record<string, string> = {
  '1.21.4': 'java-runtime-delta',
  '1.21.3': 'java-runtime-delta',
  '1.21.2': 'java-runtime-delta',
  '1.21.1': 'java-runtime-delta',
  '1.21': 'java-runtime-delta',
  '1.20.6': 'java-runtime-gamma',
  '1.20.4': 'java-runtime-gamma',
  '1.20.2': 'java-runtime-gamma',
  '1.20.1': 'java-runtime-gamma',
  '1.20': 'java-runtime-gamma',
  '1.19.4': 'java-runtime-gamma',
  '1.19.2': 'java-runtime-gamma',
  '1.19': 'java-runtime-gamma',
  '1.18.2': 'java-runtime-gamma',
  '1.18': 'java-runtime-gamma',
  '1.17.1': 'java-runtime-alpha',
  '1.16.5': 'jre-legacy',
  '1.12.2': 'jre-legacy',
  '1.8.9': 'jre-legacy'
}

export interface JavaInfo {
  path: string
  version: string
  source: 'minecraft' | 'java_home' | 'path' | 'registry' | 'common'
}

export async function findJavaPath(mcVersion?: string): Promise<string | null> {
  const checks: Array<() => string | null> = [
    () => findMinecraftBundledJava(mcVersion ?? '1.21.1'),
    findJavaHome,
    findJavaInPath,
    findJavaInRegistry,
    findJavaCommonPaths
  ]

  for (const check of checks) {
    try {
      const p = check()
      if (p && fs.existsSync(p)) return p
    } catch { /* continue */ }
  }

  return null
}

function findMinecraftBundledJava(mcVersion: string): string | null {
  const appData = process.env.APPDATA ?? ''
  const runtimeName = MC_RUNTIME_MAP[mcVersion] ?? 'java-runtime-gamma'

  // Official Launcher path: .minecraft/runtime/{component}/windows-x64/{component}/bin/java.exe
  const candidates = [
    path.join(appData, '.minecraft', 'runtime', runtimeName, 'windows-x64', runtimeName, 'bin', 'java.exe'),
    path.join(appData, '.minecraft', 'runtime', runtimeName, 'bin', 'java.exe'),
    // x86 fallback
    path.join(appData, '.minecraft', 'runtime', runtimeName, 'windows-x86', runtimeName, 'bin', 'java.exe'),
  ]

  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function findJavaHome(): string | null {
  const javaHome = process.env.JAVA_HOME
  if (!javaHome) return null
  const exe = path.join(javaHome, 'bin', 'java.exe')
  return fs.existsSync(exe) ? exe : null
}

function findJavaInPath(): string | null {
  try {
    const result = execSync('where java', { encoding: 'utf8', timeout: 5000 })
    const lines = result.trim().split('\n')
    for (const line of lines) {
      const p = line.trim()
      if (p && fs.existsSync(p)) return p
    }
  } catch { /* not in PATH */ }
  return null
}

function findJavaInRegistry(): string | null {
  // Read Java installs from Windows registry
  try {
    const result = execSync(
      'reg query "HKLM\\SOFTWARE\\JavaSoft\\Java Runtime Environment" /s /v JavaHome 2>nul',
      { encoding: 'utf8', timeout: 5000 }
    )
    const matches = result.match(/JavaHome\s+REG_SZ\s+(.+)/g)
    if (matches) {
      for (const m of matches.reverse()) { // newest first
        const javaHome = m.replace(/JavaHome\s+REG_SZ\s+/, '').trim()
        const exe = path.join(javaHome, 'bin', 'java.exe')
        if (fs.existsSync(exe)) return exe
      }
    }
  } catch { /* no registry entry */ }

  // Try JDK registry too
  try {
    const result = execSync(
      'reg query "HKLM\\SOFTWARE\\JavaSoft\\JDK" /s /v JavaHome 2>nul',
      { encoding: 'utf8', timeout: 5000 }
    )
    const matches = result.match(/JavaHome\s+REG_SZ\s+(.+)/g)
    if (matches) {
      for (const m of matches.reverse()) {
        const javaHome = m.replace(/JavaHome\s+REG_SZ\s+/, '').trim()
        const exe = path.join(javaHome, 'bin', 'java.exe')
        if (fs.existsSync(exe)) return exe
      }
    }
  } catch { /* no entry */ }

  return null
}

function findJavaCommonPaths(): string | null {
  const candidates = [
    // Adoptium (Temurin)
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Java',
    'C:\\Program Files (x86)\\Java',
    'C:\\Program Files\\Zulu',
    'C:\\Program Files\\Amazon Corretto'
  ]

  for (const base of candidates) {
    if (!fs.existsSync(base)) continue
    try {
      const subdirs = fs.readdirSync(base)
        .filter(d => d.toLowerCase().startsWith('jdk') || d.toLowerCase().startsWith('jre'))
        .sort()
        .reverse() // newest first

      for (const sub of subdirs) {
        const exe = path.join(base, sub, 'bin', 'java.exe')
        if (fs.existsSync(exe)) return exe
      }
    } catch { /* can't read dir */ }
  }

  return null
}

export function getJavaVersion(javaPath: string): string | null {
  try {
    // java -version outputs to stderr
    const result = execSync(`"${javaPath}" -version 2>&1`, { encoding: 'utf8', timeout: 8000 })
    const match = result.match(/version "([^"]+)"/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function detectJava(mcVersion?: string): Promise<JavaInfo | null> {
  const javaPath = await findJavaPath(mcVersion)
  if (!javaPath) return null
  const version = getJavaVersion(javaPath) ?? 'unknown'
  let source: JavaInfo['source'] = 'common'
  if (javaPath.includes('.minecraft')) source = 'minecraft'
  else if (process.env.JAVA_HOME && javaPath.startsWith(process.env.JAVA_HOME)) source = 'java_home'
  return { path: javaPath, version, source }
}

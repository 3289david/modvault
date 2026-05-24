import type { CrashAnalysis, CrashSuspect } from '../../shared/types'

interface CrashPattern {
  regex: RegExp
  cause: string
  type: CrashAnalysis['causeType']
  recommendations: string[]
  extractSuspect?: (match: RegExpMatchArray) => string | null
}

const PATTERNS: CrashPattern[] = [
  {
    regex: /DuplicateModsFoundException|Found a duplicate mod|duplicate mod id/i,
    cause: 'Duplicate mod detected. Two copies of the same mod are installed.',
    type: 'mod_conflict',
    recommendations: [
      'Open your mods folder and remove duplicate JAR files.',
      'Keep only the latest version of each mod.',
      'Check for mods that might bundle another mod internally.'
    ]
  },
  {
    regex: /Mixins? failed to inject into .+?class (.+?)[\s:]/,
    cause: 'Mixin injection failure — a mod tried to patch Minecraft internals but failed, likely due to conflict with another mod.',
    type: 'mixin_error',
    recommendations: [
      'Disable recently installed mods one by one to find the culprit.',
      'Check if you have both OptiFine and a performance mod like Sodium installed.',
      'Update all mods to the latest version.',
      'Check for Mixin compatibility issues between mods.'
    ],
    extractSuspect: (match) => match[1]
  },
  {
    regex: /Unable to load mixin config[:\s]+(.+?)[\s\n]/,
    cause: 'A mod\'s mixin configuration could not be loaded. The mod may be corrupted or incompatible.',
    type: 'mixin_error',
    recommendations: [
      'Re-download the affected mod.',
      'Ensure the mod is compatible with your Minecraft version.',
      'Check if the mod requires additional libraries.'
    ],
    extractSuspect: (match) => match[1]
  },
  {
    regex: /java\.lang\.OutOfMemoryError/i,
    cause: 'Java ran out of memory. Minecraft (or mods) required more RAM than allocated.',
    type: 'oom',
    recommendations: [
      'Increase Java heap allocation (e.g., -Xmx4G for 4GB).',
      'Install FerriteCore mod to reduce memory usage.',
      'Reduce render distance.',
      'Remove high-resolution texture packs.'
    ]
  },
  {
    regex: /net\.minecraftforge\.fml\.MissingModsException|MissingModsException/,
    cause: 'One or more required mod dependencies are missing.',
    type: 'missing_dep',
    recommendations: [
      'Install the missing dependency mods listed in the crash log.',
      'Check mod pages on Modrinth or CurseForge for required dependencies.',
      'Use ModVault\'s dependency auto-install feature.'
    ]
  },
  {
    regex: /ClassNotFoundException: (.+)/,
    cause: 'A required class could not be found — a dependency mod is missing or incompatible.',
    type: 'missing_dep',
    recommendations: [
      'Ensure all dependency mods are installed.',
      'Try reinstalling the affected mod.',
      'Check for version incompatibilities.'
    ],
    extractSuspect: (match) => match[1]?.split('.').slice(-2).join('.')
  },
  {
    regex: /NoSuchMethodError: (.+)/,
    cause: 'Method not found — a mod is trying to call a method that doesn\'t exist in this version.',
    type: 'mod_conflict',
    recommendations: [
      'Update all mods to versions compatible with your Minecraft version.',
      'Check if a library mod (Cloth Config, GeckoLib, etc.) is outdated.',
      'Verify the Minecraft version matches what the mod requires.'
    ]
  },
  {
    regex: /sodium|rubidium|embeddium/i,
    cause: 'Crash related to a performance/rendering mod (Sodium/Rubidium/Embeddium).',
    type: 'mod_conflict',
    recommendations: [
      'Check if OptiFine or OptiFabric is installed alongside Sodium — they are incompatible.',
      'Update Sodium/Embeddium to the latest version.',
      'Disable shader packs and test again.'
    ]
  }
]

function extractMods(log: string): string[] {
  const suspects: string[] = []

  const modsSection = log.match(/--.*?Mods.*?--\n([\s\S]+?)(?:\n--|$)/i)
  if (modsSection) {
    const lines = modsSection[1].split('\n').filter((l) => l.trim().startsWith('|'))
    for (const line of lines.slice(0, 20)) {
      const match = line.match(/\|\s+(\S+)\s+/)
      if (match) suspects.push(match[1])
    }
  }

  const stackMods: string[] = []
  const stackLines = log.split('\n').filter((l) => l.includes('\tat '))
  for (const line of stackLines) {
    const pkgMatch = line.match(/\tat ([a-z0-9_]+\.[a-z0-9_]+)\./i)
    if (pkgMatch) stackMods.push(pkgMatch[1])
  }

  return [...new Set([...suspects, ...stackMods])].slice(0, 10)
}

function extractTimestamp(log: string): string | undefined {
  const match = log.match(/Time:\s+(.+)/i)
  return match?.[1]?.trim()
}

function extractMcVersion(log: string): string | undefined {
  const match = log.match(/Minecraft Version:\s+(\S+)/i)
  return match?.[1]?.trim()
}

function extractLoaderVersion(log: string): string | undefined {
  const match = log.match(/(?:Forge|Fabric|NeoForge) Version:\s+(\S+)/i)
  return match?.[1]?.trim()
}

function extractStackTrace(log: string): string | undefined {
  const match = log.match(/((?:java\.|net\.|com\.|org\.).+?)(?:\n\n|\z)/s)
  return match?.[1]?.slice(0, 2000)
}

export function analyzeCrashLog(logContent: string): CrashAnalysis {
  const suspects: CrashSuspect[] = []
  let primaryCause = 'Unknown crash cause. Check the full log for details.'
  let causeType: CrashAnalysis['causeType'] = 'unknown'
  const recommendations: string[] = []

  for (const pattern of PATTERNS) {
    const match = logContent.match(pattern.regex)
    if (match) {
      primaryCause = pattern.cause
      causeType = pattern.type
      recommendations.push(...pattern.recommendations)

      if (pattern.extractSuspect) {
        const name = pattern.extractSuspect(match)
        if (name) {
          suspects.push({ name, confidence: 'high', reason: 'Directly mentioned in crash' })
        }
      }
      break
    }
  }

  const modRefs = extractMods(logContent)
  for (const mod of modRefs.slice(0, 5)) {
    if (!suspects.find((s) => s.name === mod)) {
      suspects.push({ name: mod, confidence: 'low', reason: 'Found in stack trace or mod list' })
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Update all mods to the latest compatible version.',
      'Try disabling recently installed mods.',
      'Check the Minecraft crash report for more details.',
      'Search the crash log for "Caused by:" to find the root cause.'
    )
  }

  return {
    primaryCause,
    causeType,
    suspects,
    recommendations,
    stackTrace: extractStackTrace(logContent),
    timestamp: extractTimestamp(logContent),
    mcVersion: extractMcVersion(logContent),
    loaderVersion: extractLoaderVersion(logContent)
  }
}

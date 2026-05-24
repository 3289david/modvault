import type { InstalledMod, Conflict } from '../../shared/types'
import { KNOWN_CONFLICTS } from '../../shared/types'

export function detectConflicts(mods: InstalledMod[]): Conflict[] {
  const conflicts: Conflict[] = []
  const enabledMods = mods.filter((m) => m.enabled)

  // Check known conflicts
  for (const rule of KNOWN_CONFLICTS) {
    const modA = enabledMods.find((m) => m.id === rule.a || m.name.toLowerCase().includes(rule.a))
    const modB = enabledMods.find((m) => m.id === rule.b || m.name.toLowerCase().includes(rule.b))
    if (modA && modB) {
      conflicts.push({
        mod1Id: modA.id,
        mod1Name: modA.name,
        mod2Id: modB.id,
        mod2Name: modB.name,
        type: 'incompatible',
        severity: 'error',
        description: rule.desc,
        resolution: rule.alt
      })
    }
  }

  // Check duplicate mod IDs
  const idCounts = new Map<string, InstalledMod[]>()
  for (const mod of enabledMods) {
    if (!idCounts.has(mod.id)) idCounts.set(mod.id, [])
    idCounts.get(mod.id)!.push(mod)
  }
  for (const [id, dupes] of idCounts.entries()) {
    if (dupes.length > 1) {
      conflicts.push({
        mod1Id: dupes[0].id,
        mod1Name: dupes[0].name,
        mod2Id: dupes[1].id,
        mod2Name: dupes[1].name,
        type: 'duplicate',
        severity: 'error',
        description: `Duplicate mod ID "${id}" detected. ${dupes.length} copies installed. Remove all but one.`
      })
    }
  }

  // Check loader mismatches
  const loaderCounts = new Map<string, number>()
  for (const mod of enabledMods) {
    for (const loader of mod.loaders) {
      loaderCounts.set(loader, (loaderCounts.get(loader) ?? 0) + 1)
    }
  }
  const loaders = Array.from(loaderCounts.keys()).filter((l) =>
    ['fabric', 'forge', 'neoforge'].includes(l)
  )
  if (loaders.length > 1) {
    conflicts.push({
      mod1Id: 'loader-mismatch',
      mod1Name: loaders[0],
      mod2Id: 'loader-mismatch',
      mod2Name: loaders[1],
      type: 'api_conflict',
      severity: 'warning',
      description: `Mixed loaders detected: ${loaders.join(', ')}. Mods may not all load correctly.`
    })
  }

  // Check missing required dependencies
  const installedIds = new Set(enabledMods.map((m) => m.id))
  const knownLibraries = new Set([
    'minecraft', 'java', 'fabricloader', 'quilt_loader', 'forge', 'neoforge',
    'fabric-api', 'cloth-config', 'geckolib', 'architectury'
  ])

  for (const mod of enabledMods) {
    for (const dep of mod.dependencies) {
      if (!dep.required) continue
      if (knownLibraries.has(dep.id)) continue
      if (!installedIds.has(dep.id)) {
        conflicts.push({
          mod1Id: mod.id,
          mod1Name: mod.name,
          mod2Id: dep.id,
          mod2Name: dep.id,
          type: 'missing_dep',
          severity: 'warning',
          description: `"${mod.name}" requires "${dep.id}" which is not installed.`,
          resolution: `Install the "${dep.id}" mod`
        })
      }
    }
  }

  return conflicts
}

export function getCompatibleLoaders(mods: InstalledMod[]): string[] {
  if (mods.length === 0) return ['fabric', 'forge', 'neoforge', 'quilt']
  const loaderSets = mods.map((m) => new Set(m.loaders))
  const intersection = loaderSets.reduce((acc, set) => {
    return new Set([...acc].filter((l) => set.has(l)))
  })
  return Array.from(intersection)
}

export function getConflictSummary(conflicts: Conflict[]): {
  errors: number
  warnings: number
  info: number
} {
  return {
    errors: conflicts.filter((c) => c.severity === 'error').length,
    warnings: conflicts.filter((c) => c.severity === 'warning').length,
    info: conflicts.filter((c) => c.severity === 'info').length
  }
}

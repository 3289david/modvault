import React, { useState } from 'react'
import { ChevronRightIcon, ChevronDownIcon, CheckIcon, AlertTriangleIcon, PackageIcon } from '../../icons'
import type { InstalledMod } from '@shared/types'

interface TreeNode {
  mod: InstalledMod
  deps: TreeNode[]
  missing: string[]
}

function buildTree(mod: InstalledMod, allMods: InstalledMod[], visited = new Set<string>()): TreeNode {
  if (visited.has(mod.id)) return { mod, deps: [], missing: [] }
  visited.add(mod.id)

  const deps: TreeNode[] = []
  const missing: string[] = []
  const knownLibraries = new Set([
    'minecraft', 'java', 'fabricloader', 'quilt_loader', 'forge', 'neoforge',
    'fabric-api', 'cloth-config', 'geckolib', 'architectury'
  ])

  for (const dep of mod.dependencies) {
    if (!dep.required) continue
    if (knownLibraries.has(dep.id)) continue
    const found = allMods.find((m) => m.id === dep.id)
    if (found) {
      deps.push(buildTree(found, allMods, new Set(visited)))
    } else {
      missing.push(dep.id)
    }
  }

  return { mod, deps, missing }
}

function TreeNodeView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = node.deps.length > 0 || node.missing.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 rounded-lg px-2 hover:bg-zinc-800/40 transition-colors ${
          depth > 0 ? 'ml-' + (depth * 4) : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <button className="text-zinc-500 shrink-0">
            {expanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </button>
        ) : (
          <div className="w-3 shrink-0" />
        )}

        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center shrink-0">
          {node.mod.iconUrl ? (
            <img src={node.mod.iconUrl} alt="" className="w-full h-full rounded object-cover" />
          ) : (
            <PackageIcon size={10} className="text-zinc-600" />
          )}
        </div>

        <span className="text-xs text-zinc-300 font-medium truncate flex-1">{node.mod.name}</span>
        <span className="text-[10px] text-zinc-600 shrink-0">v{node.mod.version}</span>

        {node.missing.length > 0 && (
          <span className="badge-amber text-[10px] shrink-0">
            <AlertTriangleIcon size={9} />
            {node.missing.length} missing
          </span>
        )}
        {node.mod.enabled ? (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
        )}
      </div>

      {expanded && (
        <>
          {node.deps.map((child) => (
            <TreeNodeView key={child.mod.fileId} node={child} depth={depth + 1} />
          ))}
          {node.missing.map((id) => (
            <div
              key={id}
              className="flex items-center gap-2 py-1 rounded-lg text-amber-500/70"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              <div className="w-3 shrink-0" />
              <AlertTriangleIcon size={11} />
              <span className="text-xs font-mono truncate">{id}</span>
              <span className="text-[10px] badge-amber">missing</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

interface Props {
  mods: InstalledMod[]
}

export function DependencyGraph({ mods }: Props) {
  const [search, setSearch] = useState('')

  const roots = mods.filter((m) => {
    const isDependency = mods.some((other) =>
      other.dependencies.some((d) => d.id === m.id)
    )
    return !isDependency
  })

  const filteredRoots = search
    ? roots.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : roots

  if (mods.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600 text-sm">
        No mods installed in this instance.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {roots.length} top-level mods, {mods.length - roots.length} dependencies
        </p>
        <input
          className="input text-xs py-1.5 w-40"
          placeholder="Filter mods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="card p-2">
        {filteredRoots.map((mod) => {
          const tree = buildTree(mod, mods)
          return <TreeNodeView key={mod.fileId} node={tree} />
        })}
      </div>
    </div>
  )
}

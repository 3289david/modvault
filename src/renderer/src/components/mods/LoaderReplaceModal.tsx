import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  XIcon,
  RefreshIcon,
  CheckIcon,
  LoaderSpinIcon,
  AlertTriangleIcon,
  ExternalLinkIcon,
  PackageIcon
} from '../../icons'
import { useStore, selectActiveInstance } from '../../store'
import type { InstalledMod, LoaderType, ModSearchHit } from '@shared/types'

// Known cross-loader alternatives
const LOADER_ALTERNATIVES: Record<string, Record<string, string>> = {
  // fabric -> forge alternatives
  'sodium': { forge: 'embeddium', neoforge: 'embeddium' },
  'lithium': { forge: 'radium', neoforge: 'radium' },
  'iris': { forge: 'oculus', neoforge: 'oculus' },
  'starlight': { forge: 'starlight-forge', neoforge: 'starlight-forge' },
  'krypton': { forge: 'krypton-reforged', neoforge: 'krypton-reforged' },
  'ferritecore': { forge: 'ferritecore', neoforge: 'ferritecore' }, // same id
  'entityculling': { forge: 'entity-culling-forge', neoforge: 'entity-culling-forge' },
  'modmenu': { forge: 'catalogue', neoforge: 'catalogue' },
  'optifabric': { forge: 'optifine', neoforge: 'optifine' },
  // forge -> fabric
  'embeddium': { fabric: 'sodium', quilt: 'sodium' },
  'oculus': { fabric: 'iris', quilt: 'iris' },
}

interface Suggestion {
  originalMod: InstalledMod
  alternativeSlug: string | null
  compatible: boolean
}

interface Props {
  open: boolean
  targetLoader: LoaderType
  onClose: () => void
  onComplete: () => void
}

export function LoaderReplaceModal({ open, targetLoader, onClose, onComplete }: Props) {
  const activeInstance = useStore(selectActiveInstance)
  const installedMods = useStore((s) =>
    activeInstance ? (s.installedMods[activeInstance.id] ?? []) : []
  )
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [replacing, setReplacing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    const incompatible = installedMods.filter(
      (m) => m.enabled && !m.loaders.includes(targetLoader) && m.loaders.length > 0
    )

    const sug: Suggestion[] = incompatible.map((mod) => {
      const alts = LOADER_ALTERNATIVES[mod.id.toLowerCase()]
      const altSlug = alts?.[targetLoader] ?? null
      return {
        originalMod: mod,
        alternativeSlug: altSlug,
        compatible: false
      }
    })

    setSuggestions(sug)
    setSelected(new Set(sug.filter((s) => s.alternativeSlug).map((s) => s.originalMod.fileId)))
  }, [open, targetLoader, installedMods])

  if (!open) return null

  const handleAutoReplace = async () => {
    if (!activeInstance) return
    setReplacing(true)
    let done = 0

    for (const sug of suggestions) {
      if (!selected.has(sug.originalMod.fileId)) continue
      if (!sug.alternativeSlug) continue

      try {
        // Disable original
        await window.api.toggleMod(activeInstance.id, sug.originalMod.fileId, false)
        useStore.getState().updateInstalledMod(activeInstance.id, sug.originalMod.fileId, { enabled: false })

        // Install alternative
        const installed = await window.api.installMod({
          instanceId: activeInstance.id,
          modId: sug.alternativeSlug,
          versionId: 'auto',
          source: 'modrinth'
        })
        useStore.getState().addInstalledMod(activeInstance.id, installed)
        done++
      } catch {
        // Skip if not found
      }
    }

    setReplacing(false)
    toast.success(`Replaced ${done} mod${done !== 1 ? 's' : ''} for ${targetLoader}`)
    onComplete()
    onClose()
  }

  const incompatibleCount = suggestions.length
  const withAlternatives = suggestions.filter((s) => s.alternativeSlug).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-zinc-800">
          <AlertTriangleIcon size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h2 className="text-base font-semibold text-zinc-100">Loader Switch — Mod Compatibility</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Switching to <strong className="text-zinc-300">{targetLoader}</strong>. Found{' '}
              <strong className="text-zinc-300">{incompatibleCount}</strong> incompatible mod{incompatibleCount !== 1 ? 's' : ''}.
              {withAlternatives > 0 && ` ${withAlternatives} can be auto-replaced.`}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <XIcon size={14} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
          {suggestions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              All your mods are compatible with {targetLoader}!
            </div>
          ) : (
            suggestions.map((sug) => (
              <div key={sug.originalMod.fileId} className="flex items-center gap-3 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(sug.originalMod.fileId)}
                  onChange={(e) => {
                    const next = new Set(selected)
                    e.target.checked ? next.add(sug.originalMod.fileId) : next.delete(sug.originalMod.fileId)
                    setSelected(next)
                  }}
                  disabled={!sug.alternativeSlug}
                  className="w-4 h-4 rounded accent-violet-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-200 truncate">{sug.originalMod.name}</div>
                  <div className="text-xs text-zinc-600 truncate">
                    Supports: {sug.originalMod.loaders.join(', ')}
                  </div>
                </div>
                {sug.alternativeSlug ? (
                  <div className="text-right shrink-0">
                    <div className="text-xs text-emerald-400 flex items-center gap-1 justify-end">
                      <RefreshIcon size={11} />
                      Replace with
                    </div>
                    <div className="text-xs font-mono text-zinc-300">{sug.alternativeSlug}</div>
                  </div>
                ) : (
                  <span className="badge-red text-[10px] shrink-0">No alternative found</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="btn-secondary flex-1">
            Skip — I'll handle it manually
          </button>
          {withAlternatives > 0 && (
            <button
              onClick={handleAutoReplace}
              disabled={replacing || selected.size === 0}
              className="btn-primary flex-1 justify-center"
            >
              {replacing ? <LoaderSpinIcon size={14} /> : <RefreshIcon size={14} />}
              Auto-Replace ({selected.size})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

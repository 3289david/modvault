import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { DownloadIcon, XIcon, LoaderSpinIcon, PackageIcon, AlertTriangleIcon } from '../../icons'
import { useStore, selectActiveInstance } from '../../store'
import type { DepInfo } from '@shared/types'

interface Props {
  deps: DepInfo[]
  onClose: () => void
}

export function DepsPrompt({ deps, onClose }: Props) {
  const [installing, setInstalling] = useState(false)
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const activeInstance = useStore(selectActiveInstance)
  const addInstalledMod = useStore((s) => s.addInstalledMod)

  const required = deps.filter((d) => d.required)
  const optional = deps.filter((d) => !d.required)

  const installDep = async (dep: DepInfo) => {
    if (!activeInstance) return
    try {
      const mod = await window.api.installMod({
        instanceId: activeInstance.id,
        modId: dep.projectId,
        versionId: 'auto',
        source: 'modrinth'
      })
      addInstalledMod(activeInstance.id, mod)
      setInstalledIds((prev) => new Set([...prev, dep.projectId]))
      return true
    } catch {
      return false
    }
  }

  const handleInstallAll = async () => {
    if (!activeInstance) return
    setInstalling(true)
    let ok = 0
    let fail = 0
    for (const dep of required) {
      if (installedIds.has(dep.projectId)) continue
      const success = await installDep(dep)
      if (success) ok++; else fail++
    }
    setInstalling(false)
    if (ok > 0) toast.success(`Installed ${ok} dependenc${ok !== 1 ? 'ies' : 'y'}`)
    if (fail > 0) toast.error(`${fail} dependenc${fail !== 1 ? 'ies' : 'y'} failed to install`)
    if (fail === 0) onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangleIcon size={15} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-100">Missing Dependencies</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              This mod requires {required.length} dependency{required.length !== 1 ? 'ies' : ''}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <XIcon size={14} />
          </button>
        </div>

        {/* Dep list */}
        <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
          {required.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">
                Required
              </p>
              <div className="space-y-1.5">
                {required.map((dep) => (
                  <DepRow
                    key={dep.projectId}
                    dep={dep}
                    installed={installedIds.has(dep.projectId)}
                    onInstall={() => installDep(dep)}
                  />
                ))}
              </div>
            </div>
          )}
          {optional.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Optional
              </p>
              <div className="space-y-1.5">
                {optional.map((dep) => (
                  <DepRow
                    key={dep.projectId}
                    dep={dep}
                    installed={installedIds.has(dep.projectId)}
                    onInstall={() => installDep(dep)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-800 bg-zinc-900/40">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-xs py-2">
            Skip
          </button>
          {required.length > 0 && (
            <button
              onClick={handleInstallAll}
              disabled={installing}
              className="btn-primary flex-1 justify-center text-xs py-2"
            >
              {installing ? <LoaderSpinIcon size={13} /> : <DownloadIcon size={13} />}
              Install {required.length} Required
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DepRow({
  dep,
  installed,
  onInstall
}: {
  dep: DepInfo
  installed: boolean
  onInstall: () => Promise<boolean | undefined>
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    await onInstall()
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2.5 bg-zinc-800/50 rounded-xl px-3 py-2">
      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
        {dep.iconUrl ? (
          <img src={dep.iconUrl} alt={dep.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <PackageIcon size={12} className="text-zinc-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-200 truncate">{dep.name}</p>
        <p className="text-[10px] text-zinc-600 truncate">{dep.slug}</p>
      </div>
      {installed ? (
        <span className="badge-emerald text-[10px]">Installed</span>
      ) : (
        <button
          onClick={handleClick}
          disabled={loading}
          className="btn-primary py-1 px-2.5 text-xs shrink-0"
        >
          {loading ? <LoaderSpinIcon size={11} /> : <DownloadIcon size={11} />}
          Install
        </button>
      )}
    </div>
  )
}

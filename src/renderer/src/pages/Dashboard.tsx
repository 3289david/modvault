import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ZapIcon,
  ShieldIcon,
  PackageIcon,
  LayersIcon,
  AlertTriangleIcon,
  SearchIcon,
  RefreshIcon,
  LoaderSpinIcon,
  DownloadIcon,
  FabricLoaderIcon,
  ForgeLoaderIcon,
  NeoForgeLoaderIcon,
  CheckIcon
} from '../icons'
import {
  useStore,
  selectActiveInstance,
  selectInstalledMods,
  selectConflicts
} from '../store'
import { useConflicts } from '../hooks/useElectron'
import type { LoaderType } from '@shared/types'
import { OPTIMIZATION_PACK } from '@shared/types'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'violet'
}: {
  icon: React.FC<{ size?: number; className?: string }>
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const colors: Record<string, string> = {
    violet: 'text-violet-400 bg-violet-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10'
  }
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>
        <Icon size={20} className={colors[color].split(' ')[0]} />
      </div>
      <div>
        <div className="text-2xl font-bold text-zinc-100">{value}</div>
        <div className="text-sm text-zinc-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  desc,
  onClick,
  color = 'violet',
  loading = false
}: {
  icon: React.FC<{ size?: number; className?: string }>
  label: string
  desc: string
  onClick: () => void
  color?: string
  loading?: boolean
}) {
  const hoverColors: Record<string, string> = {
    violet: 'hover:border-violet-500/40 hover:bg-violet-500/5',
    emerald: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
    amber: 'hover:border-amber-500/40 hover:bg-amber-500/5'
  }
  const iconColors: Record<string, string> = {
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400'
  }
  return (
    <button
      onClick={onClick}
      className={`card p-4 flex items-start gap-3 w-full text-left transition-all duration-200 ${hoverColors[color]}`}
    >
      <div className={`mt-0.5 ${iconColors[color]}`}>
        {loading ? <LoaderSpinIcon size={18} /> : <Icon size={18} />}
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const activeInstance = useStore(selectActiveInstance)
  const installedMods = useStore(selectInstalledMods)
  const conflicts = useStore(selectConflicts)
  const instances = useStore((s) => s.instances)
  const downloads = useStore((s) => s.downloads)
  const { check: checkConflicts } = useConflicts(activeInstance?.id ?? null)

  const [checkingConflicts, setCheckingConflicts] = useState(false)
  const [installingOptimization, setInstallingOptimization] = useState(false)

  const errorCount = conflicts.filter((c) => c.severity === 'error').length
  const warnCount = conflicts.filter((c) => c.severity === 'warning').length
  const activeDownloads = Object.values(downloads)
  const enabledMods = installedMods.filter((m) => m.enabled)

  const handleCheckConflicts = async () => {
    setCheckingConflicts(true)
    const found = await checkConflicts()
    setCheckingConflicts(false)
    if (found.length === 0) toast.success('No conflicts found!')
    else toast.error(`Found ${found.length} issue${found.length > 1 ? 's' : ''}`)
  }

  const handleOptimize = async () => {
    if (!activeInstance) { toast.error('Select an instance first'); return }
    const pack = OPTIMIZATION_PACK[activeInstance.loader as LoaderType] ?? []
    if (pack.length === 0) { toast('No optimization pack for this loader'); return }
    setInstallingOptimization(true)
    let installed = 0
    for (const modId of pack) {
      try {
        const mod = await window.api.installMod({
          instanceId: activeInstance.id,
          modId,
          versionId: 'auto',
          source: 'modrinth'
        })
        useStore.getState().addInstalledMod(activeInstance.id, mod)
        installed++
      } catch {
        // Skip mods that can't be found
      }
    }
    setInstallingOptimization(false)
    toast.success(`Installed ${installed} optimization mods`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="page-title">
            {activeInstance ? (
              <>
                <span className="gradient-text">{activeInstance.name}</span>
              </>
            ) : (
              'Dashboard'
            )}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {activeInstance
              ? `MC ${activeInstance.minecraftVersion} · ${activeInstance.loader} · ${enabledMods.length} mods active`
              : 'Create or select an instance to get started'}
          </p>
        </div>

        {/* Active downloads */}
        {activeDownloads.length > 0 && (
          <div className="card p-4 border-violet-500/30 bg-violet-500/5">
            <div className="flex items-center gap-2 mb-3">
              <DownloadIcon size={14} className="text-violet-400" />
              <span className="text-sm font-medium text-violet-300">Installing mods...</span>
            </div>
            <div className="space-y-2">
              {activeDownloads.map((d) => (
                <div key={d.modId}>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>{d.fileName}</span>
                    <span>{d.progress}%</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${d.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={LayersIcon}
            label="Instances"
            value={instances.length}
            color="violet"
          />
          <StatCard
            icon={PackageIcon}
            label="Mods Installed"
            value={enabledMods.length}
            sub={installedMods.length - enabledMods.length > 0
              ? `${installedMods.length - enabledMods.length} disabled`
              : undefined}
            color="blue"
          />
          <StatCard
            icon={errorCount > 0 ? AlertTriangleIcon : CheckIcon}
            label="Conflicts"
            value={errorCount + warnCount}
            sub={errorCount > 0 ? `${errorCount} errors` : warnCount > 0 ? `${warnCount} warnings` : 'All clear'}
            color={errorCount > 0 ? 'red' : warnCount > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            icon={DownloadIcon}
            label="Active Downloads"
            value={activeDownloads.length}
            color="emerald"
          />
        </div>

        {/* Conflicts banner */}
        {(errorCount > 0 || warnCount > 0) && (
          <div
            className={`${errorCount > 0 ? 'conflict-error' : 'conflict-warning'} cursor-pointer`}
            onClick={() => navigate('/library')}
          >
            <div className="flex items-start gap-3">
              <AlertTriangleIcon
                size={16}
                className={errorCount > 0 ? 'text-red-400 mt-0.5' : 'text-amber-400 mt-0.5'}
              />
              <div>
                <p className={`text-sm font-medium ${errorCount > 0 ? 'text-red-300' : 'text-amber-300'}`}>
                  {errorCount > 0
                    ? `${errorCount} mod conflict${errorCount > 1 ? 's' : ''} detected`
                    : `${warnCount} warning${warnCount > 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {conflicts[0]?.description} Click to view details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickAction
              icon={SearchIcon}
              label="Browse Mods"
              desc="Find and install mods from Modrinth & CurseForge"
              onClick={() => navigate('/browse')}
              color="violet"
            />
            <QuickAction
              icon={ZapIcon}
              label="One-click Optimize"
              desc={`Install performance mods for ${activeInstance?.loader ?? 'your loader'}`}
              onClick={handleOptimize}
              color="emerald"
              loading={installingOptimization}
            />
            <QuickAction
              icon={ShieldIcon}
              label="Check Conflicts"
              desc="Scan for mod incompatibilities and issues"
              onClick={handleCheckConflicts}
              color="amber"
              loading={checkingConflicts}
            />
          </div>
        </div>

        {/* Recent mods */}
        {installedMods.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300">Recently Installed</h2>
              <button onClick={() => navigate('/library')} className="btn-ghost py-1 px-2 text-xs">
                View all
              </button>
            </div>
            <div className="card divide-y divide-zinc-800/60">
              {[...installedMods]
                .sort((a, b) => new Date(b.installDate).getTime() - new Date(a.installDate).getTime())
                .slice(0, 5)
                .map((mod) => (
                  <div key={mod.fileId} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      {mod.iconUrl ? (
                        <img src={mod.iconUrl} alt={mod.name} className="w-full h-full rounded-lg object-cover" />
                      ) : (
                        <PackageIcon size={14} className="text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-200 truncate">{mod.name}</div>
                      <div className="text-xs text-zinc-600">{mod.version}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${mod.enabled ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No instance CTA */}
        {!activeInstance && (
          <div className="card p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
              <LayersIcon size={28} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">No Instance Selected</h2>
            <p className="text-sm text-zinc-500 max-w-xs mb-6">
              Create an instance to start managing your Minecraft mods in isolated environments.
            </p>
            <button onClick={() => navigate('/instances')} className="btn-primary">
              <LayersIcon size={14} />
              Create First Instance
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

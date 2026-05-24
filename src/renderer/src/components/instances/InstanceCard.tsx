import React, { useState } from 'react'
import toast from 'react-hot-toast'
import {
  FolderIcon,
  TrashIcon,
  FabricLoaderIcon,
  ForgeLoaderIcon,
  NeoForgeLoaderIcon,
  QuiltLoaderIcon,
  PlayIcon,
  LoaderSpinIcon,
  SettingsIcon,
  RocketIcon,
  StopIcon
} from '../../icons'
import { useStore } from '../../store'
import { InstanceSettings } from './InstanceSettings'
import type { Instance, LoaderType } from '@shared/types'

function LoaderIconBig({ loader }: { loader: LoaderType }) {
  const map = {
    fabric: <FabricLoaderIcon size={20} />,
    forge: <ForgeLoaderIcon size={20} />,
    neoforge: <NeoForgeLoaderIcon size={20} />,
    quilt: <QuiltLoaderIcon size={20} />
  }
  return map[loader] ?? <span className="w-5 h-5 rounded-full bg-emerald-500" />
}

function LoaderGradient({ loader }: { loader: LoaderType }) {
  const gradients: Record<LoaderType, string> = {
    fabric: 'from-blue-600/20 to-blue-500/5',
    forge: 'from-orange-600/20 to-orange-500/5',
    neoforge: 'from-amber-600/20 to-amber-500/5',
    quilt: 'from-purple-600/20 to-purple-500/5',
    vanilla: 'from-emerald-600/20 to-emerald-500/5'
  }
  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradients[loader] ?? 'from-zinc-800/20 to-zinc-700/5'} rounded-xl pointer-events-none`}
    />
  )
}

interface InstanceCardProps {
  instance: Instance
  active: boolean
  onSelect: () => void
  onDeleted: () => void
}

export function InstanceCard({ instance, active, onSelect, onDeleted }: InstanceCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [localInstance, setLocalInstance] = useState(instance)
  const removeInstance = useStore((s) => s.removeInstance)
  const upsertInstance = useStore((s) => s.upsertInstance)
  const auth = useStore((s) => s.auth)
  const runningInstances = useStore((s) => s.runningInstances)
  const setShowAuthModal = useStore((s) => s.setShowAuthModal)
  const setShowConsole = useStore((s) => s.setShowConsole)
  const isRunning = runningInstances.includes(instance.id)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete instance "${instance.name}"? This will remove the mods folder.`)) return
    setDeleting(true)
    try {
      await window.api.deleteInstance(instance.id)
      removeInstance(instance.id)
      toast.success(`Deleted "${instance.name}"`)
      onDeleted()
    } catch {
      toast.error('Failed to delete instance')
    } finally {
      setDeleting(false)
    }
  }

  const openFolder = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.openInstanceFolder(instance.id)
  }

  const handleLaunch = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!auth) { setShowAuthModal(true); return }
    setLaunching(true)
    try {
      await window.api.launchInstance(instance.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
      if (msg.includes('log in') || msg.includes('sign in')) setShowAuthModal(true)
    } finally {
      setLaunching(false)
    }
  }

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.stopInstance(instance.id)
    toast('Game stopped')
  }

  return (
    <div
      onClick={onSelect}
      className={`relative card-hover overflow-hidden cursor-pointer transition-all duration-200 ${
        active ? 'border-violet-500/50 ring-1 ring-violet-500/20' : ''
      }`}
    >
      <LoaderGradient loader={instance.loader} />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <LoaderIconBig loader={instance.loader} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{instance.name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{instance.description || 'No description'}</p>
            </div>
          </div>
          {active && (
            <span className="badge-violet text-[10px]">Active</span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-900/60 rounded-lg p-2.5 text-center">
            <div className="text-sm font-semibold text-zinc-200">{instance.modCount ?? 0}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">Mods</div>
          </div>
          <div className="bg-zinc-900/60 rounded-lg p-2.5 text-center">
            <div className="text-sm font-semibold text-zinc-200">{instance.minecraftVersion}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">MC Version</div>
          </div>
          <div className="bg-zinc-900/60 rounded-lg p-2.5 text-center">
            <div className="text-sm font-semibold text-zinc-200 capitalize">{instance.loader}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">Loader</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setShowConsole(instance.id) }}
                className="btn-ghost py-1.5 px-3 text-xs flex-1 justify-center text-emerald-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Console
              </button>
              <button onClick={handleStop} className="btn-danger py-1.5 px-3 text-xs">
                <StopIcon size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="btn-primary py-1.5 px-3 text-xs flex-1 justify-center"
            >
              {launching ? <LoaderSpinIcon size={13} /> : <RocketIcon size={13} />}
              {launching ? 'Launching...' : 'Launch'}
            </button>
          )}
          <button
            onClick={openFolder}
            className="btn-ghost py-1.5 px-2 text-xs"
            title="Open folder"
          >
            <FolderIcon size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowSettings(true) }}
            className="btn-ghost py-1.5 px-2 text-xs"
            title="Instance settings"
          >
            <SettingsIcon size={13} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-danger py-1.5 px-2 text-xs"
          >
            {deleting ? <LoaderSpinIcon size={13} /> : <TrashIcon size={13} />}
          </button>
        </div>
      </div>
      {showSettings && (
        <InstanceSettings
          instance={localInstance}
          onClose={() => setShowSettings(false)}
          onUpdated={(updated) => {
            setLocalInstance(updated)
            upsertInstance(updated)
          }}
        />
      )}
    </div>
  )
}

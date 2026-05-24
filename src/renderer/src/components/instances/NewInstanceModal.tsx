import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { XIcon, PlusIcon, LoaderSpinIcon, FolderIcon } from '../../icons'
import { useStore } from '../../store'
import type { LoaderType } from '@shared/types'
import { MC_VERSIONS } from '@shared/types'

interface Props {
  open: boolean
  onClose: () => void
}

const LOADERS: { value: LoaderType; label: string; desc: string }[] = [
  { value: 'fabric', label: 'Fabric', desc: 'Lightweight, modern, fast' },
  { value: 'forge', label: 'Forge', desc: 'Most mods, long-standing ecosystem' },
  { value: 'neoforge', label: 'NeoForge', desc: 'Forge fork, modern APIs' },
  { value: 'quilt', label: 'Quilt', desc: 'Fabric-compatible, experimental' },
  { value: 'vanilla', label: 'Vanilla', desc: 'No mod loader' }
]

export function NewInstanceModal({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const [mcVersion, setMcVersion] = useState(MC_VERSIONS[0])
  const [loader, setLoader] = useState<LoaderType>('fabric')
  const [description, setDescription] = useState('')
  const [customFolder, setCustomFolder] = useState('')
  const [loading, setLoading] = useState(false)

  const upsertInstance = useStore((s) => s.upsertInstance)
  const setActiveInstance = useStore((s) => s.setActiveInstance)

  if (!open) return null

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) setCustomFolder(folder)
  }

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Instance name is required'); return }
    setLoading(true)
    try {
      const instance = await window.api.createInstance({
        name: name.trim(),
        minecraftVersion: mcVersion,
        loader,
        description: description.trim() || undefined,
        modsFolder: customFolder || undefined
      })
      upsertInstance(instance)
      setActiveInstance(instance.id)
      toast.success(`Created "${instance.name}"`)
      onClose()
      setName(''); setMcVersion(MC_VERSIONS[0]); setLoader('fabric')
      setDescription(''); setCustomFolder('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create instance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">New Instance</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Create an isolated Minecraft environment</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Instance Name *</label>
            <input
              className="input"
              placeholder="e.g. Survival 1.21 Fabric"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          {/* MC Version */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Minecraft Version</label>
            <select
              className="input appearance-none cursor-pointer"
              value={mcVersion}
              onChange={(e) => setMcVersion(e.target.value)}
            >
              {MC_VERSIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Loader */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Mod Loader</label>
            <div className="grid grid-cols-2 gap-2">
              {LOADERS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setLoader(value)}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all duration-150 ${
                    loader === value
                      ? 'border-violet-500/60 bg-violet-500/10 text-violet-200'
                      : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] opacity-60 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
              Description <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              className="input"
              placeholder="What is this instance for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Custom mods folder */}
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
              Mods Folder <span className="text-zinc-600">(optional — defaults to app data)</span>
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-xs"
                placeholder="Auto-managed by ModVault"
                value={customFolder}
                onChange={(e) => setCustomFolder(e.target.value)}
                readOnly
              />
              <button onClick={handleSelectFolder} className="btn-secondary px-3">
                <FolderIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleCreate} disabled={loading || !name.trim()} className="btn-primary flex-1">
            {loading ? <LoaderSpinIcon size={14} /> : <PlusIcon size={14} />}
            Create Instance
          </button>
        </div>
      </div>
    </div>
  )
}

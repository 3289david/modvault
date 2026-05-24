import React, { useState } from 'react'
import { PlusIcon, LayersIcon } from '../icons'
import { InstanceCard } from '../components/instances/InstanceCard'
import { NewInstanceModal } from '../components/instances/NewInstanceModal'
import { useStore, selectActiveInstance } from '../store'

export function Instances() {
  const instances = useStore((s) => s.instances)
  const activeInstanceId = useStore((s) => s.activeInstanceId)
  const setActiveInstance = useStore((s) => s.setActiveInstance)
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title">Instances</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Each instance is an isolated Minecraft environment with its own mods, configs, and saves.
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <PlusIcon size={14} />
            New Instance
          </button>
        </div>

        {instances.length === 0 ? (
          <div className="card p-16 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mb-5">
              <LayersIcon size={36} className="text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-2">Create Your First Instance</h2>
            <p className="text-sm text-zinc-500 max-w-sm mb-8 leading-relaxed">
              Instances let you run different modpacks or setups without them interfering with each other.
              Think of them like separate Minecraft installations.
            </p>
            <button onClick={() => setShowNew(true)} className="btn-primary px-6 py-2.5">
              <PlusIcon size={14} />
              Create Instance
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                active={instance.id === activeInstanceId}
                onSelect={() => setActiveInstance(instance.id)}
                onDeleted={() => {}}
              />
            ))}

            {/* Add new card */}
            <button
              onClick={() => setShowNew(true)}
              className="card flex flex-col items-center justify-center p-8 border-dashed hover:border-violet-500/40 hover:bg-violet-500/5 transition-all duration-200 min-h-48"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                <PlusIcon size={20} className="text-zinc-500" />
              </div>
              <span className="text-sm text-zinc-500 hover:text-zinc-300">New Instance</span>
            </button>
          </div>
        )}
      </div>

      <NewInstanceModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  )
}

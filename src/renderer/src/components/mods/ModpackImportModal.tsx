import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  XIcon,
  UploadIcon,
  LoaderSpinIcon,
  CheckIcon,
  FolderIcon,
  PackageIcon
} from '../../icons'
import { useStore } from '../../store'
import type { ImportProgress, Instance } from '@shared/types'

interface Props {
  onClose: () => void
}

type Stage = 'idle' | 'selected' | 'importing' | 'done' | 'error'

export function ModpackImportModal({ onClose }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [createdInstance, setCreatedInstance] = useState<Instance | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const upsertInstance = useStore((s) => s.upsertInstance)
  const setActiveInstance = useStore((s) => s.setActiveInstance)

  // Subscribe to modpack progress events
  useEffect(() => {
    const unsub = window.api.onModpackProgress((p) => {
      setProgress(p)
      if (p.stage === 'done') setStage('done')
      if (p.stage === 'error') { setStage('error'); setErrorMsg(p.message) }
    })
    return unsub
  }, [])

  const handlePickFile = async () => {
    const picked = await window.api.pickModpackFile()
    if (picked) {
      setFilePath(picked)
      setStage('selected')
      setProgress(null)
      setCreatedInstance(null)
    }
  }

  const handleImport = async () => {
    if (!filePath) return
    setStage('importing')
    setProgress({ current: 0, total: 1, message: 'Starting…', stage: 'extracting' })
    try {
      const instance = await window.api.importModpack(filePath)
      if (instance) {
        setCreatedInstance(instance)
        upsertInstance(instance)
      }
      // stage is set to 'done' via onModpackProgress event
      // but fallback here in case event arrives before this
      setStage('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setStage('error')
      toast.error(`Import failed: ${msg}`)
    }
  }

  const handleGoToInstance = () => {
    if (createdInstance) {
      setActiveInstance(createdInstance.id)
    }
    onClose()
  }

  const fileName = filePath ? filePath.split(/[\\/]/).pop() : null
  const isModrinth = fileName?.endsWith('.mrpack')
  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <PackageIcon size={17} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Import Modpack</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Modrinth (.mrpack) or CurseForge (.zip)</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <XIcon size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* File picker */}
          <button
            onClick={handlePickFile}
            disabled={stage === 'importing'}
            className="w-full flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
          >
            {filePath ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <FolderIcon size={22} className="text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-200">{fileName}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {isModrinth ? 'Modrinth Pack' : 'CurseForge Pack'}
                    {' — '}
                    <span className="text-violet-400">Click to change</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-zinc-800 group-hover:bg-violet-500/10 flex items-center justify-center transition-colors">
                  <UploadIcon size={22} className="text-zinc-600 group-hover:text-violet-400 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    Click to select modpack file
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">.mrpack or .zip</p>
                </div>
              </>
            )}
          </button>

          {/* Progress bar */}
          {(stage === 'importing' || stage === 'done') && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 truncate">{progress.message}</span>
                <span className="text-zinc-500 shrink-0 ml-2">
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    stage === 'done' ? 'bg-emerald-500' : 'bg-violet-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-xs text-red-400">{errorMsg}</p>
            </div>
          )}

          {/* Success */}
          {stage === 'done' && createdInstance && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
              <CheckIcon size={14} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400">
                Created instance <strong>{createdInstance.name}</strong> with{' '}
                {createdInstance.modCount ?? 0} mods
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
          <button onClick={onClose} className="btn-secondary flex-1">
            {stage === 'done' ? 'Close' : 'Cancel'}
          </button>
          {stage === 'done' ? (
            <button onClick={handleGoToInstance} className="btn-primary flex-1 justify-center">
              <CheckIcon size={14} />
              Go to Instance
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={!filePath || stage === 'importing'}
              className="btn-primary flex-1 justify-center"
            >
              {stage === 'importing' ? (
                <LoaderSpinIcon size={14} />
              ) : (
                <UploadIcon size={14} />
              )}
              {stage === 'importing' ? 'Importing…' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

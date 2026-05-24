import React, { useState, useEffect } from 'react'
import { ModVaultLogo, MinimizeIcon, MaximizeIcon, XIcon } from '../../icons'
import { useStore, selectActiveDownloads } from '../../store'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const downloads = useStore(selectActiveDownloads)

  useEffect(() => {
    window.api.isMaximized().then(setIsMaximized)
  }, [])

  const handleMaximize = async () => {
    await window.api.maximize()
    setIsMaximized(await window.api.isMaximized())
  }

  return (
    <div className="drag-region flex items-center justify-between h-10 px-4 bg-zinc-950 border-b border-zinc-800/60 shrink-0 z-50">
      {/* Left: logo + name */}
      <div className="flex items-center gap-2.5 no-drag select-none pointer-events-none">
        <ModVaultLogo size={20} />
        <span className="text-sm font-semibold text-zinc-200 tracking-tight">ModVault</span>
        {downloads.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs text-zinc-400">
              {downloads.length} installing...
            </span>
          </div>
        )}
      </div>

      {/* Center: version tag */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-xs text-zinc-600 font-mono">v1.0.0</span>
      </div>

      {/* Right: window controls */}
      <div className="no-drag flex items-center">
        <button
          onClick={() => window.api.minimize()}
          className="flex items-center justify-center w-10 h-10 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Minimize"
        >
          <MinimizeIcon size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-10 h-10 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          <MaximizeIcon size={12} />
        </button>
        <button
          onClick={() => window.api.close()}
          className="flex items-center justify-center w-10 h-10 text-zinc-500 hover:text-white hover:bg-red-600 transition-colors"
          title="Close"
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>
  )
}

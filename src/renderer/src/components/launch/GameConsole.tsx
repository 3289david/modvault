import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store'
import { XIcon, TerminalIcon, TrashIcon, ChevronDownIcon } from '../../icons'

interface Props {
  instanceId: string
}

export function GameConsole({ instanceId }: Props) {
  const setShowConsole = useStore((s) => s.setShowConsole)
  const clearGameLogs = useStore((s) => s.clearGameLogs)
  const logs = useStore((s) => s.gameLogs[instanceId] ?? [])
  const launchProgress = useStore((s) => s.launchProgress[instanceId])
  const isRunning = useStore((s) => s.runningInstances.includes(instanceId))
  const instance = useStore((s) => s.instances.find((i) => i.id === instanceId))

  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.type === filter)

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredLogs.length, autoScroll])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 60)
  }

  const typeColor: Record<string, string> = {
    info: 'text-zinc-300',
    warn: 'text-amber-400',
    error: 'text-red-400',
    debug: 'text-zinc-600'
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[70vh] flex flex-col card overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
          <TerminalIcon size={15} className="text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-200">
            {instance?.name ?? 'Game'} — Console
          </span>
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Running
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              Closed
            </span>
          )}

          {/* Progress bar */}
          {launchProgress && launchProgress.stage !== 'running' && launchProgress.stage !== 'closed' && (
            <div className="flex-1 flex items-center gap-2 ml-2">
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${launchProgress.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                {launchProgress.message}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1">
            {/* Filter tabs */}
            {(['all', 'info', 'warn', 'error'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  filter === f
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f}
              </button>
            ))}

            <button
              onClick={() => clearGameLogs(instanceId)}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
              title="Clear logs"
            >
              <TrashIcon size={13} />
            </button>
            <button
              onClick={() => setShowConsole(null)}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>

        {/* Log area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-zinc-950 space-y-0.5"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-zinc-600 mt-4 text-center">
              {isRunning ? 'Waiting for output...' : 'No logs yet'}
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className={`${typeColor[log.type] ?? 'text-zinc-400'} whitespace-pre-wrap break-all`}>
                <span className="text-zinc-700 select-none mr-2">
                  {new Date(log.timestamp).toLocaleTimeString('en', { hour12: false })}
                </span>
                {log.message}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Auto-scroll button */}
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true)
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="absolute bottom-14 right-6 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg transition-colors"
          >
            <ChevronDownIcon size={12} />
            Jump to bottom
          </button>
        )}
      </div>
    </div>
  )
}

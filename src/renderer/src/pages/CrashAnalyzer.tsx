import React, { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  TerminalIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckIcon,
  LoaderSpinIcon,
  UploadIcon,
  InfoIcon,
  FolderIcon,
  RefreshIcon
} from '../icons'
import type { CrashAnalysis } from '@shared/types'

const CAUSE_COLORS: Record<string, string> = {
  mod_conflict: 'text-red-400',
  missing_dep: 'text-amber-400',
  java_error: 'text-orange-400',
  oom: 'text-red-400',
  mixin_error: 'text-purple-400',
  unknown: 'text-zinc-400'
}

const CAUSE_LABELS: Record<string, string> = {
  mod_conflict: 'Mod Conflict',
  missing_dep: 'Missing Dependency',
  java_error: 'Java Error',
  oom: 'Out of Memory',
  mixin_error: 'Mixin Error',
  unknown: 'Unknown'
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const map = {
    high: 'badge-red',
    medium: 'badge-amber',
    low: 'badge-zinc'
  }
  return <span className={map[confidence]}>{confidence} confidence</span>
}

export function CrashAnalyzer() {
  const [logText, setLogText] = useState('')
  const [analysis, setAnalysis] = useState<CrashAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [dragging, setDragging] = useState(false)

  const analyze = async (content: string) => {
    if (!content.trim()) { toast.error('Paste a crash log first'); return }
    setAnalyzing(true)
    try {
      const result = await window.api.analyzeCrashLog(content)
      setAnalysis(result)
    } catch {
      toast.error('Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setLogText(text)
      analyze(text)
    }
    reader.readAsText(file)
  }, [])

  const handleFileOpen = async () => {
    const path = await window.api.selectFile([
      { name: 'Log Files', extensions: ['txt', 'log'] }
    ])
    if (!path) return
    const resp = await fetch(`file://${path}`)
    const text = await resp.text()
    setLogText(text)
    analyze(text)
  }

  const handleLoadMinecraft = async () => {
    toast('Browse to your Minecraft crash-reports or logs folder')
    handleFileOpen()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-zinc-800/60 px-6 py-4">
        <h1 className="page-title flex items-center gap-2">
          <TerminalIcon size={22} className="text-violet-400" />
          Crash Analyzer
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Paste a crash log or drag a file — ModVault will identify the cause and suggest fixes.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Drop zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 ${
              dragging
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <textarea
              className="w-full h-48 bg-transparent p-4 text-xs text-zinc-400 font-mono placeholder-zinc-700 resize-none focus:outline-none"
              placeholder={`Paste your crash log or drag a file here...\n\n---- Minecraft Crash Report ----\nTime: ...\nDescription: ...\n\njava.lang.Exception: ...\n\tat ...`}
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              spellCheck={false}
            />
            {dragging && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-violet-500/10 pointer-events-none">
                <div className="text-violet-400 font-medium">Drop crash log here</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => analyze(logText)}
              disabled={analyzing || !logText.trim()}
              className="btn-primary"
            >
              {analyzing ? <LoaderSpinIcon size={14} /> : <TerminalIcon size={14} />}
              Analyze Crash
            </button>
            <button onClick={handleFileOpen} className="btn-secondary">
              <UploadIcon size={14} />
              Open Log File
            </button>
            <button onClick={handleLoadMinecraft} className="btn-secondary">
              <FolderIcon size={14} />
              From Minecraft Folder
            </button>
            {(logText || analysis) && (
              <button
                onClick={() => { setLogText(''); setAnalysis(null) }}
                className="btn-ghost"
              >
                <RefreshIcon size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Analysis result */}
          {analysis && (
            <div className="space-y-4 animate-slide-up">
              {/* Primary cause */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircleIcon size={16} className={CAUSE_COLORS[analysis.causeType]} />
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {CAUSE_LABELS[analysis.causeType]}
                  </span>
                  {analysis.mcVersion && (
                    <span className="ml-auto badge-zinc text-[10px]">MC {analysis.mcVersion}</span>
                  )}
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">{analysis.primaryCause}</p>
                {analysis.timestamp && (
                  <p className="text-xs text-zinc-600 mt-2">Crashed at: {analysis.timestamp}</p>
                )}
              </div>

              {/* Suspects */}
              {analysis.suspects.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Suspected Causes
                  </h3>
                  <div className="space-y-2">
                    {analysis.suspects.map((s, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-zinc-800/60 last:border-0">
                        <div>
                          <span className="text-sm font-mono text-zinc-300">{s.name}</span>
                          <p className="text-xs text-zinc-600 mt-0.5">{s.reason}</p>
                        </div>
                        <ConfidenceBadge confidence={s.confidence} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Recommended Fixes
                </h3>
                <ol className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-zinc-300 leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Stack trace */}
              {analysis.stackTrace && (
                <details className="card">
                  <summary className="px-5 py-3 text-xs font-semibold text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none">
                    Stack Trace
                  </summary>
                  <pre className="px-5 pb-5 text-[11px] text-zinc-500 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {analysis.stackTrace}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Tips */}
          {!analysis && !logText && (
            <div className="card p-5 border-zinc-800/40">
              <div className="flex items-start gap-3">
                <InfoIcon size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">Where to find crash logs</h3>
                  <ul className="space-y-1.5 text-xs text-zinc-500">
                    <li>
                      <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded">%APPDATA%\.minecraft\crash-reports\</code>
                      {' '}— Minecraft crash reports
                    </li>
                    <li>
                      <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded">%APPDATA%\.minecraft\logs\latest.log</code>
                      {' '}— Latest game log
                    </li>
                    <li>In the Minecraft Launcher, go to Crash Reports tab</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

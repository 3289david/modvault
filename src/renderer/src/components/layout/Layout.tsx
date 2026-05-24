import React from 'react'
import { Outlet } from 'react-router-dom'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { useDownloadListener, useInstanceLoader, useSettingsLoader } from '../../hooks/useElectron'
import { Toaster } from 'react-hot-toast'

export function Layout() {
  useDownloadListener()
  useInstanceLoader()
  useSettingsLoader()

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col bg-zinc-950">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fafafa',
            border: '1px solid #3f3f46',
            borderRadius: '10px',
            fontSize: '13px'
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#18181b' }
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#18181b' }
          }
        }}
      />
    </div>
  )
}

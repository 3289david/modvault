import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Browse } from './pages/Browse'
import { Library } from './pages/Library'
import { Instances } from './pages/Instances'
import { CrashAnalyzer } from './pages/CrashAnalyzer'
import { Settings } from './pages/Settings'
import { Profiles } from './pages/Profiles'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/library" element={<Library />} />
          <Route path="/instances" element={<Instances />} />
          <Route path="/crash" element={<CrashAnalyzer />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

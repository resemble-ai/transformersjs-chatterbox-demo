import { HashRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AppShell from './components/layout/AppShell'
import HomePage from './components/home/HomePage'
import PlaygroundPage from './components/playground/PlaygroundPage'
import EchoPage from './components/echo/EchoPage'
import VoiceCraftPage from './components/voicecraft/VoiceCraftPage'
import NarratorPage from './components/narrator/NarratorPage'

export default function App() {
  return (
    <HashRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="playground" element={<PlaygroundPage />} />
            <Route path="echo" element={<EchoPage />} />
            <Route path="voicecraft" element={<VoiceCraftPage />} />
            <Route path="narrator" element={<NarratorPage />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </HashRouter>
  )
}

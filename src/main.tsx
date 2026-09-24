import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts (bundled by Vite, no third-party requests).
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import './index.css'
import App from './App.tsx'
import { readUrlState } from './routing/urlState'
import { useSolarStore } from './store/useSolarStore'
import { useTimeStore } from './store/useTimeStore'

// Apply the deep link before the first render so the right scene mounts.
const initial = readUrlState(window.location.search)
useSolarStore.setState({ view: initial.view, pendingFocusId: initial.planetId })
if (initial.date) {
  useTimeStore.getState().setDate(initial.date)
  useTimeStore.setState({ paused: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

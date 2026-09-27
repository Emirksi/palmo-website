import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './tokens.css'
import './site.css'
import Home from './Home'
import Join from './Join'
import Privacy from './Privacy'
import { usePath } from './ui'
import { DesignPanel, DesignProvider } from './design'

const TITLES: Record<string, string> = {
  '/': 'Palmo — learn to sign, one hand at a time',
  '/join': 'Join the waitlist — Palmo',
  '/privacy': 'Privacy — Palmo',
}

function App() {
  const path = usePath()
  useEffect(() => { document.title = TITLES[path] ?? TITLES['/'] }, [path])
  return (
    <DesignProvider>
      <MotionConfig reducedMotion="user">
        {path === '/join' ? <Join /> : path === '/privacy' ? <Privacy /> : <Home />}
        <DesignPanel />
      </MotionConfig>
    </DesignProvider>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

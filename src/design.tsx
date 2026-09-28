import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Local design controls: swap fonts and compare the calm vs playful versions.
// Only shown on localhost (dev) or with ?design in the URL.
export type Version = 'calm' | 'playful'
export type PatternShape = 'ribbon' | 'ripples' | 'orb' | 'hands' | 'off'
const PATTERNS: { id: PatternShape; label: string }[] = [
  { id: 'ripples', label: 'Ripples' }, { id: 'ribbon', label: 'Ribbon' }, { id: 'orb', label: 'Orb' }, { id: 'hands', label: 'Hands' }, { id: 'off', label: 'Off' },
]
const isPattern = (v: unknown): v is PatternShape => PATTERNS.some(p => p.id === v)
type Font = { id: string; label: string; stack: string; google?: string; fontshare?: string }

export const FONTS: Font[] = [
  { id: 'satoshi', label: 'Satoshi', stack: "'Satoshi'" },
  { id: 'geist', label: 'Geist', stack: "'Geist'", google: 'Geist:wght@400;500;700' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', stack: "'Plus Jakarta Sans'", google: 'Plus+Jakarta+Sans:wght@400;500;700' },
  { id: 'bricolage', label: 'Bricolage Grotesque', stack: "'Bricolage Grotesque'", google: 'Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700' },
  { id: 'nunito', label: 'Nunito (rounded, Duolingo-like)', stack: "'Nunito'", google: 'Nunito:wght@400;600;800' },
  { id: 'onest', label: 'Onest', stack: "'Onest'", google: 'Onest:wght@400;500;700' },
  { id: 'manrope', label: 'Manrope (app option)', stack: "'Manrope'", google: 'Manrope:wght@400;500;700' },
  { id: 'dmsans', label: 'DM Sans', stack: "'DM Sans'", google: 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700' },
  { id: 'outfit', label: 'Outfit', stack: "'Outfit'", google: 'Outfit:wght@400;500;700' },
  { id: 'general', label: 'General Sans', stack: "'General Sans'", fontshare: 'general-sans@400,500,700' },
  { id: 'system', label: 'SF Pro (system)', stack: '-apple-system, BlinkMacSystemFont' },
]
const FALLBACK = ", -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
const KEY = 'signsense.design'

type Design = { version: Version; font: string; pattern: PatternShape; setVersion: (v: Version) => void; setFont: (f: string) => void; setPattern: (p: PatternShape) => void }
const Ctx = createContext<Design>({ version: 'playful', font: 'satoshi', pattern: 'ripples', setVersion: () => {}, setFont: () => {}, setPattern: () => {} })
export const useDesign = () => useContext(Ctx)

function load(): { version: Version; font: string; pattern: PatternShape } {
  try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); return { version: s.version === 'calm' ? 'calm' : 'playful', font: s.font || 'satoshi', pattern: isPattern(s.pattern) ? s.pattern : 'ripples' } } catch { return { version: 'playful', font: 'satoshi', pattern: 'ripples' } }
}

function applyFont(id: string) {
  const f = FONTS.find(x => x.id === id) ?? FONTS[0]
  const href = f.google ? `https://fonts.googleapis.com/css2?family=${f.google}&display=swap` : f.fontshare ? `https://api.fontshare.com/v2/css?f[]=${f.fontshare}&display=swap` : null
  if (href && !document.querySelector(`link[data-font="${f.id}"]`)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.dataset.font = f.id; document.head.appendChild(l)
  }
  const stack = f.stack + FALLBACK
  document.documentElement.style.setProperty('--font', stack)
  document.documentElement.style.setProperty('--font-display', stack)
}

export function DesignProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ } }, [state])
  useEffect(() => { if (state.font !== 'satoshi') applyFont(state.font); else { document.documentElement.style.removeProperty('--font'); document.documentElement.style.removeProperty('--font-display') } }, [state.font])
  useEffect(() => { document.documentElement.dataset.version = state.version }, [state.version])
  const value: Design = { ...state, setVersion: version => setState(s => ({ ...s, version })), setFont: font => setState(s => ({ ...s, font })), setPattern: pattern => setState(s => ({ ...s, pattern })) }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function DesignPanel() {
  const { version, font, pattern, setVersion, setFont, setPattern } = useDesign()
  const [open, setOpen] = useState(true)
  const show = import.meta.env.DEV || new URLSearchParams(window.location.search).has('design')
  if (!show) return null
  return (
    <div className={`design-panel${open ? '' : ' is-closed'}`}>
      <button className="dp-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>Design {open ? '–' : '+'}</button>
      {open && (
        <div className="dp-body">
          <div className="dp-seg" role="group" aria-label="Version">
            {(['calm', 'playful'] as Version[]).map(v => <button key={v} className={v === version ? 'is-on' : ''} onClick={() => setVersion(v)}>{v === 'calm' ? 'Calm' : 'Playful'}</button>)}
          </div>
          <label className="dp-label" htmlFor="dp-font">Font</label>
          <select id="dp-font" value={font} onChange={e => setFont(e.target.value)}>
            {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <label className="dp-label" htmlFor="dp-pattern">Side pattern</label>
          <select id="dp-pattern" value={pattern} onChange={e => setPattern(e.target.value as PatternShape)}>
            {PATTERNS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <p className="dp-note">Only visible on localhost.</p>
        </div>
      )}
    </div>
  )
}

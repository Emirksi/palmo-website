import { useEffect, useState, type CSSProperties, type ReactNode, type MouseEvent } from 'react'
import { HANDS, HAND_MAX } from './letters'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowDown } from '@phosphor-icons/react'

// ---------- routing (three pages, no router dependency) ----------
function currentPath() {
  const path = window.location.pathname.slice(import.meta.env.BASE_URL.length - 1)
  return path.replace(/\/$/, '') || '/'
}
function routeUrl(to: string) {
  return to.startsWith('/') ? `${import.meta.env.BASE_URL}${to.slice(1)}` : to
}
export function navigate(to: string) {
  if (to === currentPath()) { window.scrollTo({ top: 0 }); return }
  window.history.pushState({}, '', routeUrl(to))
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}
export function usePath() {
  const [path, setPath] = useState(currentPath)
  useEffect(() => { const on = () => setPath(currentPath()); window.addEventListener('popstate', on); return () => window.removeEventListener('popstate', on) }, [])
  return path
}
export function Link({ to, className, children, ...rest }: { to: string; className?: string; children: ReactNode; 'aria-label'?: string }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (to.startsWith('#') || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault(); navigate(to)
  }
  return <a href={routeUrl(to)} className={className} onClick={onClick} {...rest}>{children}</a>
}

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Palmo home">
      <img src={`${import.meta.env.BASE_URL}img/brand/palmo-wordmark.svg`} alt="" width={338} height={110} />
    </Link>
  )
}

// ---------- buttons: the app's own (ink fill, 16px radius, arrow on the right) ----------
type ButtonProps = { to?: string; onClick?: () => void; variant?: 'primary' | 'secondary' | 'brand'; arrow?: 'right' | 'down' | 'none'; children: ReactNode; type?: 'button' | 'submit'; wide?: boolean; small?: boolean; disabled?: boolean }
export function Button({ to, onClick, variant = 'primary', arrow = 'right', children, type = 'button', wide, small, disabled }: ButtonProps) {
  const Icon = arrow === 'right' ? ArrowRight : arrow === 'down' ? ArrowDown : null
  const cls = `btn btn-${variant}${wide ? ' btn-wide' : ''}${small ? ' btn-small' : ''}`
  const inner = <><span>{children}</span>{Icon && <Icon className="btn-icon" size={small ? 16 : 18} weight="bold" aria-hidden />}</>
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return <button type={type} className={cls} onClick={onClick} disabled={disabled}>{inner}</button>
}

// ---------- motion ----------
export const spring = { type: 'spring' as const, stiffness: 220, damping: 26 }

export function Reveal({ children, delay = 0, y = 20, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'li' }) {
  const reduce = useReducedMotion()
  const M = motion[as]
  return (
    <M className={className} initial={{ opacity: 0, y: reduce ? 0 : y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -12% 0px' }} transition={reduce ? { duration: 0.3 } : { ...spring, delay }}>
      {children}
    </M>
  )
}

// ---------- iPhone ----------
export function Phone({ src, alt, className, eager }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return (
    <div className={`phone ${className ?? ''}`}>
      <div className="phone-screen">
        <img src={src} alt={alt} width={752} height={1624} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </div>
    </div>
  )
}

// ---------- hand that fingerspells a word ----------
export function useCycle(length: number, ms: number, active = true) {
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!active || reduce) return
    const t = window.setInterval(() => setI(v => (v + 1) % length), ms)
    return () => window.clearInterval(t)
  }, [length, ms, active, reduce])
  return i
}

// Size every hand on one shared scale, and crop it where its forearm leaves the frame.
function handStyle(letter: string): CSSProperties {
  const spec = HANDS[letter] ?? HANDS.L
  const height = `${(spec.h / HAND_MAX) * 100}%`
  if (spec.cut === 'right') return { height, right: '-3%', top: '36%' }
  if (spec.cut === 'top-right') return { height, right: '-9%', top: '-14%' }
  return { height, left: 0, right: 0, bottom: 0, margin: '0 auto' }
}

export function SpellingHand({ letter, className, preload = [] }: { letter: string; className?: string; preload?: string[] }) {
  return (
    <div className={`spelling-hand ${className ?? ''}`} aria-hidden>
      <div className="preload">{preload.map(l => <img key={l} src={`${import.meta.env.BASE_URL}img/hands/${l}.webp`} alt="" />)}</div>
      <AnimatePresence initial={false}>
        <motion.img key={letter} src={`${import.meta.env.BASE_URL}img/hands/${letter}.webp`} alt="" className="hand-img" style={handStyle(letter)}
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }} />
      </AnimatePresence>
    </div>
  )
}

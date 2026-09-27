import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ALPHABET } from './letters'

// ---------------------------------------------------------------- Duolingo-style entrances
// Visuals arrive with a bouncy overshoot the first time they scroll into view:
// `drop` falls in and squashes on landing, `jump` hops up and wiggles, default pops up from slightly small.
export function Pop({ children, className, delay = 0, drop, jump }: { children: ReactNode; className?: string; delay?: number; drop?: boolean; jump?: boolean }) {
  const reduce = useReducedMotion()
  if (reduce) return <motion.div className={className} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>{children}</motion.div>
  const variants = drop
    ? { hide: { opacity: 0, y: -90, scaleY: 1.06, scaleX: 0.96 }, show: { opacity: 1, y: [ -90, 0, -10, 0 ], scaleY: [1.06, 0.92, 1.02, 1], scaleX: [0.96, 1.05, 0.99, 1] } }
    : jump
      ? { hide: { opacity: 0, y: 60, scale: 0.6, rotate: -12 }, show: { opacity: 1, y: [60, -26, 0], scale: [0.6, 1.08, 1], rotate: [-12, 8, -4, 0] } }
      : { hide: { opacity: 0, y: 30, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1 } }
  const transition = drop || jump ? { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const, opacity: { duration: 0.2, delay } } : { type: 'spring' as const, stiffness: 320, damping: 16, delay }
  return (
    <motion.div className={className} style={{ transformOrigin: '50% 100%' }} variants={variants} initial="hide" whileInView="show" viewport={{ once: true, margin: '0px 0px -12% 0px' }} transition={transition}>
      {children}
    </motion.div>
  )
}

// ---------------------------------------------------------------- marquee
export function Marquee({ children, reverse, speed = 40, className }: { children: ReactNode; reverse?: boolean; speed?: number; className?: string }) {
  return (
    <div className={`marquee ${className ?? ''}`}>
      <div className={`marquee-track${reverse ? ' is-reverse' : ''}`} style={{ ['--duration' as string]: `${speed}s` }}>
        <div className="marquee-set">{children}</div>
        <div className="marquee-set" aria-hidden>{children}</div>
      </div>
    </div>
  )
}

// Who SignSense is for. (When real partners exist, this is where their logos go.)
const MADE_FOR = ['Hearing parents of Deaf kids', 'Brothers & sisters', 'Grandparents', 'Classmates', 'Teachers', 'Future interpreters', 'Coworkers', 'Anyone curious']
export function MadeFor() {
  return (
    <section className="logos" aria-label="Made for">
      <p className="logos-label">Made for</p>
      <Marquee speed={44}>
        {MADE_FOR.map(n => <span key={n} className="logo-word">{n}</span>)}
      </Marquee>
    </section>
  )
}

// Two rows of the whole alphabet, drifting in opposite directions.
export function HandMarquee() {
  const half = Math.ceil(ALPHABET.length / 2)
  const rows = [ALPHABET.slice(0, half), ALPHABET.slice(half)]
  return (
    <div className="hand-marquee">
      {rows.map((row, r) => (
        <Marquee key={r} reverse={r === 1} speed={48}>
          {row.map(l => (
            <span key={l} className="hm-tile">
              <img src={`/img/thumbs/${l}.webp`} alt={`ASL letter ${l}`} width={160} height={190} loading="lazy" />
              <b>{l}</b>
            </span>
          ))}
        </Marquee>
      ))}
    </div>
  )
}

// A soft cobalt wave the page ends on.
export function Wave() {
  return (
    <svg className="wave" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden>
      <path d="M0 120 C 220 40, 420 40, 560 120 S 880 250, 1040 160 S 1300 40, 1440 110 L 1440 320 L 0 320 Z" />
    </svg>
  )
}

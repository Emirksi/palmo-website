import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, AnimatePresence, type TargetAndTransition, type Transition } from 'framer-motion'

// The SignSense mascot. Body movement (bob, sway, wave, jump, squash) is driven by transforms at the
// display's full frame rate; the drawn frames (public/img/anim) are only used for the face:
// blinking, mouth shapes, closed happy eyes, sleeping.
export type MascotMood = 'idle' | 'talk' | 'cheer' | 'sleep'
const img = (name: string) => `/img/anim/${name}.webp`
const ALL = ['blink-1', 'blink-2', 'blink-3', 'talk-1', 'talk-2', 'talk-3', 'talk-4', 'cheer-3', 'cheer-4', 'cheer-8', 'sleep-1', 'sleep-2', 'sleep-3', 'sleep-4']

const BODY: Record<string, { animate: TargetAndTransition; transition: Transition }> = {
  idle: { animate: { y: [0, -5, 0], rotate: [0, 1.5, 0], scaleX: 1, scaleY: [1, 1.015, 1] }, transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } },
  wave: { animate: { y: [0, -8, -8, -8, -8, 0], rotate: [0, -14, 12, -10, 7, 0], scaleX: 1, scaleY: 1 }, transition: { duration: 1.5, ease: 'easeInOut' } },
  talk: { animate: { y: [0, -3, 0], rotate: -4, scaleX: 1, scaleY: 1 }, transition: { y: { duration: 0.36, repeat: Infinity, ease: 'easeInOut' }, rotate: { type: 'spring', stiffness: 200, damping: 16 } } },
  cheer: {
    animate: { y: [0, 6, -86, -86, 0, 5, 0], scaleX: [1, 1.14, 0.9, 1, 1, 1.1, 1], scaleY: [1, 0.84, 1.12, 1, 1, 0.9, 1], rotate: [0, 0, -7, 7, 0, 0, 0] },
    transition: { duration: 1.05, times: [0, 0.12, 0.32, 0.52, 0.72, 0.84, 1], ease: 'easeInOut' },
  },
  sleep: { animate: { y: 0, rotate: 0, scaleX: [1, 1.02, 1], scaleY: [1, 1.035, 1] }, transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } },
}

const BURST = Array.from({ length: 9 }, (_, k) => {
  const a = (-160 + k * (140 / 8)) * (Math.PI / 180)
  return { x: Math.cos(a) * (80 + (k % 3) * 24), y: Math.sin(a) * (80 + (k % 3) * 24) - 60, s: 0.6 + (k % 3) * 0.25, c: ['#ffd564', '#ffffff', '#7df2c0'][k % 3] }
})

export function Mascot({ mood = 'idle', entrance = 'none', className }: { mood?: MascotMood; entrance?: 'peek' | 'none'; className?: string }) {
  const reduce = useReducedMotion()
  const [face, setFace] = useState('blink-1')
  const [waving, setWaving] = useState(false)
  const blinks = useRef(0)

  useEffect(() => { ALL.forEach(n => { const i = new Image(); i.src = img(n) }) }, [])

  // Idle life: blink every few seconds, wave every third blink.
  useEffect(() => {
    if (mood !== 'idle' || reduce) { setWaving(false); return }
    setFace('blink-1')
    let t: number[] = []
    const cycle = () => {
      const wait = 2200 + Math.random() * 1800
      t.push(window.setTimeout(() => {
        blinks.current++
        if (blinks.current % 3 === 0) {
          setWaving(true); setFace('cheer-3')
          t.push(window.setTimeout(() => { setWaving(false); setFace('blink-1'); cycle() }, 1500))
        } else {
          ;['blink-2', 'blink-3', 'blink-2', 'blink-1'].forEach((f, k) => t.push(window.setTimeout(() => setFace(f), k * 55)))
          t.push(window.setTimeout(cycle, 240))
        }
      }, wait))
    }
    cycle()
    return () => t.forEach(window.clearTimeout)
  }, [mood, reduce])

  // Talking: mouth shapes at speaking pace.
  useEffect(() => {
    if (mood !== 'talk') return
    const seq = ['talk-2', 'talk-3', 'talk-4', 'talk-3', 'talk-2', 'talk-1']
    let k = 0
    const t = window.setInterval(() => setFace(seq[k++ % seq.length]), 95)
    return () => window.clearInterval(t)
  }, [mood])

  // Cheer: happy closed eyes in the air, open excited face after landing.
  useEffect(() => {
    if (mood !== 'cheer') return
    setFace('cheer-4')
    const t = window.setTimeout(() => setFace('cheer-8'), 800)
    return () => window.clearTimeout(t)
  }, [mood])

  // Sleeping: the drawn "z" drifts slowly.
  useEffect(() => {
    if (mood !== 'sleep') return
    let k = 0
    setFace('sleep-1')
    const t = window.setInterval(() => setFace(`sleep-${(++k % 4) + 1}`), 900)
    return () => window.clearInterval(t)
  }, [mood])

  const body = BODY[reduce ? 'idle' : mood === 'idle' && waving ? 'wave' : mood]
  return (
    <motion.div className={`mascot ${className ?? ''}`} aria-hidden
      initial={entrance === 'peek' && !reduce ? { x: '115%', rotate: -22 } : false}
      animate={{ x: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 110, damping: 13, delay: 0.9 }}>
      <motion.div className="mascot-body" key={mood === 'cheer' ? 'cheer' : 'body'} animate={reduce ? undefined : body.animate} transition={body.transition}>
        <img src={img(face)} alt="" draggable={false} />
      </motion.div>
      <div className="mascot-shadow" />
      <AnimatePresence>
        {mood === 'cheer' && !reduce && BURST.map((b, k) => (
          <motion.svg key={k} className="mascot-spark" viewBox="0 0 24 24" initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{ x: b.x, y: b.y, scale: b.s, opacity: [1, 1, 0], rotate: 90 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.34 + k * 0.015 }}>
            <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={b.c} />
          </motion.svg>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

// Cheers once when it scrolls into view, then just hangs out.
export function MascotOnView({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [mood, setMood] = useState<MascotMood>('idle')
  const seen = useRef(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !seen.current) { seen.current = true; window.setTimeout(() => setMood('cheer'), 700); window.setTimeout(() => setMood('idle'), 2300) }
    }, { rootMargin: '0px 0px -20% 0px' })
    io.observe(el); return () => io.disconnect()
  }, [])
  return <div ref={ref} className={className}><Mascot mood={mood} /></div>
}

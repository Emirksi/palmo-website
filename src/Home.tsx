import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform, AnimatePresence, type MotionValue } from 'framer-motion'
import { Info } from '@phosphor-icons/react'
import { Button, Link, Logo, Phone, SpellingHand, spring } from './ui'
import { ALPHABET, CUES } from './letters'
import { useDesign } from './design'
import { HandMarquee, MadeFor, Pop, Wave } from './playful'
import { Mascot, MascotOnView } from './mascot'
import { Pattern } from './patterns'

const ease = [0.22, 1, 0.36, 1] as const

// ---------------------------------------------------------------- motion helpers
// Headline lines slide up out of a mask, one after another.
function Lines({ lines, as = 'h2', className, delay = 0, onView = true }: { lines: ReactNode[]; as?: 'h1' | 'h2'; className?: string; delay?: number; onView?: boolean }) {
  const reduce = useReducedMotion()
  const H = motion[as]
  const trigger = onView ? { whileInView: 'show', viewport: { once: true, margin: '0px 0px -15% 0px' } } : { animate: 'show' }
  return (
    <H className={className} initial="hide" {...trigger}>
      {lines.map((l, k) => (
        <span key={k} className="mask">
          <motion.span className="mask-in" variants={{ hide: { y: reduce ? 0 : '105%', opacity: reduce ? 0 : 1 }, show: { y: 0, opacity: 1 } }} transition={{ duration: reduce ? 0.3 : 0.9, ease, delay: delay + k * 0.09 }}>{l}</motion.span>
        </span>
      ))}
    </H>
  )
}
function Fade({ children, delay = 0, className, y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} initial={{ opacity: 0, y: reduce ? 0 : y, filter: reduce ? 'none' : 'blur(6px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }} transition={{ duration: 0.9, ease, delay }}>
      {children}
    </motion.div>
  )
}

// ---------------------------------------------------------------- nav
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => { const on = () => setScrolled(window.scrollY > 12); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on) }, [])
  return (
    <nav className={`nav${scrolled ? ' is-scrolled' : ''}`} aria-label="Main">
      <div className="nav-inner">
        <Logo />
        <div className="nav-links">
          <a href="#glove">The glove</a>
          <a href="#play">Play</a>
          <a href="#deaf-first">Who it’s for</a>
        </div>
        <Button to="/join" small arrow="none">Join the waitlist</Button>
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------- hero: fingerspell anything
// Words the demo cycles through when nobody has typed anything.
const WORDS = ['HELLO', 'THANKS', 'PLEASE', 'SORRY', 'YES', 'NO', 'FRIEND', 'LOVE', 'HELP', 'WATER', 'FOOD', 'WORK', 'SCHOOL', 'COFFEE', 'NAME', 'GOOD', 'MORNING', 'NIGHT', 'HAPPY', 'LEARN', 'SIGN', 'WELCOME', 'AGAIN', 'SLOW']
const clean = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12)

function Fingerspell() {
  const reduce = useReducedMotion()
  const playful = useDesign().version === 'playful'
  const [text, setText] = useState('')
  const [w, setW] = useState(0)
  const word = clean(text) || WORDS[w]
  const [i, setI] = useState(0)
  const [typing, setTyping] = useState(false)
  const idle = useRef<number | undefined>(undefined)
  const [asleep, setAsleep] = useState(false)
  useEffect(() => { setAsleep(false); const t = window.setTimeout(() => setAsleep(true), 25000); return () => window.clearTimeout(t) }, [text])

  // Play the word letter by letter, rest on the last letter, loop. Pauses while you type.
  useEffect(() => {
    if (typing || reduce) return
    const last = i >= word.length - 1
    const t = window.setTimeout(() => {
      if (!last) { setI(i + 1); return }
      setI(0)
      if (!clean(text)) setW(v => (v + 1) % WORDS.length) // next word; a typed word just repeats
    }, last ? 2000 : 1050)
    return () => window.clearTimeout(t)
  }, [i, word, typing, reduce, text])

  const hold = (ms: number, then?: () => void) => {
    setTyping(true)
    window.clearTimeout(idle.current)
    idle.current = window.setTimeout(() => { setTyping(false); then?.() }, ms)
  }
  const onType = (value: string) => {
    setText(value)
    setI(Math.max(0, (clean(value) || WORDS[w]).length - 1))
    hold(1400, () => setI(0))
  }
  const letter = word[Math.min(i, word.length - 1)]

  return (
    <div className="demo">
      <div className="demo-stage">
        <div className="demo-glyph" aria-live="polite">
          <motion.span key={letter + i} initial={{ opacity: 0, y: reduce ? 0 : 16, filter: reduce ? 'none' : 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.45, ease }}>
            {letter}
          </motion.span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={letter} className="demo-cue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>{CUES[letter]}</motion.p>
        </AnimatePresence>
        <SpellingHand letter={letter} preload={[...new Set(word.split(''))]} />
        <div className="stage-info">
          <button className="info-btn" aria-label="About these 3D hands" aria-describedby="info-tip"><Info size={18} weight="bold" /></button>
          <span id="info-tip" role="tooltip" className="info-tip">Early preview. The 3D hand models are still being improved.</span>
        </div>
      </div>
      <div className="demo-panel">
        <label className="demo-label" htmlFor="spell">Type any word or name and see it signed</label>
        <input id="spell" className="demo-input" value={text} onChange={e => onType(e.target.value)} placeholder="Type a word" autoComplete="off" spellCheck={false} maxLength={16} />
        <div className="word" aria-hidden>
          {word.split('').map((l, k) => (
            <button key={k} tabIndex={-1} className={`word-tile${k === i ? ' is-on' : ''}`} onClick={() => { setI(k); hold(1800) }}>{l}</button>
          ))}
        </div>
        <div className="try">
          {['HELLO', 'THANKS', 'PLEASE', 'SORRY', 'FRIEND', 'HELP', 'COFFEE', 'GOOD MORNING'].map(w => <button key={w} className="try-word" onClick={() => onType(w)}>{w}</button>)}
        </div>
        {playful && <div className="demo-mascot"><Mascot entrance="peek" mood={typing ? 'talk' : i === word.length - 1 ? 'cheer' : asleep ? 'sleep' : 'idle'} /></div>}
      </div>
    </div>
  )
}

function Hero() {
  const reduce = useReducedMotion()
  return (
    <header className="hero">
      <div className="hero-head">
        <Lines as="h1" className="display" onView={false} lines={['Learn to sign,', 'one hand at a time.']} />
        <motion.div className="hero-side" initial={{ opacity: 0, y: reduce ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.35 }}>
          <p className="lede">Learn each letter from a 3D hand you can view from any angle, then practice with a sensor glove that shows you exactly which finger to adjust.</p>
          <div className="cta-row">
            <Button to="/join">Join the waitlist</Button>
            <a className="text-link" href="#glove">See how it works</a>
          </div>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: reduce ? 0 : 40, scale: reduce ? 1 : 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1.1, ease, delay: 0.45 }}>
        <Fingerspell />
      </motion.div>
    </header>
  )
}

// ---------------------------------------------------------------- why: each word sharpens into place as you read
const WHY = 'For millions of Deaf people, sign is how you say good morning, I’m proud of you, and I missed you. Imagine saying it back.'
function Word({ progress, range, children }: { progress: MotionValue<number>; range: [number, number]; children: string }) {
  const reduce = useReducedMotion()
  const opacity = useTransform(progress, range, [0.16, 1])
  const blur = useTransform(progress, range, [reduce ? 0 : 3, 0])
  const filter = useTransform(blur, b => `blur(${b}px)`)
  const y = useTransform(progress, range, [reduce ? 0 : 4, 0])
  return <motion.span className="why-word" style={{ opacity, filter, y }}>{children}</motion.span>
}
function Why() {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.88', 'end 0.5'] })
  const words = WHY.split(' ')
  return (
    <section className="why">
      <p ref={ref} className="why-text">
        {words.map((w, k) => <Word key={k} progress={scrollYProgress} range={[k / words.length, Math.min(1, (k + 2.2) / words.length)]}>{w}</Word>)}
      </p>
    </section>
  )
}

// ---------------------------------------------------------------- the glove: tap a finger
const TIPS = [
  { k: 'T', name: 'thumb', x: 4.2, y: 46.3 }, { k: 'I', name: 'index', x: 39.1, y: 8.2 }, { k: 'M', name: 'middle', x: 58.6, y: 3.6 },
  { k: 'R', name: 'ring', x: 76.8, y: 8.5 }, { k: 'P', name: 'pinky', x: 92, y: 24.4 },
]
function Glove() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '0px 0px -25% 0px' })
  const reduce = useReducedMotion()
  const [finger, setFinger] = useState(2)
  const [pulse, setPulse] = useState(0)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!inView || touched || reduce) return
    const t = window.setInterval(() => { setFinger(f => (f === 2 ? 4 : f === 4 ? 1 : 2)); setPulse(p => p + 1) }, 2600)
    return () => window.clearInterval(t)
  }, [inView, touched, reduce])
  const tip = TIPS[finger]
  return (
    <section className="section glove" id="glove">
      <div className="glove-grid" ref={ref}>
        <div className="glove-copy">
          <Lines className="h2" lines={['Your glove feels', 'the mistake.']} />
          <Fade delay={0.1}><p className="body">If you do a letter a little wrong the glove buzzes on the finger that's wrong, so you know what to fix without even looking at the screen.</p></Fade>
          <Fade delay={0.18}>
            <div className="fingers" role="group" aria-label="Choose a finger to buzz">
              {TIPS.map((t, k) => (
                <button key={t.k} className={`finger${k === finger ? ' is-on' : ''}`} aria-pressed={k === finger} aria-label={`Buzz the ${t.name}`}
                  onClick={() => { setTouched(true); setFinger(k); setPulse(p => p + 1) }}>{t.k}</button>
              ))}
            </div>
            <p className="note">Tap a finger to try it, the glove is still a prototype.</p>
          </Fade>
        </div>
        <Pop className="glove-stage">
          <div className="glove-figure">
            <img src={`${import.meta.env.BASE_URL}img/glove.webp`} alt="Concept render of the Palmo sensor glove" width={760} height={1105} loading="lazy" decoding="async" />
            <div className="buzz" key={pulse} style={{ left: `${tip.x}%`, top: `${tip.y}%` }} aria-hidden><i className="buzz-halo" /><span /><span /><span /><i className="buzz-core" /></div>
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={tip.name} className="glove-says" initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease }}>
              Bend your {tip.name} more
            </motion.p>
          </AnimatePresence>
        </Pop>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- play
function Play() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const reduce = useReducedMotion()
  const front = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [70, -50])
  const back = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [130, -20])
  const bob = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -80])
  return (
    <section className="section play" id="play" ref={ref}>
      <Pattern slot="play" side="right" shape="ripples" phase={4.1} flipY />
      <div className="play-copy">
        <Lines className="h2" lines={['A streak you’ll', 'want to keep.']} />
        <Fade delay={0.1}><p className="body">Lessons are pretty short, you go through the letters one by one, play some games with the ones you already know and Mitt, our little blue glove, gets really happy every time you finish one.</p></Fade>
      </div>
      <div className="play-art">
        <motion.div className="play-phone back" style={{ y: back }}><Pop delay={0.15} drop><Phone src={`${import.meta.env.BASE_URL}img/screens/games.webp`} alt="The games hub" /></Pop></motion.div>
        <motion.div className="play-phone front" style={{ y: front }}><Pop drop><Phone src={`${import.meta.env.BASE_URL}img/screens/home-top.webp`} alt="The journey path of letters" /></Pop></motion.div>
        <motion.div className="play-mascot" style={{ y: bob }}><Pop delay={0.45} jump><MascotOnView /></Pop></motion.div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- alphabet
function Alphabet() {
  const reduce = useReducedMotion()
  const playful = useDesign().version === 'playful'
  return (
    <section className="section alphabet">
      <Lines className="h2 center" lines={['26 letters.', <span className="muted" key="m">Each one modeled in 3D, from every angle.</span>]} />
      {playful ? <HandMarquee /> : <motion.ul className="alpha-grid" initial="hide" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ staggerChildren: 0.03 }}>
        {ALPHABET.map(l => (
          <motion.li key={l} className="alpha-tile" variants={{ hide: { opacity: 0, y: reduce ? 0 : 18, scale: reduce ? 1 : 0.94 }, show: { opacity: 1, y: 0, scale: 1 } }} transition={{ duration: 0.6, ease }}>
            <img src={`${import.meta.env.BASE_URL}img/thumbs/${l}.webp`} alt={`ASL letter ${l}`} width={160} height={190} loading="lazy" />
            <span>{l}</span>
          </motion.li>
        ))}
      </motion.ul>}
    </section>
  )
}

// ---------------------------------------------------------------- Deaf-first
function DeafFirst() {
  return (
    <section className="section deaf" id="deaf-first">
      <div className="deaf-top">
        <Lines className="h2" lines={['Made for the people around them.', <span className="muted" key="m">Family, friends and coworkers.</span>]} />
      </div>
      <div className="facts">
        {[
          ['Family', 'Most Deaf kids are born to hearing parents, so this is for the mom, the sister or the cousin who wants to actually talk with them.'],
          ['Friends', 'For when you want to hang out with a Deaf friend without writing everything on your phone.'],
          ['Work', 'For people at a Deaf cafe, a school or any job where they meet Deaf people every day.'],
        ].map(([t, d], k) => (
          <Fade key={t} delay={k * 0.08} className="fact"><h3>{t}</h3><p>{d}</p></Fade>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- finish
function Finish() {
  const reduce = useReducedMotion()
  const playful = useDesign().version === 'playful'
  return (
    <section className={`finish${playful ? ' is-playful' : ''}`} aria-labelledby="finish-title">
      {playful && <Wave />}
      <Pattern slot="finish" side="left" shape="ribbon" phase={2.2} delay={0.2} />
      <Fade className="finish-node-wrap">
        <motion.div className="finish-node" animate={reduce ? undefined : { y: [0, -8, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
          <img src={`${import.meta.env.BASE_URL}img/thumbs/L.webp`} alt="" width={160} height={190} loading="lazy" />
        </motion.div>
        <motion.img className="finish-mascot" src={`${import.meta.env.BASE_URL}img/mascot/wave.webp`} alt="" aria-hidden width={320} height={320} loading="lazy"
          animate={reduce ? undefined : { rotate: [0, -6, 4, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2 }} />
      </Fade>
      <Lines className="h2 center" lines={['Your first letter is L.']} />
      <Fade delay={0.1}><p className="body center">Index finger up, thumb out. That’s L. Only 25 to go.</p></Fade>
      <Fade delay={0.18}><Button to="/join" variant="brand">Join the waitlist</Button></Fade>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <Logo />
      <p>© {new Date().getFullYear()} Palmo · App and sensor glove in development</p>
      <div className="footer-links"><Link to="/join">Schools &amp; families</Link><Link to="/privacy">Privacy</Link><Link to="/join">Contact</Link></div>
    </footer>
  )
}

export default function Home() {
  const { version } = useDesign()
  return (
    <div className={`page home is-${version}`}>
      <Nav />
      <main>
        <Hero />
        {version === 'playful' && <MadeFor />}
        <Why />
        <Glove />
        <Play />
        <Alphabet />
        <DeafFirst />
        <Finish />
      </main>
      <Footer />
    </div>
  )
}

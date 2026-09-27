import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check } from '@phosphor-icons/react'
import { Button, Link, Logo, spring } from './ui'

const KEY = 'signsense.waitlist'
function readSaved() { try { return localStorage.getItem(KEY) } catch { return null } }

// The three stops between today and your first sign, drawn like the app's journey path.
const PATH = [
  { label: 'Join the waitlist', sub: 'Takes ten seconds' },
  { label: 'Get your invite', sub: 'One email, when it opens' },
  { label: 'Start learning', sub: 'Your first lesson is ready when you are' },
]

export default function Join() {
  const reduce = useReducedMotion()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(() => !!readSaved())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError('That email looks incomplete.'); return }
    // Preview only: nothing leaves the browser.
    try { localStorage.setItem(KEY, JSON.stringify({ email: value, at: new Date().toISOString() })) } catch { /* private mode: still show success */ }
    setError(''); setDone(true)
  }

  return (
    <div className="page join">
      <header className="join-top"><Logo /><Link to="/" className="back-link">← Back to home</Link></header>
      <main className="join-main">
        <motion.div className="join-greet" initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <motion.img key={done ? 'cheer' : 'wave'} src={`${import.meta.env.BASE_URL}img/mascot/${done ? 'cheer' : 'wave'}.webp`} alt="" aria-hidden width={320} height={320} className="join-mascot"
            initial={{ scale: reduce ? 1 : 0.7, rotate: reduce ? 0 : -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }} />
          <div className="bubble-say">{done ? 'Yay! See you soon.' : "Hi, I'm Mitt! Want to learn to sign with me?"}</div>
        </motion.div>

        <motion.div className="join-card" initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}>
          <AnimatePresence mode="wait" initial={false}>
            {!done ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="join-title">Save your spot.</h1>
                <p className="join-text">We're letting a small group in first, leave your email and we'll only email you once when it's your turn.</p>
                <form className="join-form" onSubmit={submit} noValidate>
                  <label className="field-label" htmlFor="email">Email</label>
                  <input id="email" className="field" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email}
                    onChange={e => { setEmail(e.target.value); if (error) setError('') }} aria-invalid={!!error} aria-describedby={error ? 'email-error' : 'fine-print'} />
                  {error && <p id="email-error" className="field-error" role="alert">{error}</p>}
                  <Button type="submit" wide>Join the waitlist</Button>
                </form>
                <p id="fine-print" className="fine-print">No spam, no sharing. One email when it's your turn.</p>
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="join-title">You're on the list.</h1>
                <p className="join-text" role="status">Thanks for joining. We'll send you an email as soon as your spot opens up.</p>
                <button className="text-button" onClick={() => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } setEmail(''); setDone(false) }}>Use a different email</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <ol className="mini-path" aria-label="What happens next">
          {PATH.map((p, i) => {
            const state = done ? (i === 0 ? 'done' : i === 1 ? 'current' : 'next') : (i === 0 ? 'current' : 'next')
            return (
              <motion.li key={p.label} className={`mini-stop is-${state}`} initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.16 + i * 0.07 }}>
                <span className="mini-coin">{state === 'done' ? <Check size={20} weight="bold" aria-hidden /> : i + 1}</span>
                <span className="mini-text"><strong>{p.label}</strong><small>{p.sub}</small></span>
              </motion.li>
            )
          })}
        </ol>
      </main>
    </div>
  )
}

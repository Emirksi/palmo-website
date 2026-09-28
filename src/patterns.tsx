import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useDesign, type PatternShape } from './design'

// Halftone shapes for the page edges. Each shape returns a grid of dot tiers (0 = none,
// 1..3 = light to dark cobalt) in "edge space": column 0 touches the page edge and columns grow
// inward, so one shape mirrors cleanly to either side. Shapes are lit 3D forms or smooth
// fields, dithered so density follows the light. Dots develop in from the edge when the
// shape scrolls into view, then the shape drifts slowly while it's on screen.
const TINTS = ['#b1bfe3', '#95a8da', '#4a6cc4']
const PITCH = 4
const DOT = 2
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16)
const ss = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
const hash = (i: number, j: number) => {
  let n = Math.imul(i, 374761393) + Math.imul(j, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}
// Coverage + darkness → tier, with ordered dithering so tone reads as dot density.
const tier = (cov: number, dark: number, i: number, j: number) => {
  if (cov < 0.05 || BAYER[(j & 3) * 4 + (i & 3)] >= cov * (0.1 + 0.9 * dark)) return 0
  return dark > 0.72 ? 3 : dark > 0.38 ? 2 : 1
}

type Grid = { cols: number; rows: number; W: number; H: number; out: Uint8Array }

// ---- ribbon: a real 3D band that twists as it curls in from the edge and back out.
const RS = 900, RV = 80
const LX = -0.45, LY = -0.65, LZ = 0.62, LN = Math.hypot(LX, LY, LZ)
const HX = LX / LN, HY = LY / LN, HZ = LZ / LN + 1, HN = Math.hypot(HX, HY, HZ)
function ribbon(g: Grid, t: number, zb: Float32Array, lit: Float32Array, cov: Float32Array) {
  const { cols, rows, W, H, out } = g, asp = H / W
  zb.fill(-1e9); cov.fill(0)
  const C = new Float32Array(RS * 3)
  for (let a = 0; a < RS; a++) {
    const s = a / (RS - 1)
    C[a * 3] = 0.66 * Math.sin(Math.PI * s) - 0.05
    C[a * 3 + 1] = (0.9 - 0.82 * s + 0.05 * Math.sin(Math.PI * 3 * s + t)) * asp
    C[a * 3 + 2] = 0.25 * Math.cos(Math.PI * s * 1.3)
  }
  for (let a = 0; a < RS; a++) {
    const s = a / (RS - 1), p = Math.max(0, a - 1) * 3, q = Math.min(RS - 1, a + 1) * 3
    let tx = C[q] - C[p], ty = C[q + 1] - C[p + 1], tz = C[q + 2] - C[p + 2]
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl
    // N0 = T × z, B0 = T × N0
    let nx = ty, ny = -tx, nz = 0
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl
    const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx
    const ph = Math.PI * 2.3 * s + 0.5 + t * 0.5, c = Math.cos(ph), sn = Math.sin(ph)
    const dx = c * nx + sn * bx, dy = c * ny + sn * by, dz = c * nz + sn * bz
    // surface normal ≈ T × D
    let mx = ty * dz - tz * dy, my = tz * dx - tx * dz, mz = tx * dy - ty * dx
    if (mz < 0) { mx = -mx; my = -my; mz = -mz }
    const ml = Math.hypot(mx, my, mz) || 1
    const l = 0.18 + 0.82 * Math.max(0, (mx * LX + my * LY + mz * LZ) / ml / LN) + 0.25 * Math.pow(Math.max(0, (mx * HX + my * HY + mz * HZ) / ml / HN), 24)
    const w = 0.16 * ss(1, 0.7, s) * ss(0, 0.08, s) + 0.004
    const f = ss(1, 0.85, s)
    for (let b = 0; b < RV; b++) {
      const v = -1 + (2 * b) / (RV - 1)
      const X = C[a * 3] + w * v * dx, Y = (C[a * 3 + 1] + w * v * dy) / asp, Z = C[a * 3 + 2] + w * v * dz
      const i = Math.floor((X * W) / PITCH), j = Math.floor((Y * H) / PITCH)
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue
      const k = j * cols + i
      if (Z > zb[k]) { zb[k] = Z; lit[k] = l; cov[k] = f }
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i
    out[k] = cov[k] ? tier(cov[k], Math.max(0, Math.min(1, 1 - lit[k])), i, j) : 0
  }
}

// ---- ripples: flat dotted rings spreading slowly from a point past the edge.
function ripples({ cols, rows, W, H, out }: Grid, t: number) {
  const cx = -0.15 * W, cy = 0.55 * H, sp = 0.21 * W
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const r = Math.hypot(i * PITCH - cx, j * PITCH - cy)
    const ph = ((((r - t * sp * 0.16) / sp) % 1) + 1) % 1
    const y = j * PITCH, edge = ss(0, 0.16 * H, y) * ss(H, 0.84 * H, y)
    const band = Math.exp(-(((ph - 0.5) / 0.075) ** 2)), fade = ss(1.2 * W, 0.3 * W, r) * edge
    out[j * cols + i] = tier(Math.min(1, band * 1.4) * fade, Math.min(1, 0.15 + 0.85 * band * fade), i, j)
  }
}

// ---- orb: a softly lit sphere half past the edge, the light swinging slowly.
function orb({ cols, rows, W, H, out }: Grid, t: number) {
  const R = Math.min(0.95 * W, 0.44 * H), cx = -0.08 * W, cy = 0.5 * H
  let lx = 0.5 + 0.15 * Math.sin(t), ly = -0.55, lz = 0.67
  const ln = Math.hypot(lx, ly, lz); lx /= ln; ly /= ln; lz /= ln
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const dx = (i * PITCH - cx) / R, dy = (j * PITCH - cy) / R, r = Math.hypot(dx, dy)
    const nz = Math.sqrt(Math.max(0, 1 - r * r))
    const I = Math.max(0, dx * lx + dy * ly + nz * lz)
    const y = j * PITCH, edge = ss(0, 0.12 * H, y) * ss(H, 0.88 * H, y)
    out[j * cols + i] = tier(ss(1, 0.96, r) * edge, Math.max(0, Math.min(1, 1.02 - I * 1.1)), i, j)
  }
}

// ---- hands: one of our letter renders, printed in dots (static).
async function hand(g: Grid, letter: string) {
  const img = new Image()
  img.src = `${import.meta.env.BASE_URL}img/hands/${letter}.webp`
  await img.decode()
  const { cols, rows, W, H, out } = g, iw = img.naturalWidth, ih = img.naturalHeight
  const src = document.createElement('canvas'); src.width = iw; src.height = ih
  const sc = src.getContext('2d')!
  sc.drawImage(img, 0, 0)
  sc.globalCompositeOperation = 'destination-in'
  const fade = sc.createLinearGradient(0, ih * 0.5, 0, ih * 0.86)
  fade.addColorStop(0, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)')
  sc.fillStyle = fade; sc.fillRect(0, 0, iw, ih)
  const c = document.createElement('canvas'); c.width = cols; c.height = rows
  const cc = c.getContext('2d', { willReadFrequently: true })!
  const hh = (H * 0.84) / PITCH, ww = hh * (iw / ih)
  cc.translate(cols * 0.42, rows * 1.04); cc.rotate(0.12); cc.scale(-1, 1)
  cc.drawImage(src, -ww / 2, -hh, ww, hh)
  const d = cc.getImageData(0, 0, cols, rows).data
  const lums: number[] = []
  for (let p = 0; p < cols * rows; p++) if (d[p * 4 + 3] > 150) lums.push(d[p * 4] * 0.3 + d[p * 4 + 1] * 0.59 + d[p * 4 + 2] * 0.11)
  lums.sort((a, b) => a - b)
  const lo = lums[Math.floor(lums.length * 0.04)] ?? 0, hi = lums[Math.floor(lums.length * 0.96)] ?? 255
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const p = (j * cols + i) * 4, a = d[p + 3] / 255
    const lum = d[p] * 0.3 + d[p + 1] * 0.59 + d[p + 2] * 0.11
    out[j * cols + i] = tier(a, 0.2 + 0.8 * Math.max(0, Math.min(1, (hi - lum) / Math.max(1, hi - lo))), i, j)
  }
}

const HAND_FOR: Record<string, string> = { why: 'V', play: 'W', finish: 'Y' }

type Props = { slot: 'why' | 'play' | 'finish'; side: 'left' | 'right'; shape?: PatternShape; phase?: number; flipY?: boolean; drift?: number; delay?: number }

export function Pattern({ slot, side, shape, phase = 0, flipY = false, drift = 50, delay = 0 }: Props) {
  const { pattern: selectedPattern } = useDesign()
  const pattern = shape ?? selectedPattern
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [drift, -drift])

  useEffect(() => {
    const el = wrap.current, cv = canvas.current
    if (!el || !cv || pattern === 'off') return
    let raf = 0, timer = 0, alive = true, visible = false, t0 = 0, revealAt = -1
    let g: Grid | null = null, keys = new Float32Array(0)
    let zb = new Float32Array(0), lit = new Float32Array(0), cov = new Float32Array(0)
    const animated = pattern !== 'hands' && !reduce
    const ctx = cv.getContext('2d')!

    const size = async () => {
      const W = el.clientWidth, H = el.clientHeight
      if (!W || !H) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cols = Math.ceil(W / PITCH), rows = Math.ceil(H / PITCH), n = cols * rows
      g = { cols, rows, W, H, out: new Uint8Array(n) }
      zb = new Float32Array(n); lit = new Float32Array(n); cov = new Float32Array(n)
      // Reveal order: from the page edge inward, with grain.
      keys = new Float32Array(n)
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) keys[j * cols + i] = (i / cols) * 0.65 + hash(i, j) * 0.35
      if (pattern === 'hands') await hand(g, HAND_FOR[slot])
      else compute(phase)
    }
    const compute = (t: number) => {
      if (!g) return
      if (pattern === 'ribbon') ribbon(g, t, zb, lit, cov)
      else if (pattern === 'ripples') ripples(g, t)
      else if (pattern === 'orb') orb(g, t)
    }
    const paint = (progress: number) => {
      if (!g) return
      const { cols, rows, W, H, out } = g
      ctx.clearRect(0, 0, W, H)
      for (let k = 1; k <= 3; k++) {
        ctx.fillStyle = TINTS[k - 1]
        for (let j = 0; j < rows; j++) {
          const sy = flipY ? (rows - 1 - j) * PITCH : j * PITCH
          for (let i = 0; i < cols; i++) {
            const q = j * cols + i
            if (out[q] !== k || keys[q] > progress) continue
            ctx.fillRect(side === 'left' ? i * PITCH : W - (i + 1) * PITCH, sy, DOT, DOT)
          }
        }
      }
    }
    const frame = (now: number) => {
      if (!alive) return
      const p = revealAt < 0 ? 0 : reduce ? 1 : 1 - Math.pow(1 - Math.min(1, (now - revealAt) / 1600), 3)
      if (animated) compute(phase + (now - t0) / 1000 * 0.28)
      paint(p)
      if (visible && (animated || p < 1)) raf = requestAnimationFrame(frame)
    }
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame) }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && revealAt < 0 && !timer) timer = window.setTimeout(() => { revealAt = performance.now(); run() }, delay * 1000)
      if (visible && revealAt >= 0) run()
      if (!visible) cancelAnimationFrame(raf)
    }, { rootMargin: '0px 0px -10% 0px' })
    let lastW = 0, lastH = 0
    const ro = new ResizeObserver(async () => {
      if (el.clientWidth === lastW && el.clientHeight === lastH) return
      lastW = el.clientWidth; lastH = el.clientHeight
      await size()
      if (alive && revealAt >= 0) run()
    })
    t0 = performance.now()
    size().then(() => { if (!alive) return; ro.observe(el); io.observe(el) })
    return () => { alive = false; cancelAnimationFrame(raf); window.clearTimeout(timer); io.disconnect(); ro.disconnect() }
  }, [pattern, slot, side, phase, flipY, delay, reduce])

  if (pattern === 'off') return null
  return (
    <div ref={wrap} className={`pattern pattern-${side} pt-${slot}`} aria-hidden>
      <motion.canvas ref={canvas} style={{ y }} />
    </div>
  )
}

// ---- the "I love you" sign-off: loose dots drift in from the page edge while the sentence is
// read, then settle into the ILY hand on the last word. Scroll-linked, so it follows the reader.
export function SignOff({ progress }: { progress: MotionValue<number> }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = wrap.current, cv = canvas.current
    if (!el || !cv) return
    const ctx = cv.getContext('2d')!
    let alive = true, W = 0, H = 0
    let d: { tx: Float32Array; ty: Float32Array; sx: Float32Array; sy: Float32Array; k: Uint8Array; at: Float32Array } | null = null
    const img = new Image()
    img.src = `${import.meta.env.BASE_URL}img/hands/ILY.webp`

    const build = () => {
      W = el.clientWidth; H = el.clientHeight
      if (!W || !H || !img.naturalWidth) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const iw = img.naturalWidth, ih = img.naturalHeight
      const src = document.createElement('canvas'); src.width = iw; src.height = ih
      const sc = src.getContext('2d')!
      sc.drawImage(img, 0, 0)
      sc.globalCompositeOperation = 'destination-in'
      const fade = sc.createLinearGradient(0, ih * 0.55, 0, ih * 0.92)
      fade.addColorStop(0, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)')
      sc.fillStyle = fade; sc.fillRect(0, 0, iw, ih)
      const cols = Math.ceil(W / PITCH), rows = Math.ceil(H / PITCH)
      const c = document.createElement('canvas'); c.width = cols; c.height = rows
      const cc = c.getContext('2d', { willReadFrequently: true })!
      const hh = Math.min(H * 0.9, (W * 0.9 * ih) / iw) / PITCH, ww = hh * (iw / ih)
      cc.translate(cols * 0.5, rows * 0.98); cc.rotate(-0.05)
      cc.drawImage(src, -ww / 2, -hh, ww, hh)
      const px = cc.getImageData(0, 0, cols, rows).data
      const lums: number[] = []
      for (let q = 0; q < cols * rows; q++) if (px[q * 4 + 3] > 150) lums.push(px[q * 4] * 0.3 + px[q * 4 + 1] * 0.59 + px[q * 4 + 2] * 0.11)
      lums.sort((a, b) => a - b)
      const lo = lums[Math.floor(lums.length * 0.04)] ?? 0, hi = lums[Math.floor(lums.length * 0.96)] ?? 255
      const tx: number[] = [], ty: number[] = [], sx: number[] = [], sy: number[] = [], k: number[] = [], at: number[] = []
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const q = (j * cols + i) * 4, a = px[q + 3] / 255
        const lum = px[q] * 0.3 + px[q + 1] * 0.59 + px[q + 2] * 0.11
        const t = tier(a, 0.2 + 0.8 * Math.max(0, Math.min(1, (hi - lum) / Math.max(1, hi - lo))), i, j)
        if (!t) continue
        const h1 = hash(i, j), h2 = hash(j + 911, i + 37)
        tx.push(i * PITCH); ty.push(j * PITCH); k.push(t)
        // Start loose, off toward the page edge, and settle from the wrist up to the fingertips.
        sx.push(h1 * W * 0.75); sy.push(Math.max(0, Math.min(H - DOT, j * PITCH + (h2 - 0.5) * H * 0.9)))
        at.push((1 - j / rows) * 0.6 + h1 * 0.4)
      }
      d = { tx: Float32Array.from(tx), ty: Float32Array.from(ty), sx: Float32Array.from(sx), sy: Float32Array.from(sy), k: Uint8Array.from(k), at: Float32Array.from(at) }
    }

    const draw = (raw: number) => {
      if (!d) return
      const p = reduce ? 1 : ss(0.42, 0.98, raw)
      ctx.clearRect(0, 0, W, H)
      el.classList.toggle('is-settled', p >= 0.999)
      const moving: number[] = []
      for (let tone = 1; tone <= 3; tone++) {
        ctx.fillStyle = TINTS[tone - 1]
        for (let n = 0; n < d.k.length; n++) {
          const local = (p - d.at[n] * 0.62) / 0.38
          if (local <= 0) continue
          if (local < 1) { if (tone === 1) moving.push(n); continue }
          if (d.k[n] === tone) ctx.fillRect(d.tx[n], d.ty[n], DOT, DOT)
        }
      }
      // Dots still travelling are drawn light, easing into place.
      ctx.fillStyle = TINTS[0]
      for (const n of moving) {
        const local = (p - d.at[n] * 0.62) / 0.38, e = 1 - Math.pow(1 - local, 3)
        ctx.fillRect(Math.round(d.sx[n] + (d.tx[n] - d.sx[n]) * e), Math.round(d.sy[n] + (d.ty[n] - d.sy[n]) * e), DOT, DOT)
      }
    }

    let lastW = 0, lastH = 0
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastW && el.clientHeight === lastH) return
      lastW = el.clientWidth; lastH = el.clientHeight
      build(); draw(progress.get())
    })
    const off = progress.on('change', v => draw(v))
    img.decode().then(() => { if (!alive) return; build(); draw(progress.get()); ro.observe(el) })
    return () => { alive = false; off(); ro.disconnect() }
  }, [progress, reduce])

  return <div ref={wrap} className="signoff" aria-hidden><canvas ref={canvas} /></div>
}

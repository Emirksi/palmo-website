import { sendConfirmation } from './confirmation.js'

const MAX_BODY = 4096

async function readBody(request) {
  const reader = request.body?.getReader()
  if (!reader) return null
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY) {
      await reader.cancel()
      throw new RangeError('Body too large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder().decode(bytes))
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').includes(origin)
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Origin',
      ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    }
    const reply = (status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { ...headers, ...extra } })
    if (new URL(request.url).pathname !== '/waitlist') return reply(404, { error: 'Not found.' })
    if (!allowed) return reply(403, { error: 'Origin not allowed.' })
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' } })
    }
    if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' }, { Allow: 'POST, OPTIONS' })
    if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return reply(415, { error: 'JSON required.' })
    if (Number(request.headers.get('Content-Length')) > MAX_BODY) return reply(413, { error: 'Request too large.' })

    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
      const { success } = await env.SIGNUP_LIMIT.limit({ key: `palmo-waitlist:${ip}` })
      if (!success) return reply(429, { error: 'Please wait a minute before trying again.' }, { 'Retry-After': '60' })
    } catch {
      return reply(503, { error: 'Signup is temporarily unavailable. Please try again.' })
    }

    let body
    try { body = await readBody(request) } catch (error) {
      return reply(error instanceof RangeError ? 413 : 400, { error: 'Invalid request.' })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.email !== 'string' || (body.website !== undefined && body.website !== '')) {
      return reply(400, { error: 'Please check your email and try again.' })
    }
    const email = body.email.trim().toLowerCase()
    if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email) || email.split('@')[0].length > 64) {
      return reply(400, { error: 'That email looks incomplete.' })
    }
    try {
      await env.DB.prepare('INSERT INTO waitlist (email, consent_version) VALUES (?, ?) ON CONFLICT(email) DO NOTHING').bind(email, 'waitlist-2026-09-27').run()
    } catch {
      return reply(503, { error: 'We could not save your spot. Please try again.' })
    }
    try { await sendConfirmation(env, email) } catch {
      console.error('Confirmation processing failed; signup remains saved.')
    }
    return reply(200, { success: true })
  },
}

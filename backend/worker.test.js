import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import worker from './worker.js'

function setup() {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
  const env = {
    ALLOWED_ORIGINS: 'https://emirksi.github.io',
    SIGNUP_LIMIT: { limit: async () => ({ success: true }) },
    DB: { prepare: sql => ({ bind: (...values) => ({ run: async () => db.prepare(sql).run(...values) }) }) },
  }
  const request = (body, options = {}) => new Request('https://api.example/waitlist', {
    method: 'POST', headers: { Origin: env.ALLOWED_ORIGINS, 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...options,
  })
  return { db, env, request }
}

test('persists a normalized signup once, including duplicate retries', async t => {
  const { db, env, request } = setup(); t.after(() => db.close())
  for (const email of ['  Test@Example.com  ', 'test@example.com']) {
    const response = await worker.fetch(request({ email }), env)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { success: true })
  }
  const rows = db.prepare('SELECT * FROM waitlist').all()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].email, 'test@example.com')
  assert.ok(rows[0].created_at)
  assert.equal(rows[0].consent_version, 'waitlist-2026-09-27')
})

test('rejects invalid email, malformed JSON, bot field and oversized bodies without storing', async t => {
  const { db, env, request } = setup(); t.after(() => db.close())
  for (const body of [{ email: 'wrong' }, { email: 3 }, null, [], { email: 'x@-bad.com' }, { email: 'x@example.com', website: 'bot' }]) {
    assert.equal((await worker.fetch(request(body), env)).status, 400)
  }
  assert.equal((await worker.fetch(request({}, { body: '{' }), env)).status, 400)
  assert.equal((await worker.fetch(request({ email: 'x'.repeat(5000) }), env)).status, 413)
  assert.equal(db.prepare('SELECT count(*) AS n FROM waitlist').get().n, 0)
})

test('permits CORS only for configured origin and has no public read route', async t => {
  const { db, env, request } = setup(); t.after(() => db.close())
  const preflight = await worker.fetch(request(null, { method: 'OPTIONS', body: undefined }), env)
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), env.ALLOWED_ORIGINS)
  const denied = await worker.fetch(request({ email: 'x@example.com' }, { headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' } }), env)
  assert.equal(denied.status, 403)
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null)
  assert.equal((await worker.fetch(request(null, { method: 'GET', body: undefined }), env)).status, 405)
})

test('rate limits submissions and fails closed if storage or limiter is unavailable', async t => {
  const { db, env, request } = setup(); t.after(() => db.close())
  env.SIGNUP_LIMIT.limit = async () => ({ success: false })
  const limited = await worker.fetch(request({ email: 'x@example.com' }), env)
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('Retry-After'), '60')
  env.SIGNUP_LIMIT.limit = async () => { throw new Error('unavailable') }
  assert.equal((await worker.fetch(request({ email: 'x@example.com' }), env)).status, 503)
  env.SIGNUP_LIMIT.limit = async () => ({ success: true })
  env.DB.prepare = () => { throw new Error('private database detail') }
  const failed = await worker.fetch(request({ email: 'x@example.com' }), env)
  assert.equal(failed.status, 503)
  assert.equal((await failed.text()).includes('private database detail'), false)
  assert.equal(db.prepare('SELECT count(*) AS n FROM waitlist').get().n, 0)
})

const API_ORIGIN = 'https://palmo-waitlist.palmo-website.workers.dev'

export async function unsubscribeLink(env, email) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
  await env.DB.prepare('INSERT INTO unsubscribe_tokens (email, token) SELECT email, ? FROM waitlist WHERE email = ? ON CONFLICT(email) DO NOTHING').bind(token, email).run()
  const row = await env.DB.prepare('SELECT token FROM unsubscribe_tokens WHERE email = ?').bind(email).first()
  return row ? `${API_ORIGIN}/unsubscribe?token=${row.token}` : null
}

function page(request, status, title, message, token) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Palmo</title>
<style>
:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:#f6f5f1;color:#20201e;font-family:Arial,Helvetica,sans-serif}main{width:100%;max-width:480px;padding:40px 32px;border:1px solid #e8e6e0;border-radius:24px;background:#fff}.brand{color:#2b4acb;font-size:25px;font-weight:700;text-decoration:none}h1{font-size:30px;letter-spacing:-1px;margin:32px 0 16px}p{font-size:16px;line-height:1.65;color:#68665f}button{min-height:48px;width:100%;margin-top:16px;padding:14px 20px;border:0;border-radius:12px;background:#2b4acb;color:#fff;font:inherit;font-weight:600;cursor:pointer}a:focus-visible,button:focus-visible{outline:3px solid #2b4acb;outline-offset:4px}.back{display:inline-block;margin-top:16px;padding:12px 0;color:inherit}@media(prefers-color-scheme:dark){body{background:#111110;color:#f6f5f1}main{background:#1c1c1a;border-color:#343431}p{color:#bab8b0}}
</style></head><body><main><a class="brand" href="https://emirksi.github.io/palmo-website/">palmo</a><h1>${title}</h1><p>${message}</p>
${token ? `<form method="post" action="/unsubscribe?token=${token}"><button type="submit">Unsubscribe</button></form>` : ''}
<a class="back" href="https://emirksi.github.io/palmo-website/">Back to Palmo</a></main></body></html>`
  return new Response(request.method === 'HEAD' ? null : body, { status, headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    ...(status === 405 ? { Allow: 'GET, HEAD, POST' } : {}),
  } })
}

export async function unsubscribe(request, env) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || ''
  if (!/^[a-f0-9]{64}$/.test(token)) return page(request, 400, 'This link isn’t valid.', 'Please use the unsubscribe button in your Palmo email, or reply to that email for help.')
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) return page(request, 405, 'Please open your email link.', 'Use the unsubscribe button in your Palmo email to continue.')
  const origin = request.headers.get('Origin')
  if (request.method === 'POST' && origin && origin !== url.origin) return page(request, 403, 'Please open your email link.', 'Use the unsubscribe button in your Palmo email to continue.')
  try {
    if (request.method !== 'POST') {
      const row = await env.DB.prepare('SELECT email FROM unsubscribe_tokens WHERE token = ?').bind(token).first()
      if (!row) return page(request, 200, 'This link is no longer active.', 'You may already have unsubscribed. If you joined again, please use your latest Palmo email.')
      return page(request, 200, 'Leave the waitlist?', 'You’ll be removed from the Palmo waitlist and won’t receive a launch invitation. You can always join again later.', token)
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM confirmations WHERE email = (SELECT email FROM unsubscribe_tokens WHERE token = ?)').bind(token),
      env.DB.prepare('DELETE FROM waitlist WHERE email = (SELECT email FROM unsubscribe_tokens WHERE token = ?)').bind(token),
    ])
    return page(request, 200, 'You’re unsubscribed.', 'This unsubscribe request is complete. Thanks for spending a little time with Palmo.')
  } catch {
    return page(request, 503, 'Please try again.', 'We couldn’t finish your request just now. Please reopen your email link and try again, or reply to the email for help.')
  }
}

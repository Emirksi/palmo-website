export const confirmationText = "Welcome to Palmo. We've saved you a spot.\n\nHi there,\n\nThanks for being here from the beginning. We're building Palmo to make learning ASL feel a little more approachable. We're glad you're joining us.\n\nMeet Mitt, your little learning companion. He'll be there to cheer you on along the way.\n\nYou're on the waitlist. We'll send your invitation when your spot is ready. Until then, there's nothing you need to do.\n\nSee you soon,\nMitt & the Palmo team\n\nDidn't sign up, or changed your mind? Reply to this email and we'll remove your address."

import { unsubscribeLink } from './unsubscribe.js'

export const confirmationHtml = unsubscribeUrl => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Palmo</title></head>
<body style="margin:0;padding:0;background:#f6f5f1;color:#20201e;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">A little hello from Mitt. Your place on the Palmo waitlist is saved.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f6f5f1"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px">
<tr><td bgcolor="#ffffff" style="padding:32px 28px;border:1px solid #e8e6e0;border-radius:24px">
<img src="https://emirksi.github.io/palmo-website/img/email/palmo-wordmark.png?v=2" width="112" height="36" alt="Palmo" style="display:block;width:112px;height:36px;border:0;margin:0 0 28px">
<img src="https://emirksi.github.io/palmo-website/img/mascot/wave-email.png" width="112" height="112" alt="Mitt, Palmo’s blue glove mascot, waving hello" style="display:block;width:112px;height:112px;border:0;margin:0 0 24px">
<h1 style="margin:0 0 24px;font-size:32px;line-height:1.15;letter-spacing:-1px;font-weight:700;color:#20201e">We saved you a spot.</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.7">Hi there,</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.7">Thanks for being here from the beginning. We’re building Palmo to make learning ASL feel a little more approachable. We’re glad you’re joining us.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.7">Meet <strong>Mitt</strong>, your little learning companion. He’ll be there to cheer you on along the way.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#f6f5f1" style="padding:18px 20px;border-radius:14px;font-size:15px;line-height:1.65"><strong style="color:#2b4acb">You’re on the waitlist.</strong><br>We’ll send your invitation when your spot is ready. Until then, there’s nothing you need to do.</td></tr></table>
<p style="margin:26px 0 0;font-size:16px;line-height:1.65">See you soon,<br><strong>Mitt &amp; the Palmo team</strong></p>
</td></tr>
<tr><td style="padding:22px 12px 0;font-size:12px;line-height:1.7;color:#68665f">Didn’t sign up, or changed your mind? You can leave the waitlist below.<br><a href="${unsubscribeUrl}" style="display:inline-block;margin:14px 0;padding:12px 22px;min-height:20px;border-radius:12px;background:#2b4acb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">Unsubscribe</a><br><a href="https://emirksi.github.io/palmo-website/privacy/" style="color:#68665f;text-decoration:underline">Privacy</a> · You can also reply to this email for help.</td></tr>
</table></td></tr></table></body></html>`

export async function sendConfirmation(env, email) {
  await env.DB.prepare('INSERT INTO confirmations (email) VALUES (?) ON CONFLICT(email) DO NOTHING').bind(email).run()
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) return
  const unsubscribeUrl = await unsubscribeLink(env, email)
  if (!unsubscribeUrl) return
  const claim = await env.DB.prepare("UPDATE confirmations SET state = 'sending', attempted_at = ? WHERE email = ? AND (state = 'pending' OR (state = 'failed' AND attempted_at < ?)) RETURNING email")
    .bind(Date.now(), email, Date.now() - 60000).first()
  if (!claim) return

  let response
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        sender: { name: 'Palmo', email: env.BREVO_SENDER_EMAIL },
        to: [{ email }],
        subject: 'Welcome to Palmo — we saved you a spot',
        textContent: `${confirmationText}\n\nUnsubscribe: ${unsubscribeUrl}`,
        htmlContent: confirmationHtml(unsubscribeUrl),
      }),
    })
  } catch {
    // A timeout may occur after acceptance; don't automatically send a duplicate.
    await env.DB.prepare("UPDATE confirmations SET state = 'unknown' WHERE email = ?").bind(email).run()
    return
  }
  if (!response.ok) {
    await env.DB.prepare("UPDATE confirmations SET state = ? WHERE email = ?").bind(response.status >= 500 ? 'unknown' : 'failed', email).run()
    return
  }
  const result = await response.json()
  await env.DB.prepare("UPDATE confirmations SET state = 'accepted', message_id = ? WHERE email = ?").bind(result.messageId || null, email).run()
}

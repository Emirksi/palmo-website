# Palmo waitlist

The GitHub Pages form sends JSON to `https://palmo-waitlist.palmo-website.workers.dev/waitlist`.
Cloudflare Workers Free and D1 store one normalized email, signup timestamp, and consent version per signup.
There is no public endpoint for listing emails. Use your authenticated Cloudflare dashboard:
**Storage & databases → D1 → palmo-waitlist → Studio → waitlist**.

Confirmation emails use Brevo's transactional API. Store `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` as Worker secrets; never commit either value. Sending launch invitations is a separate step.
Apply the additive schema before deploying: `wrangler d1 execute palmo-waitlist --config backend/wrangler.json --remote --file backend/schema.sql`.
New confirmation emails include an Unsubscribe button and a plain-text link. Apply the schema to create `unsubscribe_tokens` before deploying this version. Each link uses a random 256-bit token, with no email address in its URL. GET/HEAD only display a confirmation page; POST removes the signup and its confirmation record in one transaction, and the token is deleted by its foreign key cascade. Rejoining creates a new token, so an old email cannot remove a new signup. Tokens are private credentials: do not export or log them. Previously sent emails keep their original contents and reply-to removal instructions. No existing subscribers are emailed by this change; any future invitation sender must use the current waitlist rather than a stale export.
The confirmations table records pending, sending, accepted, failed, or unknown delivery attempts. Accepted means Brevo accepted the message, not proof it reached an inbox. Concurrent/repeated signups cannot resend accepted emails. Rejected requests can retry on resubmission after one minute. Ambiguous network/server failures and interrupted sends require checking Brevo logs before manually resetting their state to pending; they are deliberately not retried automatically. Missing email configuration preserves a pending record. There is no automatic retry scheduler or retroactive mailing to existing signups.
Old preview signups saved only in a visitor's browser were never submitted and must be entered again.

## Operations

Run from the repository root with Node 24 and an authorized Cloudflare account:

```sh
npm test
npm run build
npx --yes wrangler@4.141.0 deploy --config backend/wrangler.json
```

To count signups without exporting personal information:

```sh
npx --yes wrangler@4.141.0 d1 execute palmo-waitlist --config backend/wrangler.json --remote --command "SELECT count(*) AS signups FROM waitlist"
```

Keep exports private and out of Git. Database access requires Cloudflare authorization; never put account credentials in the frontend or repository.
The public API URL and database ID are configuration, not credentials.

## Local testing

```sh
npx --yes wrangler@4.141.0 d1 execute palmo-waitlist --config backend/wrangler.json --local --file backend/schema.sql
npx --yes wrangler@4.141.0 dev --config backend/wrangler.json --port 8787 --var ALLOWED_ORIGINS:http://127.0.0.1:5175
```

In another terminal:

```sh
VITE_WAITLIST_API_URL=http://127.0.0.1:8787/waitlist npm run dev
```

Local D1 data is separate from production. The API validates bounded JSON input, uses parameterized SQL, rejects a honeypot field, and applies a 10-request-per-minute IP limit. That limit is approximate per Cloudflare location, not a guarantee against distributed bots. CORS permits the GitHub Pages origin but is not authentication. No email-ownership verification is performed. Duplicate submissions return the same success response without exposing whether an email was already registered.

The form only confirms a signup after a successful API response; timeouts and database limits show a retry message. Retrying is safe because the email is the primary key. No email address is stored in browser storage by the new form.

Cloudflare's dashboard showed **Free / $0 / Current plan** on 2026-09-27. No paid services were enabled. Free-plan limits are shared across the account; requests can fail when quotas are exhausted.

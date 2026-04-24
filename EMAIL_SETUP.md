# Email setup — Saturn Max Technologies

Saturn Max uses **Resend** for transactional email (job-application notifications + contact-form messages). The backend code is already wired — you just need to provide an API key.

---

## 1. Sign up for Resend & grab an API key

1. Go to https://resend.com and sign up (free tier is generous).
2. Open **API Keys** → **Create API Key**. Copy the value — it starts with `re_`.

## 2. Verify a sending domain (recommended)

1. In Resend, open **Domains → Add Domain**.
2. Add `saturnmaxtech.com` and follow the DNS instructions (SPF, DKIM, DMARC records).
3. Once the domain is verified, update `SENDER_EMAIL` in `/app/backend/.env` to something like `no-reply@saturnmaxtech.com`.

> **Before domain verification** you can keep `SENDER_EMAIL=onboarding@resend.dev` — Resend allows this sandbox sender, but it can only deliver to the verified email on your Resend account.

## 3. Paste the key into the backend

Open `/app/backend/.env` and set:

```dotenv
RESEND_API_KEY=re_your_real_key_here
SENDER_EMAIL=onboarding@resend.dev            # or no-reply@saturnmaxtech.com after verifying
RECIPIENT_EMAIL=careers@saturnmaxtech.com     # where applications + contact messages go
```

## 4. Restart the backend

```bash
sudo supervisorctl restart backend
```

You should see `Resend configured — transactional emails enabled.` in the backend logs (`/var/log/supervisor/backend.err.log`). Until the key is set you'll see the warning:

> `RESEND_API_KEY is empty. Emails will be skipped gracefully.`

The site keeps working either way — applications and messages are always stored in MongoDB.

## 5. Test it

1. Visit the home page and submit the "Apply for a position" form (or the contact form).
2. Check your inbox at `careers@saturnmaxtech.com`.

---

## Where emails are triggered

- **New candidate application** — `POST /api/applications` → asynchronous email to `RECIPIENT_EMAIL`.
- **Contact form message** — `POST /api/contact` → asynchronous email to `RECIPIENT_EMAIL`.

Both are "fire and forget" via `asyncio.create_task` so the user never sees email latency in the UI. If Resend returns an error, it's logged but the HTTP response still succeeds (graceful fallback).

## Switching providers

If you want SendGrid or Postmark instead of Resend, only `send_email_async()` in `/app/backend/server.py` needs to change — the rest of the flow is provider-agnostic.

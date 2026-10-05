# Contact form for Etch Studio – with a Cloudflare Worker and your own SMTP server

A free way to handle forms in Etch Studio with Cloudflare: an Etch form component sends each submission to a Cloudflare Worker, which delivers it to your inbox through your own mail server.

```
Etch component ──JSON──▶ Cloudflare Worker ──SMTP──▶ your mail server ──▶ inbox
(ContactForm)            (CORS, honeypot,            (port 587 or 465)
                          validation, Turnstile)
```

- **Free:** Cloudflare's free plan covers 100,000 requests per day.
- **No form service:** mail goes through your own mailbox.
- **Spam protection:** honeypot, server-side validation, an origin allow-list, and optional Cloudflare Turnstile.

Fields: name, email, phone (optional), subject, message, consent.

## Files

| File | Purpose |
|---|---|
| [`worker/`](worker/) | Cloudflare Worker ([`src/index.js`](worker/src/index.js), [`wrangler.toml`](worker/wrangler.toml)) |
| [`etch/contact-form.etch.json`](etch/contact-form.etch.json) | Etch component **ContactForm** to copy and paste (styles and script included) |
| [`etch/spinner-keyframes.css`](etch/spinner-keyframes.css) | Keyframes for the loading spinner |
| [`etch/create-component.js`](etch/create-component.js) | Alternative: creates the component via the Etch Connector |
| [`etch/contact-form.html`](etch/contact-form.html) · [`.css`](etch/contact-form.css) · [`.js`](etch/contact-form.js) | The form as plain HTML, CSS and JS |
| [`demo/index.html`](demo/index.html) | Local preview |
| [`etch/src/component.mjs`](etch/src/component.mjs) | Source of the files above. Rebuild them with `node etch/build.mjs`. |

## Setup

### 1. Requirements

- A Cloudflare account (free plan)
- Node.js 18+
- A mailbox on your domain with SMTP access, ideally a dedicated one like `no-reply@example.com`. You need:
  - `SMTP_HOST`, e.g. `mail.example.com`
  - `SMTP_USER`, usually the full mailbox address
  - `SMTP_PASSWORD`
  - the port: 587 (STARTTLS) or 465 (TLS)
- **SPF and DKIM DNS records** for your domain that cover this mail server. Your mail host provides the values. Without them, the mails end up in spam or get rejected. A DMARC record is recommended.

### 2. Get the code

```bash
git clone https://github.com/alexundkoch/contact-form-etch-studio.git
cd contact-form-etch-studio/worker
npm install
```

> Don't keep the project in a cloud-synced folder (iCloud, Dropbox). Sync clients offload `node_modules`, and `wrangler` or `git` then hang.

### 3. Configure

Set these values in [`worker/wrangler.toml`](worker/wrangler.toml):

```toml
name = "contact-form"

[vars]
ALLOWED_ORIGINS = "https://example.com, https://www.example.com"  # every domain the form runs on, no trailing slash
SITE_NAME       = "example.com"
MAIL_FROM_NAME  = "Webform | example.com"                         # sender name in the inbox
SMTP_PORT       = "587"                                           # 587 (STARTTLS) or 465 (TLS); 25 is blocked
```

### 4. Deploy

```bash
npx wrangler login      # if no browser opens: npx wrangler login --browser=false
npm run deploy
```

Note the URL it prints, e.g. `https://contact-form.<your-subdomain>.workers.dev`.

### 5. Add the secrets

Each command asks for a value. Your input stays invisible.

```bash
npx wrangler secret put SMTP_HOST       # e.g. mail.example.com
npx wrangler secret put SMTP_USER       # usually the full mailbox address
npx wrangler secret put SMTP_PASSWORD
npx wrangler secret put MAIL_FROM       # same address as SMTP_USER
npx wrangler secret put MAIL_TO         # recipient(s), comma-separated
```

Secrets take effect immediately. To change them later, go to **Workers & Pages → your worker → Settings → Variables and Secrets**.

Change the variables from step 3 only in `wrangler.toml`. Every deploy overwrites dashboard changes to them.

### 6. Optional: own endpoint (`api.example.com`)

Requirement: your domain's DNS is on Cloudflare. Add this to `wrangler.toml` and deploy again:

```toml
routes = [
  { pattern = "api.example.com", custom_domain = true }
]
```

Cloudflare creates the DNS record and the certificate automatically.

If the address doesn't resolve right away, your DNS cache may still hold an old lookup. Wait up to 30 minutes, or test on a phone over mobile data.

### 7. Add the form to Etch Studio

1. Copy the entire content of [`etch/contact-form.etch.json`](etch/contact-form.etch.json). On GitHub, use the copy icon in the file view.
2. In the Etch builder, select a container and paste (`Cmd/Ctrl + V`). The component **ContactForm** is created with all styles and the script.
3. Paste the spinner keyframes into a stylesheet, e.g. **Main**. The clipboard can't carry them:
   ```css
   @keyframes contact-form-spin {
     to {
       rotate: 1turn;
     }
   }
   ```
4. Set the props:

   | Prop | Value |
   |---|---|
   | Endpoint (worker URL) | URL from step 4 or 6 |
   | Privacy policy URL | e.g. `/privacy` |
   | Submit button text, messages | translate as needed |
   | Turnstile site key | empty = off (step 9) |

<details>
<summary>Alternatives: Etch Connector or by hand</summary>

**Etch Connector:** creates the component, styles and keyframes, then saves the builder.

```bash
npx -y @digital-gravy/etch-connector serve       # keep running
npx -y @digital-gravy/etch-connector tabs        # find your tab name
npx -y @digital-gravy/etch-connector eval -t <tab> -f etch/create-component.js --timeout 60000
```

**By hand:** rebuild [`contact-form.html`](etch/contact-form.html), add the classes from [`contact-form.css`](etch/contact-form.css), and add [`contact-form.js`](etch/contact-form.js) as the block script on the `<form>`. Keep `data-contact-form`, `action`, `data-contact-status` and the field `name`s.
</details>

### 8. Publish and test

The form only sends on the published site, not in the builder. Send a test message:

- The button shows a spinner, then a green success message.
- The email arrives from "Webform | example.com". *Reply* goes to the visitor.

### 9. Optional: Cloudflare Turnstile

Turnstile is Cloudflare's free CAPTCHA alternative. It's active only when both keys are set.

1. In the Cloudflare dashboard, go to **Turnstile → Add widget**:
   - **Hostnames:** your domain, `www.` + your domain, and your preview domain if you have one
   - **Widget mode:** Managed

   You get a **site key** (public) and a **secret key** (private).
2. Add the secret to the worker:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET
   ```
3. In Etch, paste the site key into the prop **Turnstile site key**. Save and publish.

   Do steps 2 and 3 back to back. While only the secret is set, every submission is rejected.
4. Test:
   - The Turnstile box appears above the button, and the form sends as before.
   - A request without a token is rejected. This must return `{"error":"turnstile_failed"}`:
     ```bash
     curl -X POST https://api.example.com -H "Origin: https://example.com" -H "Content-Type: application/json" \
       -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test","consent":true}'
     ```

**Turn it off:** empty the site key prop, then run `npx wrangler secret delete TURNSTILE_SECRET`.

**Test locally** with Cloudflare's [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/): `npx wrangler dev --var TURNSTILE_SECRET:1x0000000000000000000000000000000AA` (always passes) or `2x0000000000000000000000000000000AA` (always fails).

### 10. Recommended: rate limiting

The origin check only stops browsers. Scripts can fake the header, so add a rate limit. The free plan includes one rule.

Go to **Security → WAF → Rate limiting rules → Create rule**:

- **If:** hostname equals `api.example.com`
- **Rate:** 5 requests per minute per IP
- **Action:** block for 1 minute

## Styling

Colours and sizes are custom properties on `.contact-form`. With [Automatic.css](https://automaticcss.com), the form uses your tokens automatically. Without ACSS, it uses the fallbacks.

| Variable | ACSS token | Fallback |
|---|---|---|
| `--contact-form-text` | `--text-dark` | `#1f2328` |
| `--contact-form-muted` | `--text-dark-muted` | `#656d76` |
| `--contact-form-border` | `--border-color-dark` | `#d0d7de` |
| `--contact-form-field-bg` | `--white` | `#ffffff` |
| `--contact-form-accent` | `--primary` | `#1f2328` |
| `--contact-form-accent-text` | `--white` | `#ffffff` |
| `--contact-form-focus` | `--focus-color` | `#0969da` |
| `--contact-form-success` | `--success-dark` / `--success` | `#1a7f37` |
| `--contact-form-error` | `--danger-dark` / `--danger` | `#cf222e` |
| `--contact-form-radius` | `--radius-s` | `0.375rem` |
| `--contact-form-gap` | `--space-m` | `1.5rem` |

Override any of them on `.contact-form`, e.g. `--contact-form-accent: var(--secondary);`.

States you can style:

- `.contact-form[data-state="sending" | "success" | "error"]`
- `:user-invalid` on the fields
- `:disabled` on the button

## Troubleshooting

To see the error, run `npx wrangler tail` in `worker/` and send the form again. The logs are also in the dashboard under **Workers & Pages → your worker → Logs**.

| Error | Fix |
|---|---|
| `553 Sender address rejected: not owned by user` | `MAIL_FROM` must be the same address as `SMTP_USER`. |
| `535 Authentication failed` | Set `SMTP_USER` / `SMTP_PASSWORD` again. |
| Timeout / connection refused | Check the host. Use port 587 or 465, never 25. |
| `origin_not_allowed` | Add the domain to `ALLOWED_ORIGINS` exactly (`https://…`, no trailing slash) and deploy. |
| `turnstile_failed` | Set the site key prop, register the hostname in the widget, and use the site key and secret from the same widget. |
| Turnstile box missing | Check the site key prop and publish. Ad blockers can block `challenges.cloudflare.com`. |
| Mail lands in spam | Check the SPF and DKIM records (step 1). On Cloudflare DNS, set mail records to **DNS only**. |
| Styles gone after reload (Etch) | Class styles created via the API are saved only with the builder. Save before you reload. |

## Before going live

- Remove preview domains from `ALLOWED_ORIGINS`.
- With a custom domain, you can set `workers_dev = false`.
- In your privacy policy, mention Cloudflare as a processor, and Turnstile if you use it. The worker stores no form data.

## License

[MIT](LICENSE)

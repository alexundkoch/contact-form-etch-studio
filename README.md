# Contact form for Etch Studio – with a Cloudflare Worker and your own SMTP server

Etch Studio builds static sites and has no built-in form handling. This repo shows a small, self-hosted way to get a working contact form anyway:

```
Visitor's browser                Cloudflare Worker                    Your mail server
┌──────────────────┐   JSON    ┌───────────────────────┐   SMTP     ┌──────────────────┐
│ Etch component    │ ───────▶ │ CORS · honeypot ·      │ ────────▶ │ port 587 / 465    │ ──▶ your inbox
│ „ContactForm“     │ ◀─────── │ validation · send mail │           │ (STARTTLS / TLS)  │
│ + block script    │  ok/error└───────────────────────┘           └──────────────────┘
└──────────────────┘
```

- **No third-party form service.** Mail goes through your own mailbox. Optionally, [Resend](https://resend.com) is used as a fallback.
- **Free tier friendly.** The worker is about 22 KB. Cloudflare's free plan covers 100,000 requests per day.
- **Spam basics included.** The form has a honeypot field. The worker validates input on the server side and only accepts requests from your own domains (CORS allow-list).
- **Accessible feedback.** Native form validation runs first. Sending, success and error are announced through a `role="status"` region, and a loading spinner shows in the button.

## What's in here

| Path | What it is |
|---|---|
| [`worker/`](worker/) | The Cloudflare Worker: [`src/index.js`](worker/src/index.js) and [`wrangler.toml`](worker/wrangler.toml). |
| [`etch/create-component.js`](etch/create-component.js) | Creates the Etch component **ContactForm** in your project (styles, props, script) via the Etch Connector. |
| [`etch/contact-form.html`](etch/contact-form.html) | The same form as plain HTML, to copy and paste. |
| [`etch/contact-form.css`](etch/contact-form.css) | All styles. BEM block `.contact-form`, themeable via `--contact-form-*` custom properties. |
| [`etch/contact-form.js`](etch/contact-form.js) | The block script: sends the form as JSON and shows the result. |
| [`demo/index.html`](demo/index.html) | Local preview of the form. Open it in a browser. |
| [`etch/src/component.mjs`](etch/src/component.mjs) | The single source for markup, props and styles. Run `node etch/build.mjs` after editing it. |

Form fields: **name**, **email**, **phone** (optional), **subject**, **message** and a **consent** checkbox, plus the hidden honeypot field `website`.

---

## Step-by-step

### 0. Prerequisites

- A **Cloudflare account**. The free plan is enough.
- **Node.js 18+**.
- A **mailbox you can send from via SMTP**, ideally a dedicated one such as `no-reply@example.com`. Note down the SMTP host, port (587 or 465), username and password.
- Your **Etch Studio** project.

### 1. Get the code

```bash
git clone https://github.com/alexundkoch/contact-form-etch-studio.git
cd contact-form-etch-studio/worker
npm install
```

> **Tip:** Don't keep the project in a cloud-synced folder (iCloud Desktop/Documents, Dropbox, …). `node_modules` holds thousands of files. Sync clients offload them, and `wrangler` or `git` then hang or time out.

### 2. Configure the worker

Edit [`worker/wrangler.toml`](worker/wrangler.toml):

```toml
name = "contact-form"            # becomes contact-form.<your-subdomain>.workers.dev

[vars]
ALLOWED_ORIGINS = "https://example.com, https://www.example.com, https://my-site-preview.example.workers.dev"
SITE_NAME       = "example.com"
MAIL_FROM_NAME  = "Webform | example.com"   # display name in the inbox
SMTP_PORT       = "587"                     # 587 = STARTTLS, 465 = TLS
```

`ALLOWED_ORIGINS` lists every site address the form runs on. Use the exact origin, without a trailing slash, and include your preview domain while you test.

### 3. Log in and deploy

```bash
npx wrangler login      # opens the browser; if nothing happens: npx wrangler login --browser=false
npm run deploy
```

At the end, wrangler prints your worker URL, for example `https://contact-form.<your-subdomain>.workers.dev`.

### 4. Add the secrets

Each command asks for the value. Nothing is shown while you type or paste, which is normal.

```bash
npx wrangler secret put SMTP_HOST       # e.g. mail.example.com
npx wrangler secret put SMTP_USER       # usually the full mailbox address
npx wrangler secret put SMTP_PASSWORD
npx wrangler secret put MAIL_FROM       # must be the same address as SMTP_USER (see Troubleshooting)
npx wrangler secret put MAIL_TO         # where submissions go; several: a@example.com, b@example.com
```

Secrets take effect immediately, so you don't need to deploy again. You can also manage them in the Cloudflare dashboard under **Workers & Pages → your worker → Settings → Variables and Secrets**. That's the easiest way to change the recipient later.

> Keep `MAIL_FROM_NAME` and the other plain variables in `wrangler.toml`. If you change them in the dashboard, the next `wrangler deploy` overwrites them with the values from the file.

### 5. Optional: your own endpoint, e.g. `api.example.com`

If your domain's DNS is on Cloudflare, give the worker a custom domain. Uncomment this in `wrangler.toml` and deploy again:

```toml
routes = [
  { pattern = "api.example.com", custom_domain = true }
]
```

Cloudflare creates the DNS record and the certificate for you. This works even before your site itself is live on that domain. The zone only has to be on Cloudflare.

A subdomain is safer than a path route like `example.com/api/contact`, because it can't collide with whatever serves your site on the root domain.

> **Heads-up:** If you or your resolver looked up `api.example.com` *before* it existed, the "doesn't exist" answer stays cached for the zone's negative TTL. On Cloudflare that is up to 30 minutes. Public resolvers (1.1.1.1, 8.8.8.8) usually see it right away, and so does a phone on mobile data.

### 6. Add the form to Etch Studio

**Option A – create the component automatically (recommended)**

[`etch/create-component.js`](etch/create-component.js) uses the [Etch Connector](https://www.npmjs.com/package/@digital-gravy/etch-connector) to create everything in your open Etch Studio tab:

```bash
npx -y @digital-gravy/etch-connector serve           # keep this running (separate terminal)
npx -y @digital-gravy/etch-connector tabs            # find your tab name
npx -y @digital-gravy/etch-connector eval -t <tab> -f etch/create-component.js --timeout 60000
```

The script:

1. appends `@keyframes contact-form-spin` to your stylesheet **Main** (or the first stylesheet)
2. creates the class styles `.contact-form` and `.contact-form__*`, leaving any selectors you already have untouched
3. creates the component **ContactForm** with its props and attaches the block script to the `<form>`
4. saves the builder.

Then reload the tab, insert **ContactForm** on your contact page and set its props:

| Prop | Default | |
|---|---|---|
| Endpoint (worker URL) | `https://api.example.com` | your worker URL from step 3 or 5 |
| Privacy policy URL | `/privacy` | |
| Submit button text | `Send message` | |
| Message: sending / success / error | English defaults | translate as needed |

**Option B – build it by hand**

Rebuild the markup from [`contact-form.html`](etch/contact-form.html) in Etch. Then add each class with the CSS from [`contact-form.css`](etch/contact-form.css), put the `@keyframes` into a stylesheet, and add [`contact-form.js`](etch/contact-form.js) as the block script on the `<form>`.

Keep the hooks the script relies on:

- `data-contact-form` on the form
- `action` = your worker URL
- `data-contact-status` on the status element
- the `name` attributes of the fields

### 7. Publish and test

The form only sends on the **published** site, not inside the builder. Publish, open your contact page and send a test message. You should see:

- a spinner in the button and "Sending your message …"
- the green success message, and the form clears
- an email from **"Webform | example.com" &lt;no-reply@example.com&gt;**. Hitting *Reply* answers the visitor directly, because the worker sets `Reply-To`.

---

## Styling

All colours and sizes are custom properties on `.contact-form`, so you can theme the form without touching the component.

```css
.contact-form {
  --contact-form-accent: var(--primary);      /* button, checkbox */
  --contact-form-success: #1a7f37;
  --contact-form-error: #cf222e;
  --contact-form-radius: 0;
  --contact-form-gap: var(--space-m);
}
```

### Using it with Automatic.css (ACSS)

If your site uses [Automatic.css](https://automaticcss.com), the form picks up your tokens automatically. No setup is needed. Every variable reads the ACSS token first and only falls back to a plain value when the token doesn't exist:

| Form variable | ACSS token | Fallback |
|---|---|---|
| `--contact-form-text` | `--text-dark` | `#1f2328` |
| `--contact-form-muted` | `--text-dark-muted` | `#656d76` |
| `--contact-form-border` | `--border-color-dark` | `#d0d7de` |
| `--contact-form-field-bg` | `--white` | `#ffffff` |
| `--contact-form-accent` | `--primary` | `#1f2328` |
| `--contact-form-accent-text` | `--white` | `#ffffff` |
| `--contact-form-focus` | `--focus-color` | `#0969da` |
| `--contact-form-success` | `--success-dark` → `--success` | `#1a7f37` |
| `--contact-form-error` | `--danger-dark` → `--danger` | `#cf222e` |
| `--contact-form-radius` | `--radius-s` | `0.375rem` |
| `--contact-form-gap` | `--space-m` | `1.5rem` |

To use different tokens, override the variable, for example `--contact-form-accent: var(--secondary);`. To use ACSS button classes instead, add `btn--primary` to `.contact-form__submit` and remove its background and colour declarations.

States you can hook into:

- `.contact-form[data-state="sending" | "success" | "error"]`
- `:user-invalid` on the fields (red border after the user has interacted)
- `:disabled` on the submit button

## Troubleshooting

**The form shows the error message.** Look at the worker's logs: run `npx wrangler tail` in `worker/`, send the form again and read the output. Or use **Workers & Pages → your worker → Logs** in the dashboard. Common causes:

| Log / symptom | Cause | Fix |
|---|---|---|
| `553 5.7.1 Sender address rejected: not owned by user …` | `MAIL_FROM` differs from the SMTP login. Most mail servers only let a mailbox send as itself. | Set `MAIL_FROM` to the `SMTP_USER` address, or ask your host to allow a sender alias. The visitor's address belongs in `Reply-To`, which the worker already handles. |
| `origin_not_allowed` (HTTP 403) | The site's origin is missing from `ALLOWED_ORIGINS`. | Add it exactly (`https://…`, no trailing slash) and deploy. |
| Timeout / connection refused | Wrong host or port, or port 25 used. Cloudflare Workers can't connect on port 25. | Use 587 (STARTTLS) or 465 (TLS). |
| `535 Authentication failed` | Wrong username or password. | Re-run `wrangler secret put SMTP_USER` / `SMTP_PASSWORD`. |
| Works with `curl`, fails in the browser | The browser still uses an old endpoint, or DNS for a new custom domain is negatively cached. | Check the published `<form action>`; wait out the DNS cache (see step 5). |

**Mail arrives in spam.** Make sure your domain's SPF, DKIM and DMARC records cover the mail server you send through. If your DNS is on Cloudflare, mail-related records (MX, SPF, DKIM, DMARC, autodiscover) must be **DNS only** (grey cloud), never proxied.

**Etch Studio: styles disappear after reloading.** In the builder, components are saved right away, but class styles are only saved when the builder is saved. If you create styles through the API and reload before saving, the styles are gone, and Etch then also drops those classes from the blocks. `create-component.js` therefore saves at the end. If you script your own changes, save before you reload.

## Hardening ideas

- **Rate limiting:** Add a Cloudflare WAF rate-limiting rule for the endpoint, for example 5 requests per minute per IP.
- **Cloudflare Turnstile:** Add an invisible challenge and verify the token in the worker.
- **Confirmation email** to the visitor: add a second `send` with the visitor as recipient. Mind your privacy policy.
- When you go live, remove preview domains from `ALLOWED_ORIGINS`. Once the custom domain is set, consider `workers_dev = false`.

## Privacy

The form data passes through Cloudflare, your worker, and then your mail server. The worker stores nothing. Logs contain request metadata and, on failure, the error message, but not the form content. Mention Cloudflare as a processor in your privacy policy.

## License

[MIT](LICENSE)

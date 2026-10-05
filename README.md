# Contact form for Etch Studio – with a Cloudflare Worker and your own SMTP server

A free way to handle forms in Etch Studio with Cloudflare: a ready-made Etch component sends the form to a small Cloudflare Worker, and the worker delivers it to your inbox through your own mail server.

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
- **Spam protection built in.** The form has a honeypot field and optional [Cloudflare Turnstile](#8-optional-spam-protection-with-cloudflare-turnstile). The worker validates input on the server side and only accepts requests from your own domains (CORS allow-list).
- **Accessible feedback.** Native form validation runs first. Sending, success and error are announced through a `role="status"` region, and a loading spinner shows in the button.

## What's in here

| Path | What it is |
|---|---|
| [`worker/`](worker/) | The Cloudflare Worker: [`src/index.js`](worker/src/index.js) and [`wrangler.toml`](worker/wrangler.toml). |
| [`etch/contact-form.etch.json`](etch/contact-form.etch.json) | **Copy & paste into Etch Studio:** the component with styles and script, in Etch's clipboard format. |
| [`etch/spinner-keyframes.css`](etch/spinner-keyframes.css) | The `@keyframes` for the loading spinner. Paste them once into an Etch stylesheet. |
| [`etch/create-component.js`](etch/create-component.js) | Alternative: creates the Etch component **ContactForm** in your project (styles, props, script) via the Etch Connector. |
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

**Option A – copy & paste (easiest)**

[`etch/contact-form.etch.json`](etch/contact-form.etch.json) is in Etch Studio's own clipboard format, the same JSON Etch puts on the clipboard when you copy a block. It contains the component **ContactForm** with its props, all class styles and the block script. Tested with Etch Studio (October 2026).

1. Open [`contact-form.etch.json`](etch/contact-form.etch.json). On GitHub, use the *Raw* button or the copy icon, and copy the **entire** content.
2. In the Etch Studio builder, select the spot where the form should go, for example inside a container, and paste (`Cmd/Ctrl + V`).
3. **Add the spinner keyframes.** Copy this into one of your Etch stylesheets, for example **Main**. Etch's clipboard format carries class styles but no stylesheets, so this step is needed once:

   ```css
   @keyframes contact-form-spin {
     to {
       rotate: 1turn;
     }
   }
   ```

   > [!IMPORTANT]
   > Without these keyframes, the form still sends, but the loading spinner in the button doesn't turn. The same snippet is in [`etch/spinner-keyframes.css`](etch/spinner-keyframes.css).
4. Set the component's props (see below) and save.

**Option B – create the component with the Etch Connector**

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
| Message: sending / success / error / security check | English defaults | translate as needed |
| Turnstile site key (empty = off) | *(empty)* | optional, see step 8 |

**Option C – build it by hand**

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

### 8. Optional: spam protection with Cloudflare Turnstile

[Turnstile](https://developers.cloudflare.com/turnstile/) is Cloudflare's free, privacy-friendly CAPTCHA alternative. Most visitors never see a puzzle. It is **off by default** and switches on per setting:

| Site key prop | `TURNSTILE_SECRET` | Result |
|---|---|---|
| empty | not set | no Turnstile (default) |
| set | set | widget is shown, the worker rejects submissions without a valid token |

**Step by step**

1. **Create the widget.** In the Cloudflare dashboard, open **Turnstile → Add widget** and fill in:
   - **Widget name:** anything, e.g. `Contact form`
   - **Hostnames:** your domain, `www.` + your domain, and your preview domain while you test (e.g. `my-site.example.workers.dev`)
   - **Widget mode:** **Managed**. Cloudflare decides whether a checkbox is needed, most visitors only see a short "Verifying …".

   After saving you get two keys: a **site key**, which is public and goes into the page, and a **secret key**, which is private and goes into the worker.

2. **Add the secret key to the worker** (in `worker/`):
   ```bash
   npx wrangler secret put TURNSTILE_SECRET
   ```
   It takes effect immediately, so you don't need to deploy again.

3. **Add the site key to the form.** In Etch Studio, select the **ContactForm** component and paste the site key into the prop **Turnstile site key (empty = off)**. Save and publish.

   Do steps 2 and 3 right after each other: while only the secret is set, the worker rejects every submission.

4. **Test it.**
   - Open your published contact page. Above the button, the Turnstile box appears and shows "Success!" after a moment.
   - Send the form. The email arrives as before.
   - Check that the worker blocks requests without a token. This one must answer `{"error":"turnstile_failed"}`:
     ```bash
     curl -X POST https://api.example.com \
       -H "Origin: https://example.com" -H "Content-Type: application/json" \
       -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test","consent":true}'
     ```

**How it works**

- The script loads Turnstile only when a site key is set. It renders the widget above the button, sends the token with the form, and resets the widget after each submission, because a token is valid only once.
- The worker checks the token with Cloudflare's `siteverify` API, together with the visitor's IP, before it sends any email.
- To switch Turnstile off again, empty the site key prop and delete the secret: `npx wrangler secret delete TURNSTILE_SECRET`.

**Testing locally**

Cloudflare provides [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) that always pass or always fail:
- Site key `1x00000000000000000000AA` (passes) together with secret `1x0000000000000000000000000000000AA` (passes)
- Secret `2x0000000000000000000000000000000AA` (always fails)

For example: `npx wrangler dev --var TURNSTILE_SECRET:1x0000000000000000000000000000000AA`.

> Turnstile only works on the hostnames you registered. It doesn't work in the Etch builder or on `file://`.

### 9. Recommended: rate limiting

Browsers enforce the origin check, but a script can fake the `Origin` header. Add a rate-limiting rule so nobody can flood your inbox. The free plan includes one rule.

Go to **Security → WAF → Rate limiting rules → Create rule**:
- **If:** hostname equals `api.example.com` (or URI path for a route)
- **Rate:** 5 requests per 1 minute, counted by IP
- **Action:** Block for 1 minute

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
| `turnstile_failed` (HTTP 403) | `TURNSTILE_SECRET` is set, but the token is missing or invalid. Typical causes: the site key prop is empty, the hostname isn't registered in the Turnstile widget, or site key and secret belong to different widgets. | Set the site key prop, add the hostname to the widget, or check the key pair. To switch Turnstile off, delete the secret. |
| The Turnstile box doesn't appear | The site key prop is empty, the page isn't published yet, or a content blocker blocks `challenges.cloudflare.com`. | Check the prop and publish again. Test in a private window without extensions. |
| Works with `curl`, fails in the browser | The browser still uses an old endpoint, or DNS for a new custom domain is negatively cached. | Check the published `<form action>`; wait out the DNS cache (see step 5). |

**Mail arrives in spam.** Make sure your domain's SPF, DKIM and DMARC records cover the mail server you send through. If your DNS is on Cloudflare, mail-related records (MX, SPF, DKIM, DMARC, autodiscover) must be **DNS only** (grey cloud), never proxied.

**Etch Studio: styles disappear after reloading.** In the builder, components are saved right away, but class styles are only saved when the builder is saved. If you create styles through the API and reload before saving, the styles are gone, and Etch then also drops those classes from the blocks. `create-component.js` therefore saves at the end. If you script your own changes, save before you reload.

## Hardening ideas

- **Confirmation email** to the visitor: add a second `send` with the visitor as recipient. Mind your privacy policy.
- When you go live, remove preview domains from `ALLOWED_ORIGINS`. Once the custom domain is set, consider `workers_dev = false`.

## Privacy

The form data passes through Cloudflare, your worker, and then your mail server. The worker stores nothing. Logs contain request metadata and, on failure, the error message, but not the form content. Mention Cloudflare as a processor in your privacy policy. If you use Turnstile, mention it too: it loads a script from `challenges.cloudflare.com` and checks the visitor's browser.

## License

[MIT](LICENSE)

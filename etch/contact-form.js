// Contact form → Cloudflare Worker. Block script on form[data-contact-form]; the endpoint is the form's action attribute.
// Native validation (required, type=email) runs first – the submit event only fires for valid forms.
// Sends JSON via fetch, shows the result in [data-contact-status] and sets data-state="sending" | "success" | "error" on the form.
// Messages come from data-msg-sending / -success / -error / -verify on the form (component props).
// Optional Cloudflare Turnstile: [data-turnstile-sitekey] (component prop) – empty = off, nothing is loaded.
// Only works on the published site, not inside the builder.
(() => {
  let turnstileReady;
  const loadTurnstile = () => {
    turnstileReady ||= new Promise((resolve, reject) => {
      if (window.turnstile) return resolve(window.turnstile);
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = reject;
      document.head.append(script);
    });
    return turnstileReady;
  };

  const init = () => {
    document.querySelectorAll('form[data-contact-form]:not([data-contact-ready])').forEach((form) => {
      form.setAttribute('data-contact-ready', '');
      const status = form.querySelector('[data-contact-status]');
      const submit = form.querySelector('[type="submit"]');
      const msg = (key, fallback) => form.getAttribute(`data-msg-${key}`) || fallback;

      const show = (state, message) => {
        form.setAttribute('data-state', state);
        if (status) status.textContent = message;
      };

      // Turnstile only when a site key is set (unresolved builder placeholders like {props.…} are ignored)
      const widget = form.querySelector('[data-turnstile-sitekey]');
      const sitekey = widget ? widget.getAttribute('data-turnstile-sitekey').trim() : '';
      const useTurnstile = Boolean(sitekey) && !sitekey.startsWith('{');
      let widgetId = null;
      if (useTurnstile) {
        loadTurnstile()
          .then((turnstile) => { widgetId = turnstile.render(widget, { sitekey, action: 'contact', language: document.documentElement.lang || 'auto' }); })
          .catch(() => show('error', msg('error', 'Something went wrong. Please try again later.')));
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (form.getAttribute('data-state') === 'sending') return;

        const fields = new FormData(form);
        const payload = {
          name: fields.get('name'),
          email: fields.get('email'),
          phone: fields.get('phone'),
          subject: fields.get('subject'),
          message: fields.get('message'),
          consent: fields.get('consent') !== null,
          website: fields.get('website'), // honeypot
        };

        if (useTurnstile) {
          payload.turnstile = widgetId !== null ? window.turnstile.getResponse(widgetId) : '';
          if (!payload.turnstile) {
            show('error', msg('verify', 'Please complete the security check above the button.'));
            return;
          }
        }

        show('sending', msg('sending', 'Sending your message …'));
        if (submit) submit.disabled = true;

        try {
          const response = await fetch(form.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error('request_failed');
          form.reset();
          show('success', msg('success', 'Thank you! Your message has been sent.'));
        } catch {
          show('error', msg('error', 'Something went wrong. Please try again later.'));
        } finally {
          if (submit) submit.disabled = false;
          if (widgetId !== null) window.turnstile.reset(widgetId); // a token is valid only once
        }
      });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

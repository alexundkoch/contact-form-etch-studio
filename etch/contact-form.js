// Contact form → Cloudflare Worker. Block script on form[data-contact-form]; the endpoint is the form's action attribute.
// Native validation (required, type=email) runs first – the submit event only fires for valid forms.
// Sends JSON via fetch, shows the result in [data-contact-status] and sets data-state="sending" | "success" | "error" on the form.
// Messages come from data-msg-sending / data-msg-success / data-msg-error on the form (component props).
// Only works on the published site, not inside the builder.
(() => {
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
          show('error', msg('error', 'Something went wrong. Please try again.'));
        } finally {
          if (submit) submit.disabled = false;
        }
      });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

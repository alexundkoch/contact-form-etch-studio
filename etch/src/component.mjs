// Single source of truth for the Etch component „ContactForm“.
// `node etch/build.mjs` turns this into contact-form.html, contact-form.css and create-component.js.

export const KEY = 'ContactForm';
export const DESCRIPTION = 'Contact form (name, email, phone, subject, message, consent) that posts JSON to a Cloudflare Worker. BEM block .contact-form, block script on the form.';

// Component props: [label, key, default]
export const PROPS = [
  ['Endpoint (worker URL)', 'endpoint', 'https://api.example.com'],
  ['Privacy policy URL', 'privacyUrl', '/privacy'],
  ['Submit button text', 'submitText', 'Send message'],
  ['Message: sending', 'msgSending', 'Sending your message …'],
  ['Message: success', 'msgSuccess', 'Thank you! Your message has been sent.'],
  ['Message: error', 'msgError', 'Something went wrong. Please try again later.']
];

const el = (tag, cls, attributes = {}, children = []) => ({ tag, cls, attributes, children });
const txt = (text) => ({ text });

const field = (id, label, control) => el('div', 'contact-form__field', {}, [
  el('label', 'contact-form__label', { for: id }, [txt(label)]),
  control
]);
const input = (id, name, type, extra = {}) => el('input', 'contact-form__input', { id, name, type, ...extra });

export const TREE = el('form', 'contact-form', {
  id: 'contact-form',
  action: '{props.endpoint}',
  method: 'post',
  'aria-label': 'Contact form',
  'data-contact-form': '',
  'data-msg-sending': '{props.msgSending}',
  'data-msg-success': '{props.msgSuccess}',
  'data-msg-error': '{props.msgError}'
}, [
  // Honeypot: hidden from people and screen readers, bots tend to fill it
  el('div', 'contact-form__honeypot', { hidden: '', 'aria-hidden': 'true' }, [
    el('label', 'contact-form__label', { for: 'contact-form-website' }, [txt('Website')]),
    input('contact-form-website', 'website', 'text', { tabindex: '-1', autocomplete: 'off' })
  ]),
  el('div', 'contact-form__row', {}, [
    field('contact-form-name', 'Name *', input('contact-form-name', 'name', 'text', { autocomplete: 'name', required: '' })),
    field('contact-form-email', 'Email *', input('contact-form-email', 'email', 'email', { autocomplete: 'email', required: '' }))
  ]),
  el('div', 'contact-form__row', {}, [
    field('contact-form-phone', 'Phone', input('contact-form-phone', 'phone', 'tel', { autocomplete: 'tel' })),
    field('contact-form-subject', 'Subject *', input('contact-form-subject', 'subject', 'text', { required: '' }))
  ]),
  field('contact-form-message', 'Message *', el('textarea', 'contact-form__input', { id: 'contact-form-message', name: 'message', rows: '5', required: '' })),
  el('label', 'contact-form__consent', {}, [
    el('input', 'contact-form__checkbox', { type: 'checkbox', name: 'consent', required: '' }),
    el('span', 'contact-form__consent-text', {}, [
      txt('I agree that my details will be stored to process my request. See the '),
      el('a', 'contact-form__link', { href: '{props.privacyUrl}' }, [txt('privacy policy')]),
      txt('.')
    ])
  ]),
  el('div', 'contact-form__actions', {}, [
    el('button', 'contact-form__submit', { type: 'submit' }, [
      el('span', 'contact-form__submit-text', {}, [txt('{props.submitText}')]),
      el('span', 'contact-form__spinner', { 'aria-hidden': 'true' })
    ]),
    el('span', 'contact-form__required', {}, [txt('* Required')])
  ]),
  el('p', 'contact-form__status', { role: 'status', 'aria-live': 'polite', 'data-contact-status': '' })
]);

// Global keyframes (Etch: must live in a stylesheet, not in a class style)
export const KEYFRAMES = `@keyframes contact-form-spin {
  to {
    rotate: 1turn;
  }
}`;

// One entry per class; CSS nesting (&) is supported by Etch and all current browsers.
// Theme it through the custom properties on .contact-form: they use Automatic.css (ACSS) tokens when present
// and fall back to plain values otherwise.
export const STYLES = {
  '.contact-form': `/* ACSS tokens when available, plain fallbacks otherwise */
--contact-form-text: var(--text-dark, #1f2328);
--contact-form-muted: var(--text-dark-muted, #656d76);
--contact-form-border: var(--border-color-dark, #d0d7de);
--contact-form-field-bg: var(--white, #ffffff);
--contact-form-accent: var(--primary, #1f2328);
--contact-form-accent-text: var(--white, #ffffff);
--contact-form-focus: var(--focus-color, #0969da);
--contact-form-success: var(--success-dark, var(--success, #1a7f37));
--contact-form-error: var(--danger-dark, var(--danger, #cf222e));
--contact-form-radius: var(--radius-s, 0.375rem);
--contact-form-gap: var(--space-m, 1.5rem);

display: flex;
flex-direction: column;
gap: var(--contact-form-gap);
color: var(--contact-form-text);`,

  '.contact-form__honeypot': `display: none;`,

  '.contact-form__row': `display: grid;
grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
gap: var(--contact-form-gap);`,

  '.contact-form__field': `display: flex;
flex-direction: column;
gap: 0.5rem;`,

  '.contact-form__label': `font-size: 0.875rem;
font-weight: 600;`,

  '.contact-form__input': `box-sizing: border-box;
inline-size: 100%;
padding: 0.75rem 1rem;
border: 1px solid var(--contact-form-border);
border-radius: var(--contact-form-radius);
background: var(--contact-form-field-bg);
color: inherit;
font: inherit;

&:focus-visible {
  outline: 2px solid var(--contact-form-focus);
  outline-offset: 1px;
}

&:user-invalid {
  border-color: var(--contact-form-error);
}

&:is(textarea) {
  resize: vertical;
  min-block-size: 8rem;
}`,

  '.contact-form__consent': `display: flex;
align-items: flex-start;
gap: 0.75rem;
font-size: 0.875rem;
line-height: 1.6;
cursor: pointer;`,

  '.contact-form__checkbox': `flex-shrink: 0;
inline-size: 1.125rem;
block-size: 1.125rem;
margin: 0.15em 0 0;
accent-color: var(--contact-form-accent);`,

  '.contact-form__consent-text': ``,

  '.contact-form__link': `color: inherit;
text-underline-offset: 0.2em;`,

  '.contact-form__actions': `display: flex;
flex-wrap: wrap;
align-items: center;
gap: 1rem;`,

  '.contact-form__submit': `box-sizing: border-box;
display: inline-flex;
align-items: center;
gap: 0.625rem;
padding: 0.875rem 1.5rem;
border: 0;
border-radius: var(--contact-form-radius);
background: var(--contact-form-accent);
color: var(--contact-form-accent-text);
font: inherit;
font-weight: 600;
cursor: pointer;

&:disabled {
  opacity: 0.6;
  cursor: progress;
}

[data-state="sending"] & {
  opacity: 1;
}`,

  '.contact-form__submit-text': ``,

  '.contact-form__spinner': `display: none;
inline-size: 1em;
block-size: 1em;
border: 2px solid currentColor;
border-inline-end-color: transparent;
border-radius: 50%;
animation: contact-form-spin 0.7s linear infinite;

[data-state="sending"] & {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  animation-duration: 2s;
}`,

  '.contact-form__required': `font-size: 0.875rem;
color: var(--contact-form-muted);`,

  '.contact-form__status': `margin: 0;
padding: 0.75rem 1rem;
border-inline-start: 3px solid currentColor;
font-weight: 500;
line-height: 1.5;

&:empty {
  display: none;
}

[data-state="sending"] > & {
  padding-inline: 0;
  border-inline-start-color: transparent;
  font-weight: 400;
  color: var(--contact-form-muted);
}

[data-state="success"] > & {
  color: var(--contact-form-success);
  background: color-mix(in srgb, var(--contact-form-success) 10%, transparent);
}

[data-state="error"] > & {
  color: var(--contact-form-error);
  background: color-mix(in srgb, var(--contact-form-error) 8%, transparent);
}`
};

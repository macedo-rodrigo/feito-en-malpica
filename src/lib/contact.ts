/**
 * Builds the contact links. Phone numbers are stored once, in E.164
 * (`+34981000000`), and every link is derived from that single value so a
 * `tel:` link and a WhatsApp link can never disagree.
 */

/** `tel:` accepts E.164 as-is; keeping the `+` is what makes it dial abroad. */
export function telHref(e164: string): string {
  return `tel:${e164}`;
}

/**
 * wa.me wants the number without `+` or separators. A prefilled message is
 * optional and must be percent-encoded.
 */
export function whatsappHref(e164: string, message?: string): string {
  const digits = e164.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function mailtoHref(
  email: string,
  options: { subject?: string; body?: string } = {},
): string {
  const params = new URLSearchParams();
  if (options.subject) params.set('subject', options.subject);
  if (options.body) params.set('body', options.body);
  const query = params.toString();
  // URLSearchParams encodes spaces as "+", which mail clients show literally
  // in the subject line, so put them back as %20.
  return query ? `mailto:${email}?${query.replace(/\+/g, '%20')}` : `mailto:${email}`;
}

/**
 * Human-readable phone number. Spanish numbers are grouped 3-3-3, which is
 * how they are written locally; anything else is left in E.164 rather than
 * guessed at.
 */
export function formatPhone(e164: string): string {
  const spanish = e164.match(/^\+34(\d{3})(\d{3})(\d{3})$/);
  if (spanish) return `+34 ${spanish[1]} ${spanish[2]} ${spanish[3]}`;
  return e164;
}

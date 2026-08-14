import sanitizeHtml from 'sanitize-html';const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'a',
  'img',
  'hr',
  'span',
];

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return false;
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Sanitize note HTML before persistence.
 * Blocks buttons, forms, scripts, event handlers, and unsafe link protocols.
 */
export function sanitizeNoteContent(dirty?: string | null): string {
  if (!dirty?.trim()) return '';

  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title', 'class'],
      img: ['src', 'alt', 'title', 'class'],
      span: ['class'],
      p: ['class'],
      code: ['class'],
      pre: ['class'],
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
      a: ['http', 'https'],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? '';
        if (!isSafeUrl(href)) {
          return { tagName: 'span', attribs: {} };
        }
        return {
          tagName: 'a',
          attribs: {
            href,
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(attribs.class ? { class: attribs.class } : {}),
          },
        };
      },
      img: (tagName, attribs) => {
        const src = attribs.src ?? '';
        if (!isSafeUrl(src)) {
          return { tagName: 'span', attribs: {} };
        }
        return {
          tagName: 'img',
          attribs: {
            src,
            alt: attribs.alt ?? '',
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(attribs.class ? { class: attribs.class } : {}),
          },
        };
      },
      button: () => ({ tagName: 'span', attribs: {} }),
      form: () => ({ tagName: 'span', attribs: {} }),
      input: () => ({ tagName: 'span', attribs: {} }),
      script: () => ({ tagName: 'span', attribs: {} }),
      iframe: () => ({ tagName: 'span', attribs: {} }),
    },
  });
}

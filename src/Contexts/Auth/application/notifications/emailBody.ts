const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export const escapeHtml = (value: string): string =>
  value.replaceAll(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);

/** One plain-text body: paragraphs separated by a blank line. */
export const toText = (paragraphs: readonly string[]): string =>
  `${paragraphs.join('\n\n')}\n`;

/** Minimal HTML: one `<p>` per paragraph, already escaped by the caller. */
export const toHtml = (paragraphs: readonly string[]): string =>
  paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n');

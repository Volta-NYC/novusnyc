import DOMPurify from "dompurify";

const TIPTAP_ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "mark",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "span",
];

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TIPTAP_ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel", "style", "class"],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:)/i,
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: false,
    WHOLE_DOCUMENT: false,
    USE_PROFILES: { html: true },
  });
}

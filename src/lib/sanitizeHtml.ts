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

// Wraps bare URLs in text nodes with <a> tags. Runs after sanitizeHtml so the
// result is safe HTML. Does not re-wrap URLs already inside an href attribute.
export function linkifyHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  linkifyNode(div);
  return div.innerHTML;
}

function linkifyNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    const urlRe = /https?:\/\/[^\s<>"']+/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    const fragments: Node[] = [];
    while ((match = urlRe.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragments.push(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const a = document.createElement("a");
      a.href = match[0];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = match[0];
      a.className = "text-[#5C9911] hover:text-[#85CC17] underline-offset-2 hover:underline break-all";
      fragments.push(a);
      lastIndex = match.index + match[0].length;
    }
    if (fragments.length === 0) return;
    if (lastIndex < text.length) {
      fragments.push(document.createTextNode(text.slice(lastIndex)));
    }
    const parent = node.parentNode;
    if (!parent) return;
    for (const frag of fragments) {
      parent.insertBefore(frag, node);
    }
    parent.removeChild(node);
    return;
  }
  // Don't recurse into existing <a> tags — href is already a link
  if (node.nodeName === "A") return;
  for (const child of Array.from(node.childNodes)) {
    linkifyNode(child);
  }
}

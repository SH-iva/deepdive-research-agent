// Splits one line of markdown into plain / bold / link tokens.
// Only http(s) links are produced; anything else (javascript:, data:) stays plain text.
const TOKEN = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseInline(text) {
  const tokens = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) tokens.push({ type: "text", value: text.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ type: "bold", value: m[1] });
    else tokens.push({ type: "link", value: m[2], href: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}

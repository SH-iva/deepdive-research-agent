const LIST_COLS = "id,thread_id,title,query,mode,is_pinned,created_at";

export async function listHistory(sb, search = "") {
  let q = sb.from("reports").select(LIST_COLS)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (search.trim()) q = q.textSearch("fts", search.trim(), { type: "websearch", config: "english" });
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getReport(sb, id) {
  const { data, error } = await sb.from("reports").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

// user_id is filled by the database from the JWT; never send it from the client.
export async function saveReport(sb, row) {
  const { data, error } = await sb.from("reports").insert(row).select(LIST_COLS).single();
  if (error) throw error;
  return data;
}

export async function setPinned(sb, id, is_pinned) {
  const { error } = await sb.from("reports").update({ is_pinned }).eq("id", id);
  if (error) throw error;
}

export async function deleteReport(sb, id) {
  const { error } = await sb.from("reports").delete().eq("id", id);
  if (error) throw error;
}

const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

// The model sometimes writes 【https://…】 or bare URLs instead of Markdown links.
// Convert both into [host](url) so they render as links and show up in Sources.
export function normalizeCitations(md) {
  return md
    .replace(/【\s*(https?:\/\/[^\s】]+)\s*】/g, (_, url) => `[${hostOf(url)}](${url})`)
    .replace(/(^|\s)(https?:\/\/[^\s)\]】<>]+)/g, (_, pre, raw) => {
      const url = raw.replace(/[.,;:!?]+$/, "");
      return `${pre}[${hostOf(url)}](${url})${raw.slice(url.length)}`;
    });
}

export function extractSources(md) {
  const seen = new Map();
  for (const [, title, url] of md.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (seen.has(url)) continue;
    seen.set(url, { title, url, host: hostOf(url) });
  }
  return [...seen.values()];
}

export function deriveTitle(md, query) {
  const h = md.match(/^#{1,2}\s+(.+)$/m);
  return (h ? h[1] : query).replace(/[*_`]/g, "").trim().slice(0, 200) || "Untitled research";
}

export function groupByDate(items) {
  const now = new Date(); const day = 864e5;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups = { Pinned: [], Today: [], "Last 7 days": [], Older: [] };
  for (const it of items) {
    const t = new Date(it.created_at).getTime();
    (it.is_pinned ? groups.Pinned : t >= startToday ? groups.Today : t >= startToday - 6 * day ? groups["Last 7 days"] : groups.Older).push(it);
  }
  return Object.entries(groups).filter(([, v]) => v.length);
}
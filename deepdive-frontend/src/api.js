// src/api.js
// Dev:  leave VITE_API_BASE_URL unset -> relative "/api/..." goes through the Vite proxy.
// Prod: set VITE_API_BASE_URL=https://your-backend.example.com in Vercel and redeploy.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 120_000;

/**
 * @param {string} query
 * @param {string} threadId
 * @param {"new"|"followup"} mode  "new" = fresh research, "followup" = refine current report
 * @param {() => Promise<string|null>} getToken  Clerk's useAuth().getToken
 */
export async function research(query, threadId, mode, getToken) {
  const token = await getToken();
  if (!token) throw new Error("You are signed out. Please sign in again.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, thread_id: threadId, mode }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The request took too long. Please try again.");
    throw new Error(
      `Cannot reach the API at ${BASE || "(Vite proxy -> :8000)"}. ` +
        "Is the backend running, and is this origin allowed by CORS?"
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `API error ${res.status}`);
  }
  return res.json(); // { report, thread_id }
}


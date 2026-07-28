/**
 * The indexing pipeline:
 *
 *   url → fetch → extract main text → (title) → hand to the store
 *
 * The scaffold stubs the fetch so the service runs with nothing installed and
 * `text` submissions work for real. Wire a real fetch/extractor behind the
 * seam; the store and search are unchanged.
 */

import { extractMetadata, extractText } from "@klaro26/html";
import type { IndexRequest } from "./schema.js";

/* Fetch + extract main content — real: fetch the page and pull its clean text
 * and title via @klaro26/html. Respect robots.txt / a headless render for
 * JS-heavy pages when you productionise. */
async function fetchAndExtract(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": "klaro26-index/1.0 (+https://klaro26.dev)", accept: "text/html" },
  });
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  const html = await res.text();
  return {
    title: extractMetadata(html).title ?? new URL(url).hostname,
    text: extractText(html),
  };
}

export async function resolveContent(
  req: IndexRequest,
): Promise<{ title: string; text: string; url?: string }> {
  if (req.text) {
    return { title: req.title ?? "Untitled", text: req.text, url: req.url };
  }
  const fetched = await fetchAndExtract(req.url!);
  return { title: req.title ?? fetched.title, text: fetched.text, url: req.url };
}

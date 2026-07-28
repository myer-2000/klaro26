/**
 * The indexing pipeline:
 *
 *   url → fetch → extract main text → (title) → hand to the store
 *
 * The scaffold stubs the fetch so the service runs with nothing installed and
 * `text` submissions work for real. Wire a real fetch/extractor behind the
 * seam; the store and search are unchanged.
 */

import type { IndexRequest } from "./schema.js";

/* Fetch + extract main content ------------------------------------- *
 * Prod: fetch + readability / headless render; respect robots.txt. */
async function fetchAndExtract(url: string): Promise<{ title: string; text: string }> {
  // TODO: real fetch + main-content extraction.
  const host = new URL(url).hostname;
  return {
    title: `[stub] ${host}`,
    text: `[stub] Indexed main content for ${url}.`,
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

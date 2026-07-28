/**
 * The Everything → Markdown pipeline:
 *
 *   identify source → fetch → parse HTML → clean Markdown → (embed)
 *
 * The HTML → Markdown conversion and metadata extraction are *real* (see
 * `html.ts`) and fully deterministic. Fetching is the one seam: it uses the
 * global `fetch` for web pages, and per-source connectors (YouTube transcripts,
 * Reddit JSON, GitHub API, …) drop in behind `fetchSource` without changing the
 * rest of the pipeline.
 */

import type { MarkdownRequest, MarkdownResult } from "./schema.js";
import { extractMetadata, htmlToMarkdown } from "./html.js";
import { embedParagraphs } from "./embed.js";

export function identifySource(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "unknown";
    }
  })();
  if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
  if (host.includes("reddit")) return "reddit";
  if (host.includes("github")) return "github";
  if (host.includes("notion")) return "notion";
  return host;
}

/* Fetch the raw HTML for a URL. Per-source connectors slot in here. */
async function fetchSource(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "klaro26-markdown/1.0 (+https://klaro26.dev)", accept: "text/html" },
  });
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  return res.text();
}

export async function processMarkdown(req: MarkdownRequest): Promise<MarkdownResult> {
  const source = identifySource(req.url);
  // Raw HTML can be supplied directly (offline / testing); otherwise fetch it.
  const html = req.html ?? (await fetchSource(req.url));

  const markdown = htmlToMarkdown(html);
  const meta = extractMetadata(html);

  const result: MarkdownResult = {
    markdown,
    metadata: { source, url: req.url, ...meta },
  };
  if (req.embeddings) result.embeddings = embedParagraphs(markdown);
  return result;
}

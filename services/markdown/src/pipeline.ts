/**
 * The Everything → Markdown pipeline:
 *
 *   identify source → fetch → parse → normalize → clean Markdown → (embed)
 *
 * A single canonical intermediate representation means every connector feeds
 * the same downstream steps. Deterministic stubs ship so the service runs with
 * nothing installed.
 */

import type { MarkdownRequest, MarkdownResult } from "./schema.js";

/* 1) Identify source ------------------------------------------------ */
function identifySource(url: string): string {
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

/* 2) Fetch + parse + normalize ------------------------------------- *
 * Prod: per-source connector → canonical blocks → Markdown renderer. */
async function toMarkdown(url: string, source: string): Promise<string> {
  // TODO: real per-source connectors.
  return `# [stub] Title\n\nClean Markdown extracted from a ${source} source.\n\n- Source: ${url}\n- Normalized to one canonical format.\n`;
}

/* 3) Embed (optional) ---------------------------------------------- */
async function embed(markdown: string): Promise<number[][]> {
  // TODO: real embeddings. Stub: one tiny vector per paragraph.
  return markdown
    .split(/\n\n+/)
    .filter(Boolean)
    .map((p, i) => [i, p.length]);
}

export async function processMarkdown(
  req: MarkdownRequest,
): Promise<MarkdownResult> {
  const source = identifySource(req.url);
  const markdown = await toMarkdown(req.url, source);
  const result: MarkdownResult = {
    markdown,
    metadata: { source, title: "[stub] Title" },
  };
  if (req.embeddings) result.embeddings = await embed(markdown);
  return result;
}

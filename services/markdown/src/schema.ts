/**
 * Canonical output schema for the Everything → Markdown API.
 * YouTube, Reddit, GitHub, Notion, Slack exports — any source, one shape out.
 */

export interface MarkdownRequest {
  url: string;
  /** Provide raw HTML to convert directly, skipping the fetch. */
  html?: string;
  /** Return per-chunk embeddings alongside the text. */
  embeddings?: boolean;
}

export interface MarkdownMetadata {
  source: string;
  title?: string;
  author?: string;
  [key: string]: unknown;
}

export interface MarkdownResult {
  markdown: string;
  metadata: MarkdownMetadata;
  embeddings?: number[][];
}

export function parseMarkdownRequest(
  body: unknown,
): { ok: true; value: MarkdownRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.url !== "string" || b.url.length === 0) {
    return { ok: false, message: "'url' is required and must be a string" };
  }
  try {
    new URL(b.url);
  } catch {
    return { ok: false, message: "'url' must be a valid URL" };
  }
  if (b.html !== undefined && typeof b.html !== "string") {
    return { ok: false, message: "'html' must be a string when provided" };
  }
  return {
    ok: true,
    value: {
      url: b.url,
      html: typeof b.html === "string" ? b.html : undefined,
      embeddings: Boolean(b.embeddings),
    },
  };
}

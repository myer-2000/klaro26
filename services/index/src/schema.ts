/**
 * Schemas for the Open Index API.
 *
 * An open, self-hostable index of the web for agents. Submit URLs (or raw
 * text) to index; search the corpus by meaning. Content-addressed so the same
 * content is never stored twice.
 */

export interface IndexRequest {
  /** A URL to fetch and index. */
  url?: string;
  /** Or raw text to index directly (title optional). */
  text?: string;
  title?: string;
  /** Logical collection to index into. Defaults to "web". */
  collection?: string;
}

export interface SearchRequest {
  /** What to search for. */
  query: string;
  /** Collection to search within. Defaults to "web". */
  collection?: string;
  /** How many results to return. Defaults to 5. */
  k?: number;
}

export interface CrawlRequest {
  /** Seed URL to crawl from. */
  url: string;
  /** Max pages to fetch. Defaults to 20. */
  maxPages: number;
  /** Restrict to the seed's origin. Defaults to true. */
  sameOrigin: boolean;
  /** Collection to index into. Defaults to "web". */
  collection: string;
}

export interface IndexDoc {
  /** Content hash — the document's stable address. */
  id: string;
  collection: string;
  url?: string;
  title: string;
  text: string;
  indexedAt: number;
}

export interface SearchHit {
  id: string;
  url?: string;
  title: string;
  snippet: string;
  score: number;
}

export function parseIndexRequest(
  body: unknown,
): { ok: true; value: IndexRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  const hasUrl = typeof b.url === "string" && b.url.length > 0;
  const hasText = typeof b.text === "string" && b.text.length > 0;
  if (!hasUrl && !hasText) {
    return { ok: false, message: "Provide either 'url' or 'text'" };
  }
  if (hasUrl) {
    try {
      new URL(b.url as string);
    } catch {
      return { ok: false, message: "'url' must be a valid URL" };
    }
  }
  if (b.collection !== undefined && typeof b.collection !== "string") {
    return { ok: false, message: "'collection' must be a string" };
  }
  if (b.title !== undefined && typeof b.title !== "string") {
    return { ok: false, message: "'title' must be a string" };
  }
  return {
    ok: true,
    value: {
      url: hasUrl ? (b.url as string) : undefined,
      text: hasText ? (b.text as string) : undefined,
      title: (b.title as string) ?? undefined,
      collection: (b.collection as string) ?? "web",
    },
  };
}

export function parseCrawlRequest(
  body: unknown,
): { ok: true; value: CrawlRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.url !== "string" || b.url.length === 0) {
    return { ok: false, message: "'url' seed is required" };
  }
  try {
    new URL(b.url);
  } catch {
    return { ok: false, message: "'url' must be a valid URL" };
  }
  let maxPages = 20;
  if (b.maxPages !== undefined) {
    if (typeof b.maxPages !== "number" || b.maxPages < 1 || b.maxPages > 200) {
      return { ok: false, message: "'maxPages' must be a number between 1 and 200" };
    }
    maxPages = Math.floor(b.maxPages);
  }
  if (b.sameOrigin !== undefined && typeof b.sameOrigin !== "boolean") {
    return { ok: false, message: "'sameOrigin' must be a boolean" };
  }
  if (b.collection !== undefined && typeof b.collection !== "string") {
    return { ok: false, message: "'collection' must be a string" };
  }
  return {
    ok: true,
    value: {
      url: b.url,
      maxPages,
      sameOrigin: b.sameOrigin === undefined ? true : (b.sameOrigin as boolean),
      collection: (b.collection as string) ?? "web",
    },
  };
}

export function parseSearchRequest(
  body: unknown,
): { ok: true; value: Required<Pick<SearchRequest, "query" | "collection" | "k">> }
  | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.query !== "string" || b.query.trim().length === 0) {
    return { ok: false, message: "'query' is required" };
  }
  if (b.collection !== undefined && typeof b.collection !== "string") {
    return { ok: false, message: "'collection' must be a string" };
  }
  let k = 5;
  if (b.k !== undefined) {
    if (typeof b.k !== "number" || b.k < 1 || b.k > 100) {
      return { ok: false, message: "'k' must be a number between 1 and 100" };
    }
    k = Math.floor(b.k);
  }
  return {
    ok: true,
    value: { query: b.query, collection: (b.collection as string) ?? "web", k },
  };
}

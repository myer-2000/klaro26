/**
 * Schemas for the Agent Memory API.
 *
 * Two operations:
 *   - remember: store a piece of text (+ optional metadata) in a namespace
 *   - recall:   retrieve the most relevant memories for a query
 */

export interface RememberRequest {
  /** The text to remember. */
  text: string;
  /** Logical partition (e.g. per-agent or per-user). Defaults to "default". */
  namespace?: string;
  /** Arbitrary structured metadata stored alongside the memory. */
  metadata?: Record<string, unknown>;
}

export interface RecallRequest {
  /** What to search for. */
  query: string;
  /** Namespace to search within. Defaults to "default". */
  namespace?: string;
  /** How many memories to return. Defaults to 5. */
  k?: number;
}

export interface MemoryRecord {
  id: string;
  namespace: string;
  text: string;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface RecallMatch {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  /** Cosine similarity to the query, 0–1. */
  score: number;
}

export function parseRememberRequest(
  body: unknown,
): { ok: true; value: Required<Pick<RememberRequest, "text" | "namespace" | "metadata">> }
  | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.text !== "string" || b.text.trim().length === 0) {
    return { ok: false, message: "'text' is required" };
  }
  if (b.namespace !== undefined && typeof b.namespace !== "string") {
    return { ok: false, message: "'namespace' must be a string" };
  }
  if (
    b.metadata !== undefined &&
    (typeof b.metadata !== "object" || b.metadata === null || Array.isArray(b.metadata))
  ) {
    return { ok: false, message: "'metadata' must be an object" };
  }
  return {
    ok: true,
    value: {
      text: b.text,
      namespace: (b.namespace as string) ?? "default",
      metadata: (b.metadata as Record<string, unknown>) ?? {},
    },
  };
}

export function parseRecallRequest(
  body: unknown,
): { ok: true; value: Required<Pick<RecallRequest, "query" | "namespace" | "k">> }
  | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.query !== "string" || b.query.trim().length === 0) {
    return { ok: false, message: "'query' is required" };
  }
  if (b.namespace !== undefined && typeof b.namespace !== "string") {
    return { ok: false, message: "'namespace' must be a string" };
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
    value: { query: b.query, namespace: (b.namespace as string) ?? "default", k },
  };
}

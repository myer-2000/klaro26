/**
 * Canonical output schema for the Research API.
 * A question in — papers, patents, news, companies and a cited timeline out.
 */

export type Depth = "quick" | "standard" | "deep";

export interface ResearchRequest {
  /** The research question. */
  query: string;
  /** quick | standard | deep — trades latency for coverage. */
  depth?: Depth;
}

export interface Paper {
  title: string;
  authors?: string[];
  year: number;
  url?: string;
}
export interface Patent {
  id: string;
  title?: string;
  assignee: string;
  year?: number;
}
export interface NewsItem {
  title: string;
  source?: string;
  date?: string;
  url?: string;
}
export interface TimelineEvent {
  date: string;
  event: string;
}

/** A hit from our own crawled index — the primary research source. */
export interface WebResult {
  title: string;
  url?: string;
  snippet: string;
  score: number;
}

export interface ResearchResult {
  query: string;
  depth: Depth;
  summary: string;
  /** Ranked results from Klaro26's own index (our crawler, not a third party). */
  results: WebResult[];
  papers: Paper[];
  patents: Patent[];
  news: NewsItem[];
  companies: string[];
  timeline: TimelineEvent[];
  citations: number;
}

const DEPTHS: Depth[] = ["quick", "standard", "deep"];

export function parseResearchRequest(
  body: unknown,
): { ok: true; value: ResearchRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.query !== "string" || b.query.trim().length === 0) {
    return { ok: false, message: "'query' is required" };
  }
  let depth: Depth = "standard";
  if (b.depth !== undefined) {
    if (typeof b.depth !== "string" || !DEPTHS.includes(b.depth as Depth)) {
      return { ok: false, message: "'depth' must be one of quick | standard | deep" };
    }
    depth = b.depth as Depth;
  }
  return { ok: true, value: { query: b.query, depth } };
}

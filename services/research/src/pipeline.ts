/**
 * The Research pipeline — powered by our OWN index, not a third party.
 *
 *   query → search the Klaro26 index → ranked results
 *
 * Research runs on the corpus our own crawler built (see the /index service).
 * There are no external providers here: it queries /index/search over the
 * shared gateway. Academic papers, patents and news are separate specialised
 * sources and stay honest-empty seams until their own providers are wired.
 */

import type { ResearchRequest, ResearchResult, WebResult } from "./schema.js";

const INDEX_URL = (process.env.KLARO26_INDEX_URL ?? "http://localhost:8089").replace(/\/$/, "");
const API_KEY = process.env.KLARO26_API_KEY ?? "klaro26_dev_key";

const COVERAGE: Record<ResearchRequest["depth"] & string, number> = {
  quick: 5,
  standard: 10,
  deep: 25,
};

interface IndexHit {
  id: string;
  url?: string;
  title: string;
  snippet: string;
  score: number;
}

/** Shape index hits into a research result — pure + unit-tested. */
export function toResearchResult(
  query: string,
  depth: ResearchResult["depth"],
  hits: IndexHit[],
  note = "",
): ResearchResult {
  const results: WebResult[] = hits.map((h) => ({
    title: h.title,
    url: h.url,
    snippet: h.snippet,
    score: h.score,
  }));
  return {
    query,
    depth,
    summary:
      results.length > 0
        ? `Found ${results.length} results in the Klaro26 index for "${query}".`
        : `No results in the index for "${query}"${note}. Populate it with POST /index/crawl.`,
    results,
    papers: [],
    patents: [],
    news: [],
    companies: [],
    timeline: [],
    citations: 0,
  };
}

async function searchIndex(query: string, k: number): Promise<IndexHit[]> {
  const res = await fetch(`${INDEX_URL}/index/search`, {
    method: "POST",
    headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ query, k }),
  });
  if (!res.ok) throw new Error(`index search failed: HTTP ${res.status}`);
  const json = (await res.json()) as { ok: boolean; data?: { hits: IndexHit[] }; error?: { message: string } };
  if (!json.ok || !json.data) throw new Error(json.error?.message ?? "index error");
  return json.data.hits;
}

export async function processResearch(req: ResearchRequest): Promise<ResearchResult> {
  const depth = req.depth ?? "standard";
  const k = COVERAGE[depth] ?? 10;
  try {
    const hits = await searchIndex(req.query, k);
    return toResearchResult(req.query, depth, hits);
  } catch (e) {
    return toResearchResult(req.query, depth, [], ` (index unreachable: ${e instanceof Error ? e.message : String(e)})`);
  }
}

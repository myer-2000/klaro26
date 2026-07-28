/**
 * The Research pipeline:
 *
 *   query → search sources → dedupe → JSON
 *
 * Papers are REAL: they come from the public arXiv API (no key required). The
 * Atom response is parsed deterministically by `parseArxivAtom` (unit-tested).
 * Patents, news and company signals still need their own providers (patent
 * offices, news APIs, company graphs) and stay empty behind the seam rather
 * than fabricated.
 */

import { decodeEntities } from "@klaro26/html";
import type { Paper, ResearchRequest, ResearchResult } from "./schema.js";

/** Deeper runs pull more results from each source. */
const COVERAGE: Record<ResearchRequest["depth"] & string, number> = {
  quick: 4,
  standard: 8,
  deep: 16,
};

function tag(entry: string, name: string): string | undefined {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(entry);
  return m ? decodeEntities(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() : undefined;
}

/** Parse an arXiv Atom feed into papers — the real, testable core. */
export function parseArxivAtom(xml: string): Paper[] {
  const papers: Paper[] = [];
  for (const e of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
    const entry = e[1];
    const title = tag(entry, "title");
    if (!title) continue;
    const published = tag(entry, "published") ?? "";
    const year = Number(published.slice(0, 4)) || 0;
    const url = tag(entry, "id");
    const authors = [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi)].map((a) =>
      decodeEntities(a[1]).trim(),
    );
    papers.push({ title, authors: authors.length ? authors : undefined, year, url });
  }
  return papers;
}

async function searchArxiv(query: string, max: number): Promise<Paper[]> {
  const q = encodeURIComponent(query);
  const url = `http://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=${max}&sortBy=relevance`;
  const res = await fetch(url, { headers: { "user-agent": "klaro26-research/1.0 (+https://klaro26.dev)" } });
  if (!res.ok) throw new Error(`arXiv fetch failed: HTTP ${res.status}`);
  return parseArxivAtom(await res.text());
}

export async function processResearch(req: ResearchRequest): Promise<ResearchResult> {
  const depth = req.depth ?? "standard";
  const max = COVERAGE[depth] ?? 8;

  let papers: Paper[] = [];
  let sourceNote = "";
  try {
    papers = await searchArxiv(req.query, max);
  } catch (e) {
    sourceNote = ` (arXiv unreachable: ${e instanceof Error ? e.message : String(e)})`;
  }

  // A simple real timeline: earliest → latest paper year.
  const years = papers.map((p) => p.year).filter((y) => y > 0).sort((a, b) => a - b);
  const timeline =
    years.length > 0
      ? [
          { date: String(years[0]), event: "Earliest matching paper" },
          { date: String(years[years.length - 1]), event: "Most recent matching paper" },
        ]
      : [];

  return {
    query: req.query,
    depth,
    summary:
      papers.length > 0
        ? `Found ${papers.length} arXiv papers for "${req.query}". Patents, news and company signals need additional providers (not fabricated).`
        : `No papers returned${sourceNote}. Patents, news and company signals need additional providers (not fabricated).`,
    papers,
    patents: [],
    news: [],
    companies: [],
    timeline,
    citations: papers.length,
  };
}

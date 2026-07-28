/**
 * The Research pipeline:
 *
 *   query → plan → search sources → dedupe → synthesize → cite → JSON
 *
 * Deterministic stubs ship so the service runs with nothing installed. Wire the
 * real search/synthesis behind these seams; the rest is unchanged.
 */

import type { ResearchRequest, ResearchResult } from "./schema.js";

/** Deeper runs fan out to more sources — modelled here as a coverage factor. */
const COVERAGE: Record<ResearchRequest["depth"] & string, number> = {
  quick: 1,
  standard: 2,
  deep: 4,
};

export async function processResearch(req: ResearchRequest): Promise<ResearchResult> {
  const depth = req.depth ?? "standard";
  // COVERAGE controls fan-out once real sources are wired; referenced here so
  // the depth setting stays part of the contract.
  void COVERAGE[depth];

  // Honest seam: research needs external providers (academic, patent, news and
  // company-graph search) + LLM synthesis. Rather than fabricate results, we
  // return the empty, correctly-shaped contract with a clear note. Wire the
  // providers here and populate the arrays.
  return {
    query: req.query,
    depth,
    summary:
      "Research requires external search providers (academic, patents, news, company graphs) wired behind this seam. No results are fabricated.",
    papers: [],
    patents: [],
    news: [],
    companies: [],
    timeline: [],
    citations: 0,
  };
}

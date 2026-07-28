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
  const factor = COVERAGE[depth] ?? 2;

  // TODO: real multi-source search (academic, patents, news, company graphs)
  // + LLM synthesis with inline citations.
  return {
    query: req.query,
    depth,
    summary: `[stub] Synthesized answer to "${req.query}" with ${factor}× source coverage.`,
    papers: Array.from({ length: factor }, (_, i) => ({
      title: `[stub] Paper ${i + 1} on ${req.query}`,
      year: 2026,
    })),
    patents: [{ id: "[stub] US-0000000", assignee: "[stub] Assignee", year: 2025 }],
    news: [{ title: `[stub] Recent development in ${req.query}`, source: "[stub]", date: "2026-07" }],
    companies: ["[stub] Company A", "[stub] Company B"],
    timeline: [
      { date: "2024", event: "[stub] earlier milestone" },
      { date: "2026", event: "[stub] latest milestone" },
    ],
    citations: factor * 8,
  };
}

/**
 * The Browser pipeline:
 *
 *   task → plan → drive browser (click / type / read) → extract → JSON
 *
 * Deterministic stubs ship so the service runs with nothing installed. Wire a
 * real headless browser + agent loop behind the seams; the rest is unchanged.
 */

import type { BrowseRequest, BrowseResult } from "./schema.js";

export async function processBrowse(req: BrowseRequest): Promise<BrowseResult> {
  const ret = req.return ?? "structured";
  // TODO: real agent loop over a headless browser (Playwright), handling
  // logins, CAPTCHAs and dynamic UIs, then structured extraction.
  const steps = [
    "[stub] open target site",
    "[stub] navigate to the relevant page",
    "[stub] read and extract the answer",
  ];
  const sources = ["[stub] https://example.com/result"];

  const base: BrowseResult = {
    task: req.task,
    return: ret,
    result:
      ret === "markdown"
        ? `# [stub] Result\n\nAnswer to: ${req.task}`
        : { answer: `[stub] structured answer to: ${req.task}` },
    steps,
    sources,
  };
  if (ret === "screenshots") {
    base.screenshots = ["[stub] data:image/png;base64,…"];
  }
  return base;
}

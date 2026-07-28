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
  // Honest seam: driving a task needs a headless browser (Playwright) with an
  // agent loop for logins, CAPTCHAs and dynamic UIs. Rather than fabricate an
  // answer, we return the empty, correctly-shaped contract with a clear note.
  const note =
    "Browser automation requires a headless browser (Playwright) + agent loop wired behind this seam. No answer is fabricated.";

  const base: BrowseResult = {
    task: req.task,
    return: ret,
    result: ret === "markdown" ? `# Not run\n\n${note}` : { note },
    steps: [],
    sources: [],
  };
  if (ret === "screenshots") base.screenshots = [];
  return base;
}

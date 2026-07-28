/**
 * The Browser pipeline:
 *
 *   task → find a URL → fetch → extract → JSON
 *
 * Real subset: when the task references a URL, we actually fetch that page and
 * return its extracted content (via @klaro26/html). Full natural-language task
 * automation — logins, clicking, CAPTCHAs, multi-step flows — needs a headless
 * browser (Playwright) + an agent loop; that stays behind the seam and returns
 * an honest note rather than a fabricated answer.
 */

import { extractMetadata, extractText, htmlToMarkdown } from "@klaro26/html";
import type { BrowseRequest, BrowseResult, ReturnKind } from "./schema.js";

/** First http(s) URL mentioned in the task, if any. */
export function extractUrl(task: string): string | null {
  const m = /\bhttps?:\/\/[^\s"'<>)]+/i.exec(task);
  return m ? m[0] : null;
}

/** Map fetched page HTML into a browse result — the real, testable core. */
export function pageToBrowseResult(
  task: string,
  ret: ReturnKind,
  url: string,
  html: string,
): BrowseResult {
  const title = extractMetadata(html).title ?? null;
  const result =
    ret === "markdown"
      ? htmlToMarkdown(html)
      : { url, title, text: extractText(html).slice(0, 4000) };
  return {
    task,
    return: ret,
    result,
    steps: [`fetched ${url}`, "extracted page content"],
    sources: [url],
  };
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "klaro26-browse/1.0 (+https://klaro26.dev)", accept: "text/html" },
  });
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  return res.text();
}

export async function processBrowse(req: BrowseRequest): Promise<BrowseResult> {
  const ret = req.return ?? "structured";
  const url = extractUrl(req.task);

  if (url) {
    try {
      const html = await fetchPage(url);
      const base = pageToBrowseResult(req.task, ret, url, html);
      if (ret === "screenshots") base.screenshots = [];
      return base;
    } catch (e) {
      const note = `Found ${url} but couldn't fetch it (${e instanceof Error ? e.message : String(e)}).`;
      return { task: req.task, return: ret, result: ret === "markdown" ? `# Not run\n\n${note}` : { note }, steps: [], sources: [] };
    }
  }

  const note =
    "No URL in the task. Free-form task automation (clicking, logins, dynamic pages) needs a headless browser (Playwright) + agent loop wired behind this seam. No answer is fabricated.";
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

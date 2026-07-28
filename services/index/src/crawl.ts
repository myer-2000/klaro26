/**
 * Our own web crawler — no third-party service.
 *
 * Breadth-first from a seed URL: fetch a page, extract its clean text + title
 * (via @klaro26/html), enqueue its links, repeat until a page budget is hit.
 * Same-origin by default, with depth limits, a politeness delay, and real
 * robots.txt respect. `fetchHtml` is injected so the whole crawl → index →
 * search pipeline is testable offline against a fake site.
 */

import { extractLinks, extractMetadata, extractText } from "@klaro26/html";

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  depth: number;
}

export interface CrawlOptions {
  maxPages?: number;
  sameOrigin?: boolean;
  /** Max link depth from the seed (seed = 0). Default 3. */
  maxDepth?: number;
  /** Delay between fetches, ms. Default 0 (set higher to be polite). */
  delayMs?: number;
  /** Honour robots.txt. Default true. */
  respectRobots?: boolean;
  userAgent?: string;
}

/** Returns page HTML/text, or null if the page couldn't be fetched. */
export type FetchHtml = (url: string) => Promise<string | null>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalize(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Parse the Disallow prefixes that apply to a user-agent from robots.txt. */
export function robotsDisallows(robotsTxt: string, ua = "*"): string[] {
  const out: string[] = [];
  for (const record of robotsTxt.split(/\n\s*\n/)) {
    const lines = record
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*/, "").trim())
      .filter(Boolean);
    const agents = lines
      .filter((l) => /^user-agent\s*:/i.test(l))
      .map((l) => l.split(":")[1].trim().toLowerCase());
    if (!agents.includes("*") && !agents.includes(ua.toLowerCase())) continue;
    for (const l of lines) {
      const m = /^disallow\s*:\s*(.*)$/i.exec(l);
      if (m && m[1].trim()) out.push(m[1].trim());
    }
  }
  return [...new Set(out)];
}

/** Is a path allowed given the parsed Disallow prefixes? */
export function robotsAllows(disallows: string[], path: string): boolean {
  return !disallows.some((d) => path.startsWith(d));
}

export async function crawl(
  seeds: string[],
  opts: CrawlOptions,
  fetchHtml: FetchHtml,
): Promise<CrawledPage[]> {
  const maxPages = opts.maxPages ?? 20;
  const sameOrigin = opts.sameOrigin ?? true;
  const maxDepth = opts.maxDepth ?? 3;
  const delayMs = opts.delayMs ?? 0;
  const respectRobots = opts.respectRobots ?? true;
  const ua = opts.userAgent ?? "klaro26";
  const seedOrigin = seeds.length ? originOf(seeds[0]) : "";

  let disallows: string[] = [];
  if (respectRobots && seedOrigin) {
    const robots = await fetchHtml(`${seedOrigin}/robots.txt`);
    if (robots) disallows = robotsDisallows(robots, ua);
  }
  const allowed = (u: string): boolean => {
    if (sameOrigin && seedOrigin && originOf(u) !== seedOrigin) return false;
    try {
      return robotsAllows(disallows, new URL(u).pathname);
    } catch {
      return true;
    }
  };

  const queue: { url: string; depth: number }[] = seeds.map((u) => ({ url: u, depth: 0 }));
  const seen = new Set<string>();
  const pages: CrawledPage[] = [];
  let fetched = 0;

  while (queue.length > 0 && pages.length < maxPages) {
    const { url, depth } = queue.shift()!;
    const key = normalize(url);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!allowed(url)) continue;

    if (fetched > 0 && delayMs > 0) await sleep(delayMs);
    fetched++;
    const html = await fetchHtml(url);
    if (!html) continue;

    pages.push({
      url,
      title: extractMetadata(html).title ?? hostOf(url),
      text: extractText(html),
      depth,
    });

    if (depth < maxDepth) {
      for (const link of extractLinks(html, url)) {
        const nkey = normalize(link.href);
        if (!seen.has(nkey) && allowed(link.href)) {
          queue.push({ url: link.href, depth: depth + 1 });
        }
      }
    }
  }

  return pages;
}

/**
 * Our own web crawler — no third-party service.
 *
 * Breadth-first from a seed URL: fetch a page, extract its clean text + title
 * (via @klaro26/html), enqueue its links, repeat until a page budget is hit.
 * Same-origin by default. `fetchHtml` is injected so the whole crawl → index →
 * search pipeline is testable offline against a fake site.
 */

import { extractLinks, extractMetadata, extractText } from "@klaro26/html";

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface CrawlOptions {
  maxPages?: number;
  sameOrigin?: boolean;
}

/** Returns page HTML, or null if the page couldn't be fetched. */
export type FetchHtml = (url: string) => Promise<string | null>;

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

export async function crawl(
  seeds: string[],
  opts: CrawlOptions,
  fetchHtml: FetchHtml,
): Promise<CrawledPage[]> {
  const maxPages = opts.maxPages ?? 20;
  const sameOrigin = opts.sameOrigin ?? true;
  const seedOrigin = seeds.length ? originOf(seeds[0]) : "";

  const queue: string[] = [...seeds];
  const seen = new Set<string>();
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift()!;
    const key = normalize(url);
    if (seen.has(key)) continue;
    seen.add(key);
    if (sameOrigin && seedOrigin && originOf(url) !== seedOrigin) continue;

    const html = await fetchHtml(url);
    if (!html) continue;

    pages.push({
      url,
      title: extractMetadata(html).title ?? hostOf(url),
      text: extractText(html),
    });

    for (const link of extractLinks(html, url)) {
      const nkey = normalize(link.href);
      if (seen.has(nkey)) continue;
      if (sameOrigin && seedOrigin && originOf(link.href) !== seedOrigin) continue;
      queue.push(link.href);
    }
  }

  return pages;
}

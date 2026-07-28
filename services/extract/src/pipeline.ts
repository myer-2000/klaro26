/**
 * The Website Understanding pipeline:
 *
 *   url → fetch → parse HTML → extract typed sections → JSON
 *
 * The extraction is *real* and deterministic, built on the shared
 * @klaro26/html toolkit: title/summary from metadata, pricing from currency
 * patterns, FAQ from <details>/question headings, contact from mailto/tel and
 * text, docs from link analysis. Fetching is the one seam (global fetch, or
 * supply raw `html`); an LLM refinement pass can slot in behind the same shape.
 */

import {
  detectContact,
  detectDocs,
  detectFaq,
  detectPricing,
  extractHeadings,
  extractLinks,
  extractMetadata,
  extractText,
} from "@klaro26/html";
import type {
  ExtractRequest,
  PricingPlan,
  Product,
  WebsiteUnderstanding,
} from "./schema.js";

async function fetchSite(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "klaro26-extract/1.0 (+https://klaro26.dev)", accept: "text/html" },
  });
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  return res.text();
}

function firstSentence(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const end = clean.search(/[.!?]\s/);
  const s = end > 40 ? clean.slice(0, end + 1) : clean.slice(0, max);
  return s.length < clean.length && end <= 40 ? `${s.trimEnd()}…` : s;
}

/** Products: list items that sit under a "products"-like heading, if any. */
function detectProducts(html: string): Product[] {
  const m = /<h[1-3][^>]*>[^<]*\b(products?|features?|catalog(?:ue)?)\b[^<]*<\/h[1-3]>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/i.exec(html);
  if (!m) return [];
  return [...m[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((li) => ({ name: li[1].replace(/<[^>]+>/g, "").trim() }))
    .filter((p) => p.name.length > 0);
}

export async function processExtract(req: ExtractRequest): Promise<WebsiteUnderstanding> {
  const html = req.html ?? (await fetchSite(req.url));

  const meta = extractMetadata(html);
  const headings = extractHeadings(html);
  const text = extractText(html);
  const links = extractLinks(html, req.url);

  const pricing: PricingPlan[] = detectPricing(html).map((p) => ({
    plan: p.context,
    price: p.amount,
    period: p.period,
  }));

  const all: WebsiteUnderstanding = {
    url: req.url,
    title: meta.title ?? headings.find((h) => h.level === 1)?.text ?? new URL(req.url).hostname,
    summary: (meta.description as string) ?? (text ? firstSentence(text) : ""),
    pricing,
    products: detectProducts(html),
    faq: detectFaq(html),
    contact: detectContact(html),
    docs: detectDocs(links),
  };

  if (!req.fields || req.fields.length === 0) return all;
  const keep = new Set(req.fields);
  return {
    url: all.url,
    title: all.title,
    summary: keep.has("summary") ? all.summary : "",
    pricing: keep.has("pricing") ? all.pricing : [],
    products: keep.has("products") ? all.products : [],
    faq: keep.has("faq") ? all.faq : [],
    contact: keep.has("contact") ? all.contact : {},
    docs: keep.has("docs") ? all.docs : [],
  };
}

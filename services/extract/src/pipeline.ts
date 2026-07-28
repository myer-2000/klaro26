/**
 * The Website Understanding pipeline:
 *
 *   url → fetch → render → classify sections → extract → normalize → JSON
 *
 * Deterministic stubs ship so the service runs with nothing installed. Wire the
 * real crawler/LLM extractor behind these seams; the rest is unchanged.
 */

import type {
  ExtractRequest,
  Product,
  PricingPlan,
  QA,
  WebsiteUnderstanding,
} from "./schema.js";

/* 1) Fetch + render ------------------------------------------------- *
 * Prod: headless browser or fetch + readability; respect robots.txt. */
async function fetchSite(_url: string): Promise<string> {
  // TODO: real fetch/render. Returns raw HTML/text for extraction.
  return "[stub] rendered page content";
}

/* 2) Extract typed sections ---------------------------------------- *
 * Prod: LLM/structured extractor over the rendered DOM. */
function extractSections(url: string): Omit<WebsiteUnderstanding, "url"> {
  const pricing: PricingPlan[] = [
    { plan: "Free", price: 0, period: "mo", features: ["[stub] basic access"] },
    { plan: "Pro", price: 49, period: "mo", features: ["[stub] everything in Free", "[stub] priority"] },
  ];
  const products: Product[] = [{ name: "[stub] Flagship product", price: 49 }];
  const faq: QA[] = [{ q: "[stub] Is there a free tier?", a: "[stub] Yes." }];
  return {
    title: `[stub] ${new URL(url).hostname}`,
    summary: `[stub] One-paragraph summary of ${new URL(url).hostname}.`,
    pricing,
    products,
    faq,
    contact: { email: "hi@example.com" },
    docs: ["[stub] https://example.com/docs"],
  };
}

export async function processExtract(req: ExtractRequest): Promise<WebsiteUnderstanding> {
  await fetchSite(req.url);
  const all = extractSections(req.url);
  if (!req.fields || req.fields.length === 0) return { url: req.url, ...all };
  // Field selection: blank out anything not requested.
  const keep = new Set(req.fields);
  return {
    url: req.url,
    title: all.title,
    summary: keep.has("summary") ? all.summary : "",
    pricing: keep.has("pricing") ? all.pricing : [],
    products: keep.has("products") ? all.products : [],
    faq: keep.has("faq") ? all.faq : [],
    contact: keep.has("contact") ? all.contact : {},
    docs: keep.has("docs") ? all.docs : [],
  };
}

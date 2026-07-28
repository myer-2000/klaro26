/**
 * Canonical output schema for the Website Understanding API.
 * Any URL in — pricing, FAQ, products, contact and docs as typed JSON out.
 */

export interface ExtractRequest {
  /** The website to understand. */
  url: string;
  /** Provide raw HTML to understand directly, skipping the fetch. */
  html?: string;
  /** Restrict extraction to specific sections (pricing, faq, products, …). */
  fields?: string[];
}

export interface PricingPlan {
  plan: string;
  price: number | string;
  period?: string;
  features?: string[];
}
export interface QA {
  q: string;
  a: string;
}
export interface Product {
  name: string;
  price?: number | string;
  url?: string;
}

export interface WebsiteUnderstanding {
  url: string;
  title: string;
  summary: string;
  pricing: PricingPlan[];
  products: Product[];
  faq: QA[];
  contact: { email?: string; phone?: string; address?: string };
  docs: string[];
}

const ALLOWED_FIELDS = ["pricing", "products", "faq", "contact", "docs", "summary"];

export function parseExtractRequest(
  body: unknown,
): { ok: true; value: ExtractRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.url !== "string" || b.url.length === 0) {
    return { ok: false, message: "'url' is required" };
  }
  try {
    new URL(b.url);
  } catch {
    return { ok: false, message: "'url' must be a valid URL" };
  }
  if (b.html !== undefined && typeof b.html !== "string") {
    return { ok: false, message: "'html' must be a string when provided" };
  }
  let fields: string[] | undefined;
  if (b.fields !== undefined) {
    if (!Array.isArray(b.fields) || b.fields.some((f) => typeof f !== "string")) {
      return { ok: false, message: "'fields' must be an array of strings" };
    }
    const bad = (b.fields as string[]).filter((f) => !ALLOWED_FIELDS.includes(f));
    if (bad.length > 0) {
      return { ok: false, message: `Unknown fields: ${bad.join(", ")}` };
    }
    fields = b.fields as string[];
  }
  return {
    ok: true,
    value: { url: b.url, html: typeof b.html === "string" ? b.html : undefined, fields },
  };
}

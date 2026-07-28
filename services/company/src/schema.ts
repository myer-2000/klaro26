/**
 * Canonical output schema for the Company Intelligence API.
 * A name in — funding, competitors, pricing, hiring, tech stack and a brief out.
 */

export interface CompanyRequest {
  /** Company name or domain. */
  name: string;
  /** Limit to specific sections (funding, hiring, pricing, …). */
  sections?: string[];
}

export interface FundingRound {
  round: string;
  amount: string;
  date?: string;
  investors?: string[];
}
export interface PricingTier {
  plan: string;
  price: string;
}

export interface CompanyIntel {
  name: string;
  domain?: string;
  summary: string;
  funding: FundingRound[];
  competitors: string[];
  products: string[];
  pricing: PricingTier[];
  hiring: string[];
  techStack: string[];
}

const ALLOWED_SECTIONS = [
  "funding",
  "competitors",
  "products",
  "pricing",
  "hiring",
  "techStack",
  "summary",
];

export function parseCompanyQuery(
  params: URLSearchParams,
): { ok: true; value: CompanyRequest } | { ok: false; message: string } {
  const name = params.get("name");
  if (!name || name.trim().length === 0) {
    return { ok: false, message: "'name' query parameter is required" };
  }
  let sections: string[] | undefined;
  const raw = params.get("sections");
  if (raw) {
    sections = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const bad = sections.filter((s) => !ALLOWED_SECTIONS.includes(s));
    if (bad.length > 0) {
      return { ok: false, message: `Unknown sections: ${bad.join(", ")}` };
    }
  }
  return { ok: true, value: { name, sections } };
}

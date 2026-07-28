/**
 * The Company Intelligence pipeline:
 *
 *   name → resolve domain → fetch site → extract real signals → JSON
 *
 * A company's own website is a genuine, deterministic source, so summary,
 * pricing and tech stack are extracted for real via @klaro26/html. Funding,
 * competitors and hiring need external databases (funding APIs, job boards) —
 * those stay empty here rather than fabricated, and drop in behind the seams.
 */

import { detectPricing, extractMetadata, extractText } from "@klaro26/html";
import type { CompanyIntel, CompanyRequest } from "./schema.js";

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", GBP: "£", EUR: "€" };

/** Lightweight tech fingerprints found directly in page markup. */
const TECH: [string, RegExp][] = [
  ["Stripe", /\bstripe\b/i],
  ["React", /\breact(dom)?\b|data-reactroot/i],
  ["Next.js", /\/_next\/|next\.js/i],
  ["Vercel", /vercel/i],
  ["Shopify", /shopify/i],
  ["HubSpot", /hubspot|hs-scripts/i],
  ["Cloudflare", /cloudflare|cdn-cgi/i],
  ["Segment", /segment\.(com|io)|analytics\.js/i],
  ["Intercom", /intercom/i],
  ["Google Analytics", /gtag\(|google-analytics|googletagmanager/i],
];

export function deriveDomain(name: string): string {
  const host = name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (/\.[a-z]{2,}$/.test(host)) return host;
  return `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
}

/** Extract a company dossier from its homepage HTML — the real work. */
export function companyFromHtml(name: string, domain: string, html: string): CompanyIntel {
  const meta = extractMetadata(html);
  const prices = detectPricing(html).slice(0, 8);
  const pricing = prices.map((p) => ({
    plan: p.plan ?? "Plan",
    price: `${CURRENCY_SYMBOL[p.currency] ?? ""}${p.amount.toLocaleString()}${p.period ? `/${p.period}` : ""}`,
  }));
  const products = [...new Set(prices.map((p) => p.plan).filter((x): x is string => Boolean(x)))];
  const techStack = TECH.filter(([, re]) => re.test(html)).map(([n]) => n);
  const summary =
    ((meta.description as string | undefined) ?? extractText(html).slice(0, 220).trim()) ||
    `Homepage of ${name}.`;

  return {
    name,
    domain,
    summary,
    funding: [],
    competitors: [],
    products,
    pricing,
    hiring: [],
    techStack,
  };
}

async function fetchSite(domain: string): Promise<string> {
  const res = await fetch(`https://${domain}`, {
    headers: { "user-agent": "klaro26-company/1.0 (+https://klaro26.dev)", accept: "text/html" },
  });
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  return res.text();
}

export async function processCompany(req: CompanyRequest): Promise<CompanyIntel> {
  const domain = deriveDomain(req.name);
  let all: CompanyIntel;
  try {
    const html = await fetchSite(domain);
    all = companyFromHtml(req.name, domain, html);
  } catch {
    all = {
      name: req.name,
      domain,
      summary: `Couldn't reach a public site for ${req.name}.`,
      funding: [],
      competitors: [],
      products: [],
      pricing: [],
      hiring: [],
      techStack: [],
    };
  }

  if (!req.sections || req.sections.length === 0) return all;
  const keep = new Set(req.sections);
  return {
    name: all.name,
    domain: all.domain,
    summary: keep.has("summary") ? all.summary : "",
    funding: keep.has("funding") ? all.funding : [],
    competitors: keep.has("competitors") ? all.competitors : [],
    products: keep.has("products") ? all.products : [],
    pricing: keep.has("pricing") ? all.pricing : [],
    hiring: keep.has("hiring") ? all.hiring : [],
    techStack: keep.has("techStack") ? all.techStack : [],
  };
}

/**
 * The Company Intelligence pipeline:
 *
 *   name → resolve entity → gather sources → synthesize dossier → JSON
 *
 * Deterministic stubs ship so the service runs with nothing installed. Wire
 * real data sources (funding DBs, job boards, tech detectors) behind the seams.
 */

import type { CompanyIntel, CompanyRequest } from "./schema.js";

function fullDossier(name: string): CompanyIntel {
  return {
    name,
    domain: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
    summary: `[stub] One-paragraph brief on ${name}.`,
    funding: [{ round: "[stub] Series —", amount: "[stub] $—", date: "2025" }],
    competitors: ["[stub] Competitor A", "[stub] Competitor B"],
    products: ["[stub] Flagship product"],
    pricing: [{ plan: "[stub] Pro", price: "[stub] $—" }],
    hiring: ["[stub] Engineering", "[stub] Sales"],
    techStack: ["[stub] TypeScript", "[stub] Postgres"],
  };
}

export async function processCompany(req: CompanyRequest): Promise<CompanyIntel> {
  // TODO: real entity resolution + multi-source enrichment + LLM synthesis.
  const all = fullDossier(req.name);
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

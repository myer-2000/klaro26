/**
 * The People resolution pipeline:
 *
 *   name → look up → merge → JSON
 *
 * A real, keyless source is wired for notable people: Wikipedia's REST summary
 * API gives a genuine bio + canonical link. `personFromWiki` maps the response
 * deterministically (unit-tested). Skills, companies and social handles need a
 * dedicated people-search provider and stay empty behind the seam rather than
 * being fabricated.
 */

import type { PersonRequest, PersonProfile } from "./schema.js";

interface WikiSummary {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
}

/** Map a Wikipedia summary payload into a profile — the real, testable core. */
export function personFromWiki(name: string, data: WikiSummary | null): PersonProfile {
  const empty: PersonProfile = {
    name,
    bio: `No public profile resolved for "${name}". People resolution across skills, companies and socials needs a dedicated provider (not fabricated).`,
    skills: [],
    companies: [],
    projects: [],
    socials: {},
    confidence: 0,
  };
  if (!data || !data.extract || data.type === "disambiguation") return empty;

  const page = data.content_urls?.desktop?.page;
  return {
    name: data.title ?? name,
    bio: data.extract,
    skills: [],
    companies: [],
    projects: [],
    socials: page ? { wikipedia: page } : {},
    confidence: data.type === "standard" ? 0.8 : 0.5,
  };
}

async function wikiSummary(name: string): Promise<WikiSummary | null> {
  const slug = encodeURIComponent(name.trim().replace(/\s+/g, "_"));
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
    headers: { "user-agent": "klaro26-person/1.0 (+https://klaro26.dev)", accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as WikiSummary;
}

export async function processPerson(req: PersonRequest): Promise<PersonProfile> {
  let data: WikiSummary | null = null;
  try {
    data = await wikiSummary(req.name);
  } catch {
    data = null;
  }
  return personFromWiki(req.name, data);
}

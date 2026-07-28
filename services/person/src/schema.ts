/**
 * Canonical output schema for the People API.
 * A name (plus optional hint) in — one resolved public profile out.
 */

export interface PersonRequest {
  /** Full name to resolve. */
  name: string;
  /** A company, handle or URL to disambiguate. */
  hint?: string;
}

export interface PersonProfile {
  name: string;
  bio: string;
  skills: string[];
  companies: string[];
  projects: string[];
  socials: Record<string, string>;
  /** 0–1 confidence that the resolution is correct. */
  confidence: number;
}

export function parsePersonQuery(
  params: URLSearchParams,
): { ok: true; value: PersonRequest } | { ok: false; message: string } {
  const name = params.get("name");
  if (!name || name.trim().length === 0) {
    return { ok: false, message: "'name' query parameter is required" };
  }
  const hint = params.get("hint") ?? undefined;
  return { ok: true, value: { name, hint: hint || undefined } };
}

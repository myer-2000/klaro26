/**
 * The People resolution pipeline:
 *
 *   name (+ hint) → search public web → disambiguate → merge → JSON
 *
 * Deterministic stubs ship so the service runs with nothing installed. Wire
 * real search + entity-matching behind the seams; the rest is unchanged.
 */

import type { PersonProfile, PersonRequest } from "./schema.js";

export async function processPerson(req: PersonRequest): Promise<PersonProfile> {
  // Honest seam: resolving a person needs a people-search provider + entity
  // resolution across sources. Rather than fabricate a profile, we return the
  // empty, correctly-shaped contract (confidence 0) with a clear note.
  return {
    name: req.name,
    bio: `Person resolution requires a people-search provider wired behind this seam. No profile is fabricated for "${req.name}".`,
    skills: [],
    companies: [],
    projects: [],
    socials: {},
    confidence: 0,
  };
}

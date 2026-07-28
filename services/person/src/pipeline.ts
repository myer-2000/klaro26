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
  // A hint (company/handle/URL) raises resolution confidence.
  const confidence = req.hint ? 0.92 : 0.74;
  // TODO: real multi-source search + entity resolution + profile merge.
  return {
    name: req.name,
    bio: `[stub] Short public bio for ${req.name}${req.hint ? ` (${req.hint})` : ""}.`,
    skills: ["[stub] skill A", "[stub] skill B"],
    companies: ["[stub] Current Co", "[stub] Previous Co"],
    projects: ["[stub] Notable project"],
    socials: { x: "[stub] https://x.com/…", github: "[stub] https://github.com/…" },
    confidence,
  };
}

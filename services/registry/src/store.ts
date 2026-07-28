/**
 * In-memory catalog for the Open MCP Registry.
 *
 * Registration is keyed by slug (id). Search is a transparent keyword score
 * over name, description, tools and tags — no embedding needed for a catalog
 * this shape, and the ranking is easy to reason about. Swap for Postgres +
 * full-text search behind this interface for scale.
 */

import { toEntry, type RegisterRequest, type RegistryEntry, type RegistryHit } from "./schema.js";

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

export class RegistryStore {
  private byId = new Map<string, RegistryEntry>();

  constructor(seed: RegisterRequest[] = []) {
    for (const s of seed) this.register(s);
  }

  register(req: RegisterRequest): { entry: RegistryEntry; replaced: boolean } {
    const replaced = this.byId.has(req.id);
    const entry = toEntry(req);
    this.byId.set(req.id, entry);
    return { entry, replaced };
  }

  get(id: string): RegistryEntry | undefined {
    return this.byId.get(id);
  }

  list(): RegistryEntry[] {
    return [...this.byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  search(query: string, limit: number): RegistryHit[] {
    const terms = tokenize(query);
    const scored = this.list().map((e) => {
      // Weighted haystack: name and tools/tags matter more than description.
      const name = tokenize(e.name);
      const tags = e.tags.flatMap(tokenize).concat(tokenize(e.tools.join(" ")));
      const desc = tokenize(e.description);
      let score = 0;
      for (const t of terms) {
        if (e.id === t) score += 5;
        if (name.includes(t)) score += 3;
        if (tags.includes(t)) score += 2;
        if (desc.includes(t)) score += 1;
      }
      return {
        hit: {
          id: e.id,
          name: e.name,
          description: e.description,
          tools: e.tools,
          tags: e.tags,
          url: e.url,
          score,
        } as RegistryHit,
        score,
      };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.hit);
  }

  stats(): { servers: number; tools: number } {
    let tools = 0;
    for (const e of this.byId.values()) tools += e.tools.length;
    return { servers: this.byId.size, tools };
  }
}

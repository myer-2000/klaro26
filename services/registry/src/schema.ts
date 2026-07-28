/**
 * Schemas for the Open MCP Registry API.
 *
 * A searchable, self-hostable catalog of MCP servers so agents can discover
 * and deploy tools at runtime. Register a server; search the catalog; fetch a
 * server's install manifest.
 */

export type Transport = "stdio" | "http" | "sse";

export interface RegisterRequest {
  /** Unique slug, e.g. "github" or "acme-crm". */
  id: string;
  name: string;
  description: string;
  /** Homepage or repo URL. */
  url?: string;
  /** Named tools the server exposes. */
  tools: string[];
  /** Free-form tags for discovery. */
  tags?: string[];
  transport?: Transport;
  /** How to run it (e.g. { command: "npx", args: ["-y", "@x/mcp"] }). */
  install?: { command: string; args: string[] };
  /** Who published it. */
  publisher?: string;
  /** License identifier (SPDX), e.g. "MIT". */
  license?: string;
}

export interface RegistryEntry extends Required<Pick<RegisterRequest, "id" | "name" | "description" | "tools">> {
  url?: string;
  tags: string[];
  transport: Transport;
  install?: { command: string; args: string[] };
  publisher: string;
  license: string;
  addedAt: number;
}

export interface RegistryHit {
  id: string;
  name: string;
  description: string;
  tools: string[];
  tags: string[];
  url?: string;
  score: number;
}

export function parseRegisterRequest(
  body: unknown,
): { ok: true; value: RegisterRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  const slug = typeof b.id === "string" ? b.id.trim() : "";
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return { ok: false, message: "'id' must be a lowercase slug (a-z, 0-9, hyphens)" };
  }
  if (typeof b.name !== "string" || b.name.trim().length === 0) {
    return { ok: false, message: "'name' is required" };
  }
  if (typeof b.description !== "string" || b.description.trim().length === 0) {
    return { ok: false, message: "'description' is required" };
  }
  if (!Array.isArray(b.tools) || b.tools.length === 0 || b.tools.some((t) => typeof t !== "string")) {
    return { ok: false, message: "'tools' must be a non-empty array of strings" };
  }
  if (b.tags !== undefined && (!Array.isArray(b.tags) || b.tags.some((t) => typeof t !== "string"))) {
    return { ok: false, message: "'tags' must be an array of strings" };
  }
  const transport = (b.transport as Transport) ?? "stdio";
  if (!["stdio", "http", "sse"].includes(transport)) {
    return { ok: false, message: "'transport' must be stdio | http | sse" };
  }
  return {
    ok: true,
    value: {
      id: slug,
      name: b.name,
      description: b.description,
      url: typeof b.url === "string" ? b.url : undefined,
      tools: b.tools as string[],
      tags: (b.tags as string[]) ?? [],
      transport,
      install: (b.install as RegisterRequest["install"]) ?? undefined,
      publisher: typeof b.publisher === "string" ? b.publisher : "community",
      license: typeof b.license === "string" ? b.license : "unknown",
    },
  };
}

export function toEntry(req: RegisterRequest): RegistryEntry {
  return {
    id: req.id,
    name: req.name,
    description: req.description,
    url: req.url,
    tools: req.tools,
    tags: req.tags ?? [],
    transport: req.transport ?? "stdio",
    install: req.install,
    publisher: req.publisher ?? "community",
    license: req.license ?? "unknown",
    addedAt: Date.now(),
  };
}

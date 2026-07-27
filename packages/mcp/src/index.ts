/**
 * @klaro26/mcp — Model Context Protocol tools for Klaro26.
 *
 * Exposes each Klaro26 endpoint as an MCP tool so any MCP-compatible client
 * (Claude, Cursor, and others) can pull clean, structured data with one call.
 *
 * This module defines the tool contract and a dispatcher over the SDK. A
 * transport (stdio / HTTP) is a thin wrapper on top of `listTools` and
 * `callTool` — kept separate so the tool logic stays runtime-agnostic and
 * dependency-free.
 */

import { Klaro26 } from "@klaro26/sdk";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const tools: ToolDef[] = [
  {
    name: "video_knowledge",
    description:
      "Turn a video URL into clean structured knowledge: transcript, chapters, summary, quotes, timestamps and embeddings.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", description: "The video URL to process." },
        embeddings: {
          type: "boolean",
          description: "Include per-chunk embeddings for RAG.",
        },
      },
    },
  },
];

export interface ToolResult {
  isError: boolean;
  content: unknown;
}

export function createDispatcher(client: Klaro26) {
  return async function callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    try {
      switch (name) {
        case "video_knowledge": {
          const result = await client.video.run({
            url: String(args.url),
            embeddings: Boolean(args.embeddings),
          });
          return { isError: false, content: result };
        }
        default:
          return { isError: true, content: `Unknown tool: ${name}` };
      }
    } catch (e) {
      return { isError: true, content: e instanceof Error ? e.message : String(e) };
    }
  };
}

export function listTools(): ToolDef[] {
  return tools;
}

/**
 * Build a ready-to-use client + dispatcher from environment variables:
 *   KLARO26_API_KEY, KLARO26_BASE_URL
 */
export function fromEnv(env = process.env) {
  const client = new Klaro26({
    apiKey: env.KLARO26_API_KEY ?? "klaro26_dev_key",
    baseUrl: env.KLARO26_BASE_URL,
  });
  return { client, tools: listTools(), callTool: createDispatcher(client) };
}

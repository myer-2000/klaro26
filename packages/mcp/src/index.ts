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
  {
    name: "parse_document",
    description:
      "Parse a document (PDF, Word, Excel, PowerPoint, image, email) into one clean JSON schema: title, sections, tables, text.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL of the document to parse." },
        content: { type: "string", description: "Or raw / base64 content." },
        ocr: { type: "boolean", description: "Force OCR on scans and images." },
      },
    },
  },
  {
    name: "to_markdown",
    description:
      "Convert any source (YouTube, Reddit, GitHub, Notion, Slack export, …) into clean Markdown plus metadata.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", description: "The source URL to convert." },
        embeddings: { type: "boolean", description: "Include embeddings." },
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
        case "parse_document": {
          const result = await client.document.run({
            url: args.url ? String(args.url) : undefined,
            content: args.content ? String(args.content) : undefined,
            ocr: Boolean(args.ocr),
          });
          return { isError: false, content: result };
        }
        case "to_markdown": {
          const result = await client.markdown.run({
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

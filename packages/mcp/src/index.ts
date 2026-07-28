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
  {
    name: "understand_website",
    description:
      "Understand any website into typed JSON: pricing, products, FAQ, contact and docs.",
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: {
        url: { type: "string", description: "The website to understand." },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Restrict extraction to specific sections.",
        },
      },
    },
  },
  {
    name: "research",
    description:
      "Run a research query and get papers, patents, news, companies and a cited timeline back.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "The research question." },
        depth: {
          type: "string",
          enum: ["quick", "standard", "deep"],
          description: "Trade latency for source coverage.",
        },
      },
    },
  },
  {
    name: "company_intel",
    description:
      "Look up a company: funding, competitors, pricing, hiring, tech stack and a synthesized brief.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Company name or domain." },
        sections: {
          type: "array",
          items: { type: "string" },
          description: "Limit to specific sections.",
        },
      },
    },
  },
  {
    name: "resolve_person",
    description:
      "Resolve a person across the public web into one structured profile: bio, skills, companies, socials.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Full name to resolve." },
        hint: { type: "string", description: "A company, handle or URL to disambiguate." },
      },
    },
  },
  {
    name: "browse",
    description:
      "Give an agent a browser task in plain language; get structured results back, not screenshots.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: {
        task: { type: "string", description: "What to accomplish, in natural language." },
        return: {
          type: "string",
          enum: ["structured", "markdown", "screenshots"],
          description: "Output shape. Defaults to structured.",
        },
      },
    },
  },
  {
    name: "remember",
    description:
      "Store a fact in the agent's memory so it can be recalled later by meaning.",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string", description: "The text to remember." },
        namespace: { type: "string", description: "Partition (per-agent or per-user)." },
        metadata: { type: "object", description: "Arbitrary structured metadata." },
      },
    },
  },
  {
    name: "recall",
    description:
      "Recall the most relevant memories for a query from the agent's memory.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "What to search for." },
        namespace: { type: "string", description: "Namespace to search within." },
        k: { type: "number", description: "How many memories to return." },
      },
    },
  },
  {
    name: "index_content",
    description:
      "Index a URL or raw text into the open web index so it can be searched later by meaning.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "A URL to fetch and index." },
        text: { type: "string", description: "Or raw text to index directly." },
        title: { type: "string", description: "Optional title." },
        collection: { type: "string", description: "Collection to index into." },
      },
    },
  },
  {
    name: "search_index",
    description:
      "Search the open web index by meaning and get back ranked pages with snippets.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "What to search for." },
        collection: { type: "string", description: "Collection to search within." },
        k: { type: "number", description: "How many results to return." },
      },
    },
  },
  {
    name: "find_mcp_server",
    description:
      "Search the open MCP registry for servers/tools an agent can discover and deploy at runtime.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "What capability you need (e.g. 'database', 'git')." },
        k: { type: "number", description: "How many results to return." },
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
        case "understand_website": {
          const result = await client.extract.run({
            url: String(args.url),
            fields: Array.isArray(args.fields) ? (args.fields as string[]) : undefined,
          });
          return { isError: false, content: result };
        }
        case "research": {
          const result = await client.research.run({
            query: String(args.query),
            depth: args.depth as "quick" | "standard" | "deep" | undefined,
          });
          return { isError: false, content: result };
        }
        case "company_intel": {
          const result = await client.company.lookup({
            name: String(args.name),
            sections: Array.isArray(args.sections) ? (args.sections as string[]) : undefined,
          });
          return { isError: false, content: result };
        }
        case "resolve_person": {
          const result = await client.person.resolve({
            name: String(args.name),
            hint: args.hint ? String(args.hint) : undefined,
          });
          return { isError: false, content: result };
        }
        case "browse": {
          const result = await client.browse.run({
            task: String(args.task),
            return: args.return as "structured" | "markdown" | "screenshots" | undefined,
          });
          return { isError: false, content: result };
        }
        case "remember": {
          const result = await client.memory.remember({
            text: String(args.text),
            namespace: args.namespace ? String(args.namespace) : undefined,
            metadata:
              args.metadata && typeof args.metadata === "object"
                ? (args.metadata as Record<string, unknown>)
                : undefined,
          });
          return { isError: false, content: result };
        }
        case "recall": {
          const result = await client.memory.recall({
            query: String(args.query),
            namespace: args.namespace ? String(args.namespace) : undefined,
            k: typeof args.k === "number" ? args.k : undefined,
          });
          return { isError: false, content: result };
        }
        case "index_content": {
          const result = await client.index.add({
            url: args.url ? String(args.url) : undefined,
            text: args.text ? String(args.text) : undefined,
            title: args.title ? String(args.title) : undefined,
            collection: args.collection ? String(args.collection) : undefined,
          });
          return { isError: false, content: result };
        }
        case "search_index": {
          const result = await client.index.search({
            query: String(args.query),
            collection: args.collection ? String(args.collection) : undefined,
            k: typeof args.k === "number" ? args.k : undefined,
          });
          return { isError: false, content: result };
        }
        case "find_mcp_server": {
          const result = await client.registry.search(
            String(args.query),
            typeof args.k === "number" ? args.k : undefined,
          );
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

/**
 * @klaro26/mcp — runnable stdio MCP server.
 *
 * Launches an MCP server over stdio that exposes every Klaro26 endpoint as a
 * tool. Any MCP-compatible client (Claude, Cursor, …) can spawn it with:
 *
 *   npx -y @klaro26/mcp
 *
 * Configuration comes from the environment:
 *   KLARO26_API_KEY   (default: klaro26_dev_key)
 *   KLARO26_BASE_URL  (default: the SDK default)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fromEnv } from "./index.js";

async function main(): Promise<void> {
  const { tools, callTool } = fromEnv();

  const server = new Server(
    { name: "klaro26", version: "0.2.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const result = await callTool(name, (args ?? {}) as Record<string, unknown>);
    const text =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content, null, 2);
    return {
      content: [{ type: "text", text }],
      isError: result.isError,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr only — stdout is the MCP transport and must stay clean.
  process.stderr.write("klaro26 mcp server ready (stdio)\n");
}

main().catch((err) => {
  process.stderr.write(`klaro26 mcp server failed: ${String(err)}\n`);
  process.exit(1);
});

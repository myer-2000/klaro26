# @klaro26/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for
[Klaro26](https://github.com/myer-2000/klaro26). Give any MCP-compatible client
(Claude, Cursor, and others) the ability to pull clean, structured data — and
discover tools and memory — with a single call.

Runs as a stdio server: no setup beyond an API key.

## Configure

Add Klaro26 to your MCP client config:

```json
{
  "mcpServers": {
    "klaro26": {
      "command": "npx",
      "args": ["-y", "@klaro26/mcp"],
      "env": {
        "KLARO26_API_KEY": "klaro26_dev_key",
        "KLARO26_BASE_URL": "https://api.klaro26.dev"
      }
    }
  }
}
```

That's it — the client spawns the server over stdio and the tools appear.

## Tools

| Tool | Description |
| --- | --- |
| `video_knowledge` | Video URL → transcript, chapters, summary, quotes, embeddings |
| `parse_document` | PDF / Word / Excel / PowerPoint / image / email → one JSON schema |
| `to_markdown` | Any source (YouTube, Reddit, GitHub, Notion, …) → clean Markdown |
| `understand_website` | Any site → pricing, products, FAQ, contact, docs as typed JSON |
| `research` | A question → papers, patents, news, companies, a cited timeline |
| `company_intel` | A name → funding, competitors, pricing, hiring, tech stack, brief |
| `resolve_person` | A name → one resolved profile: bio, skills, companies, socials |
| `browse` | A task in plain language → structured results, not screenshots |
| `remember` / `recall` | Write facts and recall them by meaning (agent memory) |
| `index_content` / `search_index` | Index URLs or text and search the web by meaning |
| `find_mcp_server` | Search the open MCP registry for tools to deploy at runtime |

## Run it directly

```bash
KLARO26_API_KEY=klaro26_dev_key npx -y @klaro26/mcp
# → klaro26 mcp server ready (stdio)
```

## Programmatic use

The tool contract and dispatcher are also exported as a library:

```ts
import { fromEnv } from "@klaro26/mcp";

const { tools, callTool } = fromEnv();
const res = await callTool("understand_website", { url: "https://acme.com" });
console.log(res.content);
```

## License

[MIT](./LICENSE).

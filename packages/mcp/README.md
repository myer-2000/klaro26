# @klaro26/mcp

Model Context Protocol tools for [Klaro26](../../README.md). Give any MCP-compatible
client (Claude, Cursor, and others) the ability to pull clean, structured data with
a single tool call.

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

## Tools

| Tool | Description |
| --- | --- |
| `video_knowledge` | Video URL → transcript, chapters, summary, quotes, timestamps, embeddings |

More tools are added as endpoints ship (`document`, `markdown`, `extract`, `research`, …).

## Programmatic use

```ts
import { fromEnv } from "@klaro26/mcp";

const { tools, callTool } = fromEnv();
const res = await callTool("video_knowledge", {
  url: "https://youtube.com/watch?v=...",
});
console.log(res.content);
```

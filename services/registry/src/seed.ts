/**
 * Seed catalog — a handful of well-known, open MCP servers so the registry is
 * useful the moment it boots. These are real, widely-used servers; the install
 * commands follow each project's documented `npx` entry point. Community
 * registrations via POST /registry add to this baseline.
 */

import type { RegisterRequest } from "./schema.js";

export const SEED: RegisterRequest[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read, write and search files in allowed directories on the local machine.",
    url: "https://github.com/modelcontextprotocol/servers",
    tools: ["read_file", "write_file", "list_directory", "search_files"],
    tags: ["files", "local", "storage"],
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem"] },
    publisher: "modelcontextprotocol",
    license: "MIT",
  },
  {
    id: "git",
    name: "Git",
    description: "Inspect and operate on Git repositories: status, diff, log, commit and more.",
    url: "https://github.com/modelcontextprotocol/servers",
    tools: ["git_status", "git_diff", "git_log", "git_commit"],
    tags: ["git", "version-control", "developer"],
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@modelcontextprotocol/server-git"] },
    publisher: "modelcontextprotocol",
    license: "MIT",
  },
  {
    id: "fetch",
    name: "Fetch",
    description: "Fetch a URL and return its content as clean Markdown for the model to read.",
    url: "https://github.com/modelcontextprotocol/servers",
    tools: ["fetch"],
    tags: ["web", "http", "markdown"],
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@modelcontextprotocol/server-fetch"] },
    publisher: "modelcontextprotocol",
    license: "MIT",
  },
  {
    id: "memory",
    name: "Memory",
    description: "A knowledge-graph memory server: persist and recall entities and relations.",
    url: "https://github.com/modelcontextprotocol/servers",
    tools: ["create_entities", "add_observations", "search_nodes", "read_graph"],
    tags: ["memory", "knowledge-graph", "state"],
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@modelcontextprotocol/server-memory"] },
    publisher: "modelcontextprotocol",
    license: "MIT",
  },
  {
    id: "postgres",
    name: "Postgres",
    description: "Query a PostgreSQL database read-only and inspect its schema.",
    url: "https://github.com/modelcontextprotocol/servers",
    tools: ["query", "list_tables", "describe_table"],
    tags: ["database", "sql", "postgres"],
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres"] },
    publisher: "modelcontextprotocol",
    license: "MIT",
  },
  {
    id: "klaro26",
    name: "Klaro26",
    description: "Clean, structured data APIs for agents: browse, extract, document, markdown, video, memory and more.",
    url: "https://github.com/myer-2000/klaro26",
    tools: [
      "understand_website",
      "parse_document",
      "to_markdown",
      "video_knowledge",
      "research",
      "company_intel",
      "resolve_person",
      "browse",
      "remember",
      "recall",
    ],
    tags: ["data", "agents", "infrastructure", "open-source"],
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@klaro26/mcp"] },
    publisher: "klaro26",
    license: "MIT",
  },
];

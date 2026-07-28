import { defineConfig } from "tsup";

// Two outputs: the library (index) and the runnable stdio server (server, with
// a shebang so `npx @klaro26/mcp` works). Deps are externalized automatically.
export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node18",
  },
  {
    entry: { server: "src/server.ts" },
    format: ["esm"],
    sourcemap: true,
    clean: false,
    target: "node18",
    banner: { js: "#!/usr/bin/env node" },
  },
]);

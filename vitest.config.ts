import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/test/**/*.test.ts"],
    environment: "node",
    // Resolve the workspace path aliases the same way the monorepo tsconfig does,
    // so tests import @klaro26/* straight from source.
    alias: {
      "@klaro26/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@klaro26/sdk": new URL("./packages/sdk/src/index.ts", import.meta.url).pathname,
    },
  },
});

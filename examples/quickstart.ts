/**
 * Quickstart — TypeScript SDK.
 *
 *   1. Start the API:  KLARO26_API_KEYS=klaro26_dev_key npm run start:video
 *   2. Run this file:  npx tsx examples/quickstart.ts
 */

import { Klaro26 } from "@klaro26/sdk";

const klaro = new Klaro26({
  apiKey: process.env.KLARO26_API_KEY ?? "klaro26_dev_key",
  baseUrl: process.env.KLARO26_BASE_URL ?? "http://localhost:8080",
});

async function main() {
  const result = await klaro.video.run({
    url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    embeddings: true,
  });

  console.log("Summary:", result.summary);
  console.log("Chapters:");
  for (const chapter of result.chapters) {
    console.log(`  ${chapter.start}s  ${chapter.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

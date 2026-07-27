# @klaro26/sdk

Official TypeScript / JavaScript SDK for the [Klaro26 APIs](../../README.md).

## Install

```bash
npm install @klaro26/sdk   # once published
```

## Use

```ts
import { Klaro26 } from "@klaro26/sdk";

const klaro = new Klaro26({
  apiKey: "klaro26_dev_key",
  // baseUrl: "https://api.klaro26.dev",
});

// submit + poll until done, then get one clean schema back
const result = await klaro.video.run({
  url: "https://youtube.com/watch?v=...",
  embeddings: true,
});

console.log(result.summary);
result.chapters.forEach((c) => console.log(c.start, c.title));
```

Lower-level control:

```ts
const { id } = await klaro.video.submit({ url: "https://youtube.com/watch?v=..." });
const state = await klaro.video.get(id);
console.log(state.status); // queued | running | done | failed
```

Zero dependencies — uses the global `fetch` (Node 18+, Deno, Bun, browsers).

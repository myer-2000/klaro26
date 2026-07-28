/**
 * Dependency-free per-paragraph embeddings (hashed bag-of-words, L2-normalized)
 * so `embeddings: true` returns real, consistent vectors with no model to load.
 * Swap `embedParagraphs` for a real embedding model in production.
 */

const DIM = 256;

function hash(token: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function embedOne(text: string): number[] {
  const v = new Array<number>(DIM).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 1);
  for (const tok of tokens) {
    const idx = hash(tok) % DIM;
    v[idx] += (hash(tok + "#") & 1) === 0 ? 1 : -1;
  }
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => Number((x / norm).toFixed(6)));
}

export function embedParagraphs(markdown: string): number[][] {
  return markdown
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(embedOne);
}

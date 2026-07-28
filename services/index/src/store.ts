/**
 * In-memory, content-addressed document store for the Open Index API.
 *
 * The document id is a hash of its text, so re-indexing identical content is a
 * no-op (dedupe for free). Search is a linear cosine scan per collection —
 * fine for the scaffold; swap for Postgres + pgvector (or a search engine)
 * behind this interface for scale.
 */

import { createHash } from "node:crypto";
import { cosine, embed } from "./embed.js";
import type { IndexDoc, SearchHit } from "./schema.js";

interface Entry {
  doc: IndexDoc;
  vector: number[];
}

function contentId(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function snippet(text: string, max = 160): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export class IndexStore {
  private byCollection = new Map<string, Map<string, Entry>>();
  private byId = new Map<string, Entry>();

  index(input: {
    collection: string;
    url?: string;
    title: string;
    text: string;
  }): { doc: IndexDoc; deduped: boolean } {
    const id = contentId(input.text);
    const existing = this.byId.get(id);
    if (existing) return { doc: existing.doc, deduped: true };

    const doc: IndexDoc = {
      id,
      collection: input.collection,
      url: input.url,
      title: input.title,
      text: input.text,
      indexedAt: Date.now(),
    };
    const entry: Entry = { doc, vector: embed(`${input.title}\n${input.text}`) };
    const col = this.byCollection.get(input.collection) ?? new Map<string, Entry>();
    col.set(id, entry);
    this.byCollection.set(input.collection, col);
    this.byId.set(id, entry);
    return { doc, deduped: false };
  }

  search(query: string, collection: string, k: number): SearchHit[] {
    const col = this.byCollection.get(collection);
    if (!col) return [];
    const q = embed(query);
    return [...col.values()]
      .map((e) => ({
        id: e.doc.id,
        url: e.doc.url,
        title: e.doc.title,
        snippet: snippet(e.doc.text),
        score: Number(cosine(q, e.vector).toFixed(4)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  get(id: string): IndexDoc | undefined {
    return this.byId.get(id)?.doc;
  }

  stats(): { collections: number; documents: number } {
    return { collections: this.byCollection.size, documents: this.byId.size };
  }
}

/**
 * In-memory vector store for the Agent Memory API.
 *
 * Keeps records + their embeddings per namespace and does a linear cosine
 * scan on recall. Fine for the scaffold and small deployments; swap for
 * Postgres + pgvector (or any vector DB) behind this same interface for scale.
 */

import { randomUUID } from "node:crypto";
import { cosine, embed } from "./embed.js";
import type { MemoryRecord, RecallMatch } from "./schema.js";

interface Entry {
  record: MemoryRecord;
  vector: number[];
}

export class MemoryStore {
  private byNamespace = new Map<string, Entry[]>();
  private byId = new Map<string, Entry>();

  remember(input: {
    text: string;
    namespace: string;
    metadata: Record<string, unknown>;
  }): MemoryRecord {
    const record: MemoryRecord = {
      id: randomUUID(),
      namespace: input.namespace,
      text: input.text,
      metadata: input.metadata,
      createdAt: Date.now(),
    };
    const entry: Entry = { record, vector: embed(input.text) };
    const list = this.byNamespace.get(input.namespace) ?? [];
    list.push(entry);
    this.byNamespace.set(input.namespace, list);
    this.byId.set(record.id, entry);
    return record;
  }

  recall(query: string, namespace: string, k: number): RecallMatch[] {
    const list = this.byNamespace.get(namespace) ?? [];
    const q = embed(query);
    return list
      .map((e) => ({
        id: e.record.id,
        text: e.record.text,
        metadata: e.record.metadata,
        score: Number(cosine(q, e.vector).toFixed(4)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  get(id: string): MemoryRecord | undefined {
    return this.byId.get(id)?.record;
  }

  forget(id: string): boolean {
    const entry = this.byId.get(id);
    if (!entry) return false;
    this.byId.delete(id);
    const list = this.byNamespace.get(entry.record.namespace);
    if (list) {
      this.byNamespace.set(
        entry.record.namespace,
        list.filter((e) => e.record.id !== id),
      );
    }
    return true;
  }

  stats(): { namespaces: number; memories: number } {
    return { namespaces: this.byNamespace.size, memories: this.byId.size };
  }
}

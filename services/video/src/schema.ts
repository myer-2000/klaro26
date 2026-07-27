/**
 * The canonical output schema for the Video Knowledge API.
 * One predictable shape regardless of the source video.
 */

export interface VideoRequest {
  url: string;
  embeddings?: boolean;
}

export interface TranscriptSegment {
  /** start time in seconds */
  t: number;
  text: string;
}

export interface Chapter {
  start: number;
  title: string;
}

export interface VideoKnowledge {
  url: string;
  durationSec: number;
  language: string;
  transcript: TranscriptSegment[];
  chapters: Chapter[];
  summary: string;
  quotes: string[];
  entities: string[];
  /** present only when embeddings=true was requested */
  embeddings?: number[][];
}

/** Hand-rolled validation — zero dependencies. */
export function parseVideoRequest(
  body: unknown,
): { ok: true; value: VideoRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.url !== "string" || b.url.length === 0) {
    return { ok: false, message: "'url' is required and must be a string" };
  }
  try {
    // eslint-disable-next-line no-new
    new URL(b.url);
  } catch {
    return { ok: false, message: "'url' must be a valid URL" };
  }
  const embeddings = b.embeddings === undefined ? false : Boolean(b.embeddings);
  return { ok: true, value: { url: b.url, embeddings } };
}

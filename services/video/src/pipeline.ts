/**
 * The Video Knowledge pipeline:
 *
 *   URL → download audio → transcribe → align → summarise → embed → JSON
 *
 * Each stage below is a clearly marked seam. The scaffold ships with
 * deterministic stubs so the service runs end-to-end with no models or
 * binaries installed. Wire the real implementations behind the same
 * function signatures and the rest of the service is unchanged.
 */

import type {
  Chapter,
  TranscriptSegment,
  VideoKnowledge,
  VideoRequest,
} from "./schema.js";

/* 1) Download audio ------------------------------------------------- *
 * Prod: yt-dlp / a licensed provider → ffmpeg to 16kHz mono wav.
 * Respect each source's Terms of Service before enabling downloads. */
async function downloadAudio(url: string): Promise<{ path: string; durationSec: number }> {
  // TODO: spawn yt-dlp + ffmpeg; return a temp wav path.
  return { path: `/tmp/${encodeURIComponent(url)}.wav`, durationSec: 600 };
}

/* 2) Transcribe ----------------------------------------------------- *
 * Prod: faster-whisper (local GPU) or Deepgram / OpenAI transcription. */
async function transcribe(_audioPath: string): Promise<{
  language: string;
  segments: TranscriptSegment[];
}> {
  // TODO: call Whisper; return word/segment timestamps.
  return {
    language: "en",
    segments: [
      { t: 0, text: "[stub] Intro and overview of the topic." },
      { t: 45, text: "[stub] Main argument with a concrete example." },
      { t: 210, text: "[stub] Counterpoints and caveats." },
      { t: 500, text: "[stub] Summary and closing thoughts." },
    ],
  };
}

/* 3) Chapterise ----------------------------------------------------- *
 * Prod: LLM over the timestamped transcript to segment into chapters. */
async function chapterise(segments: TranscriptSegment[]): Promise<Chapter[]> {
  // TODO: LLM call. Stub: one chapter per segment boundary.
  return segments.map((s, i) => ({
    start: s.t,
    title: i === 0 ? "Introduction" : `Section ${i + 1}`,
  }));
}

/* 4) Summarise + extract ------------------------------------------- *
 * Prod: LLM for a summary, key quotes and named entities. */
async function summarise(segments: TranscriptSegment[]): Promise<{
  summary: string;
  quotes: string[];
  entities: string[];
}> {
  // TODO: LLM call over the full transcript.
  const joined = segments.map((s) => s.text).join(" ");
  return {
    summary: `[stub] ${joined.slice(0, 160)}`,
    quotes: ["[stub] A representative key quote from the video."],
    entities: ["[stub-entity]"],
  };
}

/* 5) Embed ---------------------------------------------------------- *
 * Prod: an embedding model per chunk, stored in pgvector for RAG. */
async function embed(segments: TranscriptSegment[]): Promise<number[][]> {
  // TODO: real embeddings. Stub: tiny deterministic vectors.
  return segments.map((s, i) => [i, s.t, s.text.length]);
}

export async function processVideo(req: VideoRequest): Promise<VideoKnowledge> {
  const { path, durationSec } = await downloadAudio(req.url);
  const { language, segments } = await transcribe(path);
  const [chapters, extracted] = await Promise.all([
    chapterise(segments),
    summarise(segments),
  ]);

  const result: VideoKnowledge = {
    url: req.url,
    durationSec,
    language,
    transcript: segments,
    chapters,
    summary: extracted.summary,
    quotes: extracted.quotes,
    entities: extracted.entities,
  };

  if (req.embeddings) result.embeddings = await embed(segments);
  return result;
}

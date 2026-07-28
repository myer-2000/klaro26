/**
 * The Video Knowledge pipeline:
 *
 *   URL → parse source (real) → download → transcribe → summarise → JSON
 *
 * Source parsing is real and deterministic: provider, video id, canonical
 * thumbnail and embed URLs come straight from the URL, no network needed.
 * Transcription/chaptering/summarising are the seam — they require an ASR or
 * caption provider (Whisper, Deepgram, the platform's caption API). Wire those
 * behind `transcribe()` and the rest of the service is unchanged.
 */

import type {
  Chapter,
  TranscriptSegment,
  VideoKnowledge,
  VideoRequest,
  VideoSource,
} from "./schema.js";

/* 1) Parse source — REAL, deterministic --------------------------------- */
export function parseVideoSource(raw: string): VideoSource {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { provider: "unknown", videoId: null, thumbnail: null, embedUrl: null };
  }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] || null;
    else if (u.searchParams.get("v")) id = u.searchParams.get("v");
    else {
      const m = /\/(?:embed|shorts|live|v)\/([^/?]+)/.exec(u.pathname);
      if (m) id = m[1];
    }
    return id
      ? {
          provider: "youtube",
          videoId: id,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${id}`,
        }
      : { provider: "youtube", videoId: null, thumbnail: null, embedUrl: null };
  }

  if (host.endsWith("vimeo.com")) {
    const m = /\/(\d+)/.exec(u.pathname);
    const id = m ? m[1] : null;
    return {
      provider: "vimeo",
      videoId: id,
      thumbnail: null,
      embedUrl: id ? `https://player.vimeo.com/video/${id}` : null,
    };
  }

  return { provider: host || "unknown", videoId: null, thumbnail: null, embedUrl: null };
}

/* 2) Transcribe — SEAM (needs ASR / caption provider) ------------------- */
async function transcribe(_url: string): Promise<{
  language: string;
  durationSec: number;
  segments: TranscriptSegment[];
}> {
  // TODO: yt-dlp/ffmpeg → Whisper/Deepgram, or the platform caption API.
  return { language: "unknown", durationSec: 0, segments: [] };
}

/* 3) Chapterise / 4) Summarise — SEAM (need the transcript + an LLM) ----- */
async function chapterise(segments: TranscriptSegment[]): Promise<Chapter[]> {
  return segments.length ? segments.map((s, i) => ({ start: s.t, title: `Section ${i + 1}` })) : [];
}

export async function processVideo(req: VideoRequest): Promise<VideoKnowledge> {
  const source = parseVideoSource(req.url);
  const { language, durationSec, segments } = await transcribe(req.url);
  const chapters = await chapterise(segments);

  const recognized = source.videoId
    ? `Recognized ${source.provider} video ${source.videoId}. Transcript, chapters and summary require an ASR or caption provider (wire it behind transcribe()).`
    : `Could not recognize a video id from the URL. Source parsed as provider "${source.provider}".`;

  const result: VideoKnowledge = {
    url: req.url,
    source,
    durationSec,
    language,
    transcript: segments,
    chapters,
    summary: recognized,
    quotes: [],
    entities: [],
  };

  if (req.embeddings) result.embeddings = [];
  return result;
}

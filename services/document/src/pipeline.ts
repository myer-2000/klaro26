/**
 * The Universal Document pipeline:
 *
 *   source → detect type → parse → normalize → JSON
 *
 * Text-based formats are parsed for real: HTML (via @klaro26/html), Markdown,
 * plain text, CSV/TSV and JSON all produce genuine title / sections / tables /
 * text. Binary formats (PDF, Word, Excel, PowerPoint, images) remain the one
 * seam — drop in `pdf-parse` / `mammoth` / `xlsx` / OCR behind `parseBinary`
 * and the rest of the service is unchanged.
 */

import { extractImages, extractMetadata, extractTables, extractText, htmlToMarkdown } from "@klaro26/html";
import type { Document, DocumentRequest, Section, Table } from "./schema.js";

const BINARY = new Set(["pdf", "docx", "xlsx", "pptx", "image"]);

function detectType(req: DocumentRequest): string {
  if (req.type && req.type !== "auto") return req.type;
  if (req.url) {
    const ext = req.url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
    if (["pdf", "docx", "xlsx", "pptx", "csv", "tsv", "json", "md", "html", "htm", "txt"].includes(ext)) {
      return ext === "htm" ? "html" : ext === "md" ? "markdown" : ext;
    }
  }
  const c = (req.content ?? "").trimStart();
  if (c.startsWith("<")) return "html";
  if (c.startsWith("{") || c.startsWith("[")) return "json";
  if (/^[^\n,]+(,[^\n]*)+\r?\n/.test(c)) return "csv";
  if (/^#{1,6}\s|\n#{1,6}\s/.test(c)) return "markdown";
  return "text";
}

/** Split Markdown into sections keyed by its headings. */
function sectionsFromMarkdown(md: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (current) {
      current.text = buf.join("\n").trim();
      sections.push(current);
    }
    buf = [];
  };
  for (const line of md.split("\n")) {
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      current = { heading: h[2].trim(), text: "" };
    } else {
      if (!current) current = { heading: "", text: "" };
      buf.push(line);
    }
  }
  flush();
  return sections.filter((s) => s.heading || s.text);
}

function firstHeading(md: string): string | undefined {
  return /^#{1,6}\s+(.*)$/m.exec(md)?.[1]?.trim();
}

function parseDelimited(text: string, delim: string): Table {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(delim).map((c) => c.trim()));
  return { rows };
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": "klaro26-document/1.0 (+https://klaro26.dev)" } });
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  return res.text();
}

/** Seam: binary formats need real parsers/OCR. */
function parseBinary(type: string): Document {
  return {
    title: `[stub] ${type.toUpperCase()} document`,
    type,
    sections: [{ heading: "Note", text: `Wire a real ${type} parser behind parseBinary() to extract this.` }],
    tables: [],
    images: [],
    text: `[stub] ${type} parsing not wired in this build.`,
  };
}

export async function processDocument(req: DocumentRequest): Promise<Document> {
  const type = detectType(req);
  if (BINARY.has(type)) return parseBinary(type);

  const body = req.content ?? (req.url ? await fetchText(req.url) : "");

  if (type === "html") {
    const md = htmlToMarkdown(body);
    const meta = extractMetadata(body);
    return {
      title: meta.title ?? firstHeading(md) ?? "Untitled",
      type,
      sections: sectionsFromMarkdown(md),
      tables: extractTables(body),
      images: extractImages(body),
      text: extractText(body),
    };
  }

  if (type === "csv" || type === "tsv") {
    const table = parseDelimited(body, type === "tsv" ? "\t" : ",");
    return {
      title: "Untitled",
      type,
      sections: [],
      tables: [table],
      images: [],
      text: body.trim(),
    };
  }

  if (type === "json") {
    let pretty = body.trim();
    try {
      pretty = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      /* leave as-is */
    }
    return {
      title: "Untitled",
      type,
      sections: [{ heading: "JSON", text: pretty }],
      tables: [],
      images: [],
      text: pretty,
    };
  }

  // markdown / text
  const md = body;
  const plain = md.replace(/^#{1,6}\s+/gm, "").trim();
  return {
    title: firstHeading(md) ?? plain.split("\n")[0]?.slice(0, 120) ?? "Untitled",
    type: type === "markdown" ? "markdown" : "text",
    sections: sectionsFromMarkdown(md),
    tables: [],
    images: [],
    text: plain,
  };
}

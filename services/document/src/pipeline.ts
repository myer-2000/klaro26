/**
 * The Universal Document pipeline:
 *
 *   source → detect type → parse → (OCR) → normalize → JSON
 *
 * Deterministic stubs ship so the service runs with nothing installed. Wire the
 * real parsers behind these seams and the rest of the service is unchanged.
 */

import type { Document, DocumentRequest, Section, Table } from "./schema.js";

/* 1) Detect type ---------------------------------------------------- *
 * Prod: sniff magic bytes / content-type / extension. */
function detectType(req: DocumentRequest): string {
  if (req.type && req.type !== "auto") return req.type;
  if (req.url) {
    const ext = req.url.split(".").pop()?.toLowerCase() ?? "";
    if (["pdf", "docx", "xlsx", "pptx"].includes(ext)) return ext;
  }
  return "unknown";
}

/* 2) Parse ---------------------------------------------------------- *
 * Prod: pdf/docx/xlsx/pptx parsers (unstructured, docling, etc.). */
async function parse(_req: DocumentRequest, type: string): Promise<{
  title: string;
  sections: Section[];
  tables: Table[];
  images: string[];
  text: string;
}> {
  // TODO: real parsing per type.
  return {
    title: "[stub] Document title",
    sections: [
      { heading: "Summary", text: "[stub] Extracted summary section." },
      { heading: "Details", text: "[stub] Extracted body text." },
    ],
    tables: [{ rows: [["Col A", "Col B"], ["1", "2"]] }],
    images: [],
    text: `[stub] Full extracted text for a ${type} document.`,
  };
}

export async function processDocument(req: DocumentRequest): Promise<Document> {
  const type = detectType(req);
  const parsed = await parse(req, type);
  return {
    title: parsed.title,
    type,
    sections: parsed.sections,
    tables: parsed.tables,
    images: parsed.images,
    text: parsed.text,
  };
}

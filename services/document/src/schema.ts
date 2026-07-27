/**
 * Canonical output schema for the Universal Document API.
 * Any format in (PDF, Word, Excel, PowerPoint, images, email) — one shape out.
 */

export interface DocumentRequest {
  /** A URL to fetch the document from. */
  url?: string;
  /** Or raw text / base64 content, with an explicit type. */
  content?: string;
  /** Hint the source type; inferred when omitted. */
  type?: "pdf" | "docx" | "xlsx" | "pptx" | "image" | "email" | "auto";
  /** Force OCR on scanned or image-only files. */
  ocr?: boolean;
}

export interface Section {
  heading: string;
  text: string;
}
export interface Table {
  rows: string[][];
}

export interface Document {
  title: string;
  type: string;
  sections: Section[];
  tables: Table[];
  images: string[];
  text: string;
}

export function parseDocumentRequest(
  body: unknown,
): { ok: true; value: DocumentRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  const hasUrl = typeof b.url === "string" && b.url.length > 0;
  const hasContent = typeof b.content === "string" && b.content.length > 0;
  if (!hasUrl && !hasContent) {
    return { ok: false, message: "Provide either 'url' or 'content'" };
  }
  if (hasUrl) {
    try {
      new URL(b.url as string);
    } catch {
      return { ok: false, message: "'url' must be a valid URL" };
    }
  }
  return {
    ok: true,
    value: {
      url: hasUrl ? (b.url as string) : undefined,
      content: hasContent ? (b.content as string) : undefined,
      type: (b.type as DocumentRequest["type"]) ?? "auto",
      ocr: Boolean(b.ocr),
    },
  };
}

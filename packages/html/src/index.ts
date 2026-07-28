/**
 * @klaro26/html — a real, dependency-free HTML toolkit shared by services that
 * turn web pages into clean, structured data.
 *
 *   - htmlToMarkdown / extractMetadata / decodeEntities  (the /markdown engine)
 *   - extractLinks / extractHeadings / extractText       (structure)
 *   - detectContact / detectPricing / detectFaq / detectDocs  (understanding)
 *
 * Deliberately pragmatic, not a full DOM: it handles what matters for reading
 * an article or understanding a page, runs everywhere, and is fully
 * deterministic — so every extractor is unit-testable. Swap in a full
 * readability/DOM pass for exotic pages without changing callers.
 */

/* ------------------------------------------------------------------ *
 * Entities
 * ------------------------------------------------------------------ */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code: string) => {
    if (code[0] === "#") {
      const num =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : m;
    }
    return NAMED_ENTITIES[code] ?? m;
  });
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).trim();
}

function collapseInline(text: string): string {
  return text.replace(/[ \t\f\v]+/g, " ").replace(/ *\n */g, "\n");
}

/* ------------------------------------------------------------------ *
 * Metadata
 * ------------------------------------------------------------------ */

export interface PageMetadata {
  title?: string;
  author?: string;
  description?: string;
  [key: string]: unknown;
}

function metaContent(html: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return undefined;
}

export function extractMetadata(html: string): PageMetadata {
  const title =
    metaContent(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
    ]) ??
    (() => {
      const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
      return m ? decodeEntities(m[1]).trim() : undefined;
    })();

  const author = metaContent(html, [
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i,
  ]);

  const description = metaContent(html, [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  ]);

  const meta: PageMetadata = {};
  if (title) meta.title = title;
  if (author) meta.author = author;
  if (description) meta.description = description;
  return meta;
}

/* ------------------------------------------------------------------ *
 * HTML → Markdown
 * ------------------------------------------------------------------ */

function convertInline(html: string): string {
  let s = html;
  s = s.replace(/<img[^>]*?alt=["']([^"']*)["'][^>]*?src=["']([^"']+)["'][^>]*>/gi, "![$1]($2)");
  s = s.replace(/<img[^>]*?src=["']([^"']+)["'][^>]*?alt=["']([^"']*)["'][^>]*>/gi, "![$2]($1)");
  s = s.replace(/<img[^>]*?src=["']([^"']+)["'][^>]*>/gi, "![]($1)");
  s = s.replace(/<a[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
    const label = stripTags(text) || href;
    return `[${label}](${href})`;
  });
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner) => `**${stripTags(inner)}**`);
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner) => `*${stripTags(inner)}*`);
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner) => `\`${stripTags(inner)}\``);
  s = s.replace(/<br\s*\/?>/gi, "\n");
  return s;
}

function convertList(block: string, ordered: boolean): string {
  const items = [...block.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) =>
    collapseInline(stripTags(convertInline(m[1]))).replace(/\n/g, " ").trim(),
  );
  return items
    .filter(Boolean)
    .map((item, i) => (ordered ? `${i + 1}. ${item}` : `- ${item}`))
    .join("\n");
}

/** Remove non-content regions and narrow to the main article when present. */
export function mainContent(html: string): string {
  let s = html.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style|noscript|svg|head|nav|footer|header|form|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const main = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(s) || /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(s);
  if (main) return main[1];
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(s);
  return body ? body[1] : s;
}

export function htmlToMarkdown(html: string): string {
  let s = mainContent(html);

  const codeBlocks: string[] = [];
  s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner) => {
    const code = decodeEntities(inner.replace(/<[^>]+>/g, "")).replace(/\n+$/, "");
    codeBlocks.push(code);
    return ` CODE${codeBlocks.length - 1} `;
  });

  s = s.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) => `\n\n${convertList(inner, false)}\n\n`);
  s = s.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => `\n\n${convertList(inner, true)}\n\n`);
  s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => {
    const text = collapseInline(stripTags(convertInline(inner))).trim();
    return `\n\n${text.split("\n").map((l) => `> ${l}`).join("\n")}\n\n`;
  });
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, inner) => {
    return `\n\n${"#".repeat(Number(level))} ${stripTags(convertInline(inner))}\n\n`;
  });
  s = s.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_m, inner) => `\n\n${stripTags(convertInline(inner))}\n\n`);

  s = convertInline(s);
  s = decodeEntities(s.replace(/<[^>]+>/g, " "));
  s = s.replace(/ CODE(\d+) /g, (_m, i) => `\n\n\`\`\`\n${codeBlocks[Number(i)]}\n\`\`\`\n\n`);

  s = collapseInline(s);
  return s.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

/** Plain text of the main content (no Markdown syntax). Tags become spaces so
 *  adjacent blocks don't run together, then space-before-punctuation is tidied. */
export function extractText(html: string): string {
  const spaced = mainContent(html).replace(/<[^>]+>/g, " ");
  return collapseInline(decodeEntities(spaced))
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ *
 * Structure
 * ------------------------------------------------------------------ */

export interface Heading {
  level: number;
  text: string;
}

export function extractHeadings(html: string): Heading[] {
  return [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({
    level: Number(m[1]),
    text: stripTags(m[2]),
  }));
}

export interface Link {
  href: string;
  text: string;
}

export function extractLinks(html: string, baseUrl?: string): Link[] {
  const seen = new Set<string>();
  const out: Link[] = [];
  for (const m of html.matchAll(/<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href = m[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    if (baseUrl) {
      try {
        href = new URL(href, baseUrl).toString();
      } catch {
        /* keep as-is */
      }
    }
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ href, text: stripTags(m[2]) });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Understanding
 * ------------------------------------------------------------------ */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;

export interface Contact {
  email?: string;
  phone?: string;
}

export function detectContact(html: string): Contact {
  const contact: Contact = {};
  const mailto = /href=["']mailto:([^"'?]+)/i.exec(html);
  const text = stripTags(html);
  const email = mailto?.[1] ?? text.match(EMAIL_RE)?.[0];
  if (email) contact.email = email.toLowerCase();
  const tel = /href=["']tel:([^"']+)/i.exec(html);
  const phone = tel?.[1] ?? text.match(PHONE_RE)?.[0];
  if (phone) contact.phone = phone.trim();
  return contact;
}

export interface PricePoint {
  amount: number;
  currency: string;
  period?: string;
  /** Plan name inferred from the words immediately before the price, if any. */
  plan?: string;
}

const CURRENCY: Record<string, string> = { $: "USD", "£": "GBP", "€": "EUR" };

const PLAN_STOPWORDS = new Set([
  "From", "Only", "Just", "The", "Per", "And", "Or", "Plus", "Save", "Get",
  "Up", "At", "For", "Starts", "Starting", "Now", "Was",
]);

/** Infer a plan name from the last capitalized word before a price, e.g. "Pro". */
function planBefore(text: string, idx: number): string | undefined {
  const before = text.slice(Math.max(0, idx - 40), idx);
  const words = before.match(/[A-Z][A-Za-z0-9+]{1,}/g);
  if (!words) return undefined;
  const last = words[words.length - 1];
  return PLAN_STOPWORDS.has(last) ? undefined : last;
}

export function detectPricing(html: string): PricePoint[] {
  const text = extractText(html);
  const out: PricePoint[] = [];
  const seen = new Set<string>();
  const re = /([$£€])\s?(\d[\d,]*(?:\.\d+)?)\s*(\/\s*(?:mo|month|yr|year|user|seat))?/gi;
  for (const m of text.matchAll(re)) {
    const amount = Number(m[2].replace(/,/g, ""));
    if (!Number.isFinite(amount)) continue;
    const key = `${m[1]}${amount}${m[3] ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const idx = m.index ?? 0;
    const point: PricePoint = { amount, currency: CURRENCY[m[1]] ?? m[1] };
    const plan = planBefore(text, idx);
    if (plan) point.plan = plan;
    if (m[3]) point.period = m[3].replace(/\s|\//g, "");
    out.push(point);
  }
  return out;
}

export interface QA {
  q: string;
  a: string;
}

export function detectFaq(html: string): QA[] {
  const out: QA[] = [];
  // 1) <details><summary>Q</summary>A</details>
  for (const m of html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)) {
    const block = m[1];
    const sum = /<summary\b[^>]*>([\s\S]*?)<\/summary>/i.exec(block);
    if (!sum) continue;
    const q = stripTags(sum[1]);
    const a = stripTags(block.replace(sum[0], "")).trim();
    if (q) out.push({ q, a });
  }
  // 2) Question-like headings immediately followed by a paragraph. The
  //    question text must be tag-free (no nested blocks) and the heading level
  //    is back-referenced, so a match can't span across other sections.
  for (const m of html.matchAll(/<h([2-6])\b[^>]*>\s*([^<]*\?)\s*<\/h\1>\s*<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const q = decodeEntities(m[2]).trim();
    if (q) out.push({ q, a: stripTags(m[3]) });
  }
  // De-dupe by question.
  const seen = new Set<string>();
  return out.filter((qa) => (seen.has(qa.q) ? false : (seen.add(qa.q), true)));
}

const DOC_HINT = /\b(docs?|documentation|guide|api|reference|developers?|manual)\b/i;

export function detectDocs(links: Link[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const l of links) {
    if (DOC_HINT.test(l.text) || DOC_HINT.test(l.href)) {
      if (!seen.has(l.href)) {
        seen.add(l.href);
        out.push(l.href);
      }
    }
  }
  return out;
}

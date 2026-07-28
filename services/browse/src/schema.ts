/**
 * Canonical output schema for the Browser API.
 * A task in — structured results (not screenshots) out.
 */

export type ReturnKind = "structured" | "markdown" | "screenshots";

export interface BrowseRequest {
  /** What to accomplish, in natural language. */
  task: string;
  /** structured | markdown | screenshots. Defaults to structured. */
  return?: ReturnKind;
  /** Max seconds before the run is abandoned. */
  timeout?: number;
}

export interface BrowseResult {
  task: string;
  return: ReturnKind;
  /** The structured result matching the task (shape depends on the task). */
  result: unknown;
  /** Ordered steps the agent took. */
  steps: string[];
  /** Source URLs backing the result. */
  sources: string[];
  /** Present when return === "screenshots". */
  screenshots?: string[];
}

const RETURNS: ReturnKind[] = ["structured", "markdown", "screenshots"];

export function parseBrowseRequest(
  body: unknown,
): { ok: true; value: BrowseRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.task !== "string" || b.task.trim().length === 0) {
    return { ok: false, message: "'task' is required" };
  }
  let ret: ReturnKind = "structured";
  if (b.return !== undefined) {
    if (typeof b.return !== "string" || !RETURNS.includes(b.return as ReturnKind)) {
      return { ok: false, message: "'return' must be structured | markdown | screenshots" };
    }
    ret = b.return as ReturnKind;
  }
  let timeout: number | undefined;
  if (b.timeout !== undefined) {
    if (typeof b.timeout !== "number" || b.timeout <= 0) {
      return { ok: false, message: "'timeout' must be a positive number of seconds" };
    }
    timeout = b.timeout;
  }
  return { ok: true, value: { task: b.task, return: ret, timeout } };
}

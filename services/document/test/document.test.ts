import { describe, expect, it } from "vitest";
import { processDocument } from "../src/pipeline.js";

describe("processDocument (real, content-based)", () => {
  it("parses HTML into title, sections, tables and images", async () => {
    const html = `<html><head><title>Q3 Report</title></head><body><article>
      <h1>Summary</h1><p>Revenue grew.</p>
      <h2>Details</h2><p>By region.</p>
      <table><tr><th>Region</th><th>Rev</th></tr><tr><td>US</td><td>10</td></tr></table>
      <img src="/chart.png" alt="chart">
    </article></body></html>`;
    const out = await processDocument({ url: "https://x.com/r.html", content: html });
    expect(out.type).toBe("html");
    expect(out.title).toBe("Q3 Report");
    expect(out.sections.map((s) => s.heading)).toEqual(["Summary", "Details"]);
    expect(out.tables[0].rows).toEqual([["Region", "Rev"], ["US", "10"]]);
    expect(out.images).toEqual(["/chart.png"]);
    expect(out.text).toContain("Revenue grew.");
  });

  it("parses Markdown into heading-keyed sections", async () => {
    const md = "# Title\n\nIntro line.\n\n## Part A\n\nBody A.\n\n## Part B\n\nBody B.";
    const out = await processDocument({ url: "x", content: md, type: "auto" });
    expect(out.type).toBe("markdown");
    expect(out.title).toBe("Title");
    expect(out.sections.map((s) => s.heading)).toEqual(["Title", "Part A", "Part B"]);
    expect(out.sections[1].text).toBe("Body A.");
  });

  it("parses CSV into a table", async () => {
    const csv = "name,role\nAda,eng\nGrace,sci";
    const out = await processDocument({ url: "x", content: csv });
    expect(out.type).toBe("csv");
    expect(out.tables[0].rows).toEqual([["name", "role"], ["Ada", "eng"], ["Grace", "sci"]]);
  });

  it("pretty-prints JSON", async () => {
    const out = await processDocument({ url: "x", content: '{"a":1,"b":[2,3]}' });
    expect(out.type).toBe("json");
    expect(out.text).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });

  it("keeps binary formats behind the seam", async () => {
    const out = await processDocument({ url: "x", content: "ignored", type: "pdf" });
    expect(out.type).toBe("pdf");
    expect(out.text).toContain("[stub]");
  });
});

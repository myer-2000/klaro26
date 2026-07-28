import { describe, expect, it } from "vitest";
import { processExtract } from "../src/pipeline.js";

const PAGE = `<html>
<head>
  <title>Acme</title>
  <meta name="description" content="Acme builds developer tools.">
</head>
<body>
  <nav><a href="/login">Login</a></nav>
  <main>
    <h1>Acme</h1>
    <h2>Pricing</h2>
    <p>Pro is $49/mo. Teams is $99/mo.</p>
    <h2>FAQ</h2>
    <details><summary>Is there a free tier?</summary>Yes, forever free.</details>
    <h2>Products</h2>
    <ul><li>Widget</li><li>Gadget</li></ul>
    <a href="mailto:hi@acme.com">Contact us</a>
    <a href="/docs">Documentation</a>
  </main>
  <footer>copyright</footer>
</body>
</html>`;

describe("processExtract (real, offline)", () => {
  it("understands a page into typed sections", async () => {
    const out = await processExtract({ url: "https://acme.com", html: PAGE });
    expect(out.title).toBe("Acme");
    expect(out.summary).toBe("Acme builds developer tools.");
    expect(out.pricing.map((p) => p.price)).toEqual([49, 99]);
    expect(out.pricing[0].period).toBe("mo");
    expect(out.faq).toEqual([{ q: "Is there a free tier?", a: "Yes, forever free." }]);
    expect(out.products.map((p) => p.name)).toEqual(["Widget", "Gadget"]);
    expect(out.contact.email).toBe("hi@acme.com");
    expect(out.docs).toEqual(["https://acme.com/docs"]);
  });

  it("respects the fields filter", async () => {
    const out = await processExtract({ url: "https://acme.com", html: PAGE, fields: ["pricing"] });
    expect(out.pricing.length).toBe(2);
    expect(out.faq).toEqual([]);
    expect(out.contact).toEqual({});
    expect(out.docs).toEqual([]);
  });
});

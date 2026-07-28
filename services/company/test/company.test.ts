import { describe, expect, it } from "vitest";
import { companyFromHtml, deriveDomain } from "../src/pipeline.js";

describe("deriveDomain", () => {
  it("keeps a domain-like name", () => {
    expect(deriveDomain("acme.io")).toBe("acme.io");
    expect(deriveDomain("https://acme.io/about")).toBe("acme.io");
  });
  it("slugs a plain name to .com", () => {
    expect(deriveDomain("Acme Cloud")).toBe("acmecloud.com");
  });
});

describe("companyFromHtml (real extraction)", () => {
  const html = `<html><head>
    <title>Acme</title>
    <meta name="description" content="Acme builds developer tools.">
    <script src="https://js.stripe.com/v3"></script>
    <script src="/_next/static/x.js"></script>
  </head><body>
    <h2>Pricing</h2><p>Starter $19/mo, Pro $49/mo.</p>
  </body></html>`;

  it("pulls summary, pricing, products and tech stack", () => {
    const c = companyFromHtml("Acme", "acme.com", html);
    expect(c.summary).toBe("Acme builds developer tools.");
    expect(c.pricing).toEqual([
      { plan: "Starter", price: "$19/mo" },
      { plan: "Pro", price: "$49/mo" },
    ]);
    expect(c.products).toEqual(["Starter", "Pro"]);
    expect(c.techStack).toEqual(expect.arrayContaining(["Stripe", "Next.js"]));
  });

  it("leaves funding/competitors/hiring empty (need external data)", () => {
    const c = companyFromHtml("Acme", "acme.com", html);
    expect(c.funding).toEqual([]);
    expect(c.competitors).toEqual([]);
    expect(c.hiring).toEqual([]);
  });
});

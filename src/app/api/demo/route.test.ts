import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/demo", () => {
  it("returns a visibly labelled fixture analysis", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store",
    );

    expect(body.analysis.metadata).toMatchObject({
      mode: "demo",
      provider: "fixture",
    });

    expect(body.analysis.decision.action).toBe(
      "block_until_addressed",
    );
  });
});
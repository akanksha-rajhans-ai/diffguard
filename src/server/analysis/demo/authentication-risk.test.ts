import { describe, expect, it } from "vitest";

import { createAuthenticationRiskDemo } from "./authentication-risk";

describe("createAuthenticationRiskDemo", () => {
  it("produces a clearly labelled blocked demo analysis", () => {
    const analysis = createAuthenticationRiskDemo();

    expect(analysis.metadata).toMatchObject({
      mode: "demo",
      provider: "fixture",
    });

    expect(analysis.signals).toMatchObject({
      primaryChangeArea: {
        value: "authentication",
      },
      securitySensitive: {
        value: "yes",
      },
      testAssessment: {
        value: "missing",
      },
    });

    expect(analysis.decision).toMatchObject({
      action: "block_until_addressed",
      riskScore: 75,
    });
  });
});
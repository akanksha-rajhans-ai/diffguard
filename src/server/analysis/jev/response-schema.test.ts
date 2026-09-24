import { describe, expect, it } from "vitest";

import { jevSystemOneResponseSchema } from "./response-schema";

function choice(
  selected: string,
  probabilities: Record<string, number>,
) {
  return {
    type: "choice" as const,
    choice: selected,
    confidence: 0.9,
    probabilities,
  };
}

function validResponse() {
  return {
    model: "jev-2026-09-15",
    answers: {
      overallRisk: choice("high", {
        low: 0.02,
        medium: 0.13,
        high: 0.75,
        critical: 0.1,
      }),

      primaryChangeArea: choice("authentication", {
        ui: 0.01,
        api: 0.03,
        authentication: 0.88,
        database: 0.01,
        infrastructure: 0.01,
        dependencies: 0.01,
        documentation: 0.01,
        mixed: 0.04,
      }),

      blastRadius: choice("service", {
        isolated: 0.03,
        component: 0.15,
        service: 0.72,
        system: 0.1,
      }),

      testAssessment: choice("missing", {
        strong: 0.03,
        partial: 0.1,
        missing: 0.85,
        not_applicable: 0.02,
      }),

      rollbackDifficulty: choice("moderate", {
        easy: 0.2,
        moderate: 0.7,
        hard: 0.1,
      }),

      securitySensitive: choice("yes", {
        yes: 0.96,
        no: 0.04,
      }),
    },

    usage: {
      input_tokens: 420,
      output_tokens: 18,
    },
  };
}

describe("jevSystemOneResponseSchema", () => {
  it("accepts a complete Jev response", () => {
    const result = jevSystemOneResponseSchema.safeParse(validResponse());

    expect(result.success).toBe(true);
  });

  it("rejects an unknown choice", () => {
    const response = validResponse();
    response.answers.overallRisk.choice = "catastrophic";

    const result = jevSystemOneResponseSchema.safeParse(response);

    expect(result.success).toBe(false);
  });

  it("rejects an incomplete probability distribution", () => {
    const response = validResponse();

    const invalidResponse = {
      ...response,
      answers: {
        ...response.answers,
        securitySensitive: {
          ...response.answers.securitySensitive,
          probabilities: {
            yes: 0.96,
          },
        },
      },
    };

    const result = jevSystemOneResponseSchema.safeParse(invalidResponse);

    expect(result.success).toBe(false);
  });

  it("rejects probabilities that do not total approximately one", () => {
    const response = validResponse();

    response.answers.securitySensitive.probabilities = {
      yes: 0.2,
      no: 0.2,
    };

    const result = jevSystemOneResponseSchema.safeParse(response);

    expect(result.success).toBe(false);
  });
});
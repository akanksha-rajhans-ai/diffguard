import { describe, expect, it } from "vitest";

import type {
  Judgment,
  ReviewSignals,
} from "@/domain/analysis";

import { evaluateReviewPolicy } from "./policy";

function judgment<T extends string>(
  value: T,
  probabilities: Record<T, number>,
  confidence = 0.9,
): Judgment<T> {
  return {
    value,
    probabilities,
    confidence,
  };
}

function safeSignals(): ReviewSignals {
  return {
    overallRisk: judgment("low", {
      low: 1,
      medium: 0,
      high: 0,
      critical: 0,
    }),
    primaryChangeArea: judgment("ui", {
      ui: 1,
      api: 0,
      authentication: 0,
      database: 0,
      infrastructure: 0,
      dependencies: 0,
      documentation: 0,
      mixed: 0,
    }),
    blastRadius: judgment("isolated", {
      isolated: 1,
      component: 0,
      service: 0,
      system: 0,
    }),
    testAssessment: judgment("strong", {
      strong: 1,
      partial: 0,
      missing: 0,
      not_applicable: 0,
    }),
    rollbackDifficulty: judgment("easy", {
      easy: 1,
      moderate: 0,
      hard: 0,
    }),
    securitySensitive: judgment("no", {
      yes: 0,
      no: 1,
    }),
  };
}

describe("evaluateReviewPolicy", () => {
  it("allows a standard review for a narrow, well-tested change", () => {
    const result = evaluateReviewPolicy(safeSignals());

    expect(result.action).toBe("standard_review");
    expect(result.riskScore).toBe(5);
  });

  it("blocks a security-sensitive change with missing tests", () => {
    const signals = safeSignals();

    signals.securitySensitive = judgment("yes", {
      yes: 1,
      no: 0,
    });

    signals.testAssessment = judgment("missing", {
      strong: 0,
      partial: 0,
      missing: 1,
      not_applicable: 0,
    });

    const result = evaluateReviewPolicy(signals);

    expect(result.action).toBe("block_until_addressed");
    expect(result.triggeredRules.map((rule) => rule.id)).toEqual(
      expect.arrayContaining([
        "security-sensitive",
        "test-coverage",
      ]),
    );
  });

  it("requires focused review for accumulated moderate risk", () => {
    const signals = safeSignals();

    signals.overallRisk = judgment("medium", {
      low: 0,
      medium: 1,
      high: 0,
      critical: 0,
    });

    signals.testAssessment = judgment("partial", {
      strong: 0,
      partial: 1,
      missing: 0,
      not_applicable: 0,
    });

    signals.blastRadius = judgment("component", {
      isolated: 0,
      component: 1,
      service: 0,
      system: 0,
    });

    signals.rollbackDifficulty = judgment("moderate", {
      easy: 0,
      moderate: 1,
      hard: 0,
    });

    const result = evaluateReviewPolicy(signals);

    expect(result.riskScore).toBe(30);
    expect(result.action).toBe("focused_review");
  });

  it("blocks when critical risk has substantial probability", () => {
    const signals = safeSignals();

    signals.overallRisk = judgment("high", {
      low: 0,
      medium: 0.1,
      high: 0.5,
      critical: 0.4,
    });

    const result = evaluateReviewPolicy(signals);

    expect(result.action).toBe("block_until_addressed");
  });

  it("routes a low-confidence assessment to focused review", () => {
    const signals = safeSignals();

    signals.overallRisk = judgment(
      "low",
      {
        low: 1,
        medium: 0,
        high: 0,
        critical: 0,
      },
      0.45,
    );

    const result = evaluateReviewPolicy(signals);

    expect(result.action).toBe("focused_review");
    expect(result.triggeredRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "low-confidence",
        }),
      ]),
    );
  });
});
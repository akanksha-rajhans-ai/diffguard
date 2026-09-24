import { describe, expect, it } from "vitest";

import {
  binaryDecisions,
  blastRadii,
  changeAreas,
  riskLevels,
  rollbackDifficulties,
  testAssessments,
} from "@/domain/analysis";

import { normalizeJevResponse } from "./normalize-response";
import { jevSystemOneResponseSchema } from "./response-schema";

function answer(selected: string, choices: readonly string[]) {
  return {
    type: "choice",
    choice: selected,
    confidence: 0.9,
    probabilities: Object.fromEntries(
      choices.map((choice) => [
        choice,
        choice === selected ? 1 : 0,
      ]),
    ),
  };
}

describe("normalizeJevResponse", () => {
  it("converts provider fields into the DiffGuard domain model", () => {
    const response = jevSystemOneResponseSchema.parse({
      model: "jev-2026-09-15",
      answers: {
        overallRisk: answer("high", riskLevels),
        primaryChangeArea: answer(
          "authentication",
          changeAreas,
        ),
        blastRadius: answer("service", blastRadii),
        testAssessment: answer("missing", testAssessments),
        rollbackDifficulty: answer(
          "moderate",
          rollbackDifficulties,
        ),
        securitySensitive: answer("yes", binaryDecisions),
      },
      usage: {
        input_tokens: 420,
        output_tokens: 18,
      },
    });

    const result = normalizeJevResponse(response);

    expect(result).toMatchObject({
      model: "jev-2026-09-15",
      usage: {
        inputTokens: 420,
        outputTokens: 18,
      },
      signals: {
        overallRisk: {
          value: "high",
          confidence: 0.9,
        },
        primaryChangeArea: {
          value: "authentication",
        },
        securitySensitive: {
          value: "yes",
        },
      },
    });

    expect(result.signals.overallRisk.probabilities.high).toBe(1);
  });
});

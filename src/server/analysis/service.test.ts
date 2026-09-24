import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import {
  binaryDecisions,
  blastRadii,
  changeAreas,
  riskLevels,
  rollbackDifficulties,
  testAssessments,
} from "@/domain/analysis";

import type { FetchLike } from "./jev/client";
import { analyzePullRequest } from "./service";

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

function jevResponse() {
  return {
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
  };
}

describe("analyzePullRequest", () => {
  it("runs the complete analysis pipeline", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response(JSON.stringify(jevResponse()), {
        status: 200,
      }),
    );

    const result = await analyzePullRequest(
      {
        title: "  Simplify session validation  ",
        description: "Reduce authentication latency.",
        diff: "-verify(token)\n+decode(token)",
      },
      {
        apiKey: "test-api-key",
        model: "jev-latest",
        fetchImpl,
      },
    );

    expect(result.pullRequest).toMatchObject({
      title: "Simplify session validation",
      description: "Reduce authentication latency.",
    });

    expect(result.signals).toMatchObject({
      overallRisk: {
        value: "high",
      },
      securitySensitive: {
        value: "yes",
      },
      testAssessment: {
        value: "missing",
      },
    });

    expect(result.decision.action).toBe(
      "block_until_addressed",
    );

    expect(result.metadata).toMatchObject({
      mode: "live",
      provider: "jev",
      model: "jev-2026-09-15",
      inputTokens: 420,
      outputTokens: 18,
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects invalid input before contacting Jev", async () => {
    const fetchImpl = vi.fn<FetchLike>();

    await expect(
      analyzePullRequest(
        {
          title: "x",
          diff: "",
        },
        {
          apiKey: "test-api-key",
          model: "jev-latest",
          fetchImpl,
        },
      ),
    ).rejects.toBeInstanceOf(ZodError);

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
import { describe, expect, it } from "vitest";

import { buildJevRequest } from "./build-request";

describe("buildJevRequest", () => {
  it("builds one request containing every risk question", () => {
    const request = buildJevRequest(
      {
        title: "Update session validation",
        description: "Simplifies authentication middleware.",
        diff: "-verify(token)\n+decode(token)",
      },
      "jev-latest",
    );

    expect(request.model).toBe("jev-latest");

    expect(request.state).toEqual({
      title: "Update session validation",
      description: "Simplifies authentication middleware.",
      diff: "-verify(token)\n+decode(token)",
    });

    expect(Object.keys(request.questions)).toEqual([
      "overallRisk",
      "primaryChangeArea",
      "blastRadius",
      "testAssessment",
      "rollbackDifficulty",
      "securitySensitive",
    ]);

    for (const question of Object.values(request.questions)) {
      expect(question.type).toBe("choice");
      expect(question.instructions.length).toBeGreaterThan(20);
      expect(Object.keys(question.criteria).length).toBeGreaterThanOrEqual(2);
    }
  });
});
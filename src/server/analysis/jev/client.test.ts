import { describe, expect, it, vi } from "vitest";

import {
  binaryDecisions,
  blastRadii,
  changeAreas,
  riskLevels,
  rollbackDifficulties,
  testAssessments,
} from "@/domain/analysis";

import { buildJevRequest } from "./build-request";
import {
  JevClientError,
  requestJevAssessment,
  type FetchLike,
} from "./client";

function answer(selected: string, choices: readonly string[]) {
  return {
    type: "choice",
    choice: selected,
    confidence: 0.9,
    probabilities: Object.fromEntries(
      choices.map((choice) => [choice, choice === selected ? 1 : 0]),
    ),
  };
}

function validResponse() {
  return {
    model: "jev-2026-09-15",
    answers: {
      overallRisk: answer("high", riskLevels),
      primaryChangeArea: answer("authentication", changeAreas),
      blastRadius: answer("service", blastRadii),
      testAssessment: answer("missing", testAssessments),
      rollbackDifficulty: answer("moderate", rollbackDifficulties),
      securitySensitive: answer("yes", binaryDecisions),
    },
    usage: {
      input_tokens: 420,
      output_tokens: 18,
    },
  };
}

const request = buildJevRequest(
  {
    title: "Update session validation",
    description: "",
    diff: "-verify(token)\n+decode(token)",
  },
  "jev-latest",
);

describe("requestJevAssessment", () => {
  it("sends an authenticated request and validates the response", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response(JSON.stringify(validResponse()), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const result = await requestJevAssessment(request, {
      apiKey: "test-api-key",
      fetchImpl,
    });

    expect(result.model).toBe("jev-2026-09-15");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.typesafe.ai/v1/systemone",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("maps authentication failures without exposing the response body", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response("sensitive upstream details", {
        status: 401,
      }),
    );

    await expect(
      requestJevAssessment(request, {
        apiKey: "invalid-api-key",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      name: "JevClientError",
      code: "authentication",
      status: 401,
    });
  });

  it("rejects malformed successful responses", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
      }),
    );

    await expect(
      requestJevAssessment(request, {
        apiKey: "test-api-key",
        fetchImpl,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<JevClientError>>({
        code: "invalid_response",
      }),
    );
  });

  it("fails before making a request when the API key is missing", async () => {
    const fetchImpl = vi.fn<FetchLike>();

    await expect(
      requestJevAssessment(request, {
        apiKey: " ",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "configuration",
    });

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
it("rejects a successful response containing invalid JSON", async () => {
  const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
    new Response("not-json", {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );

  await expect(
    requestJevAssessment(request, {
      apiKey: "test-api-key",
      fetchImpl,
    }),
  ).rejects.toMatchObject({
    code: "invalid_response",
  });
});

it.each([
  {
    status: 429,
    expectedCode: "rate_limit",
  },
  {
    status: 500,
    expectedCode: "upstream",
  },
])(
  "maps HTTP $status to $expectedCode",
  async ({ status, expectedCode }) => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      new Response(null, { status }),
    );

    await expect(
      requestJevAssessment(request, {
        apiKey: "test-api-key",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: expectedCode,
      status,
    });
  },
);

it("maps connection failures without exposing their details", async () => {
  const fetchImpl = vi
    .fn<FetchLike>()
    .mockRejectedValue(
      new Error("Internal network details must remain private"),
    );

  await expect(
    requestJevAssessment(request, {
      apiKey: "test-api-key",
      fetchImpl,
    }),
  ).rejects.toMatchObject({
    code: "network",
    message: "DiffGuard could not connect to Jev.",
  });
});

it("aborts requests that exceed the configured timeout", async () => {
  const fetchImpl = vi.fn<FetchLike>(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            reject(
              new DOMException(
                "The operation was aborted.",
                "AbortError",
              ),
            );
          },
          { once: true },
        );
      }),
  );

  await expect(
    requestJevAssessment(request, {
      apiKey: "test-api-key",
      timeoutMs: 1,
      fetchImpl,
    }),
  ).rejects.toMatchObject({
    code: "timeout",
  });
});
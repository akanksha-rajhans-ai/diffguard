import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { analyzeRequestSchema } from "@/server/analysis/request-schema";

import { JevClientError } from "@/server/analysis/jev/client";

const mocks = vi.hoisted(() => ({
  analyzePullRequest: vi.fn(),
}));

vi.mock("@/server/analysis/service", () => ({
  analyzePullRequest: mocks.analyzePullRequest,
}));

import { POST } from "./route";

describe("POST /api/analyze", () => {
  const originalApiKey = process.env.JEV_API_KEY;
  const originalModel = process.env.JEV_MODEL;

  beforeEach(() => {
    process.env.JEV_API_KEY = "test-api-key";
    process.env.JEV_MODEL = "jev-test";
  });

  afterEach(() => {
    vi.clearAllMocks();

    process.env.JEV_API_KEY = originalApiKey;
    process.env.JEV_MODEL = originalModel;
  });

  it("returns an analysis from the service", async () => {
    mocks.analyzePullRequest.mockResolvedValue({
      decision: {
        action: "focused_review",
        riskScore: 48,
      },
    });

    const body = {
      title: "Update session validation",
      description: "",
      diff: "-verify(token)\n+decode(token)",
    };

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      analysis: {
        decision: {
          action: "focused_review",
          riskScore: 48,
        },
      },
    });

    expect(mocks.analyzePullRequest).toHaveBeenCalledWith(
      body,
      {
        apiKey: "test-api-key",
        model: "jev-test",
      },
    );
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: "{not-valid-json",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.analyzePullRequest).not.toHaveBeenCalled();
  });

  it("maps Jev timeouts to a safe gateway error", async () => {
    mocks.analyzePullRequest.mockRejectedValue(
      new JevClientError(
        "timeout",
        "Internal provider timeout details.",
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Update session validation",
          diff: "-verify(token)\n+decode(token)",
        }),
      }),
    );

    expect(response.status).toBe(504);

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "provider_timeout",
        message:
          "The analysis provider took too long to respond.",
      },
    });
  });
  it("returns actionable validation issues", async () => {
  const validation = analyzeRequestSchema.safeParse({
    title: "x",
    diff: "",
  });

  if (validation.success) {
    throw new Error("Expected the test request to be invalid.");
  }

  mocks.analyzePullRequest.mockRejectedValue(validation.error);

  const response = await POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "x",
        diff: "",
      }),
    }),
  );

  expect(response.status).toBe(400);

  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: "invalid_request",
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: ["diff"],
        }),
      ]),
    },
  });
});

it.each([
  {
    providerCode: "configuration",
    expectedStatus: 503,
    expectedCode: "service_unavailable",
  },
  {
    providerCode: "rate_limit",
    expectedStatus: 503,
    expectedCode: "provider_busy",
  },
  {
    providerCode: "authentication",
    expectedStatus: 502,
    expectedCode: "provider_error",
  },
  {
    providerCode: "network",
    expectedStatus: 502,
    expectedCode: "provider_error",
  },
  {
    providerCode: "upstream",
    expectedStatus: 502,
    expectedCode: "provider_error",
  },
  {
    providerCode: "invalid_response",
    expectedStatus: 502,
    expectedCode: "provider_error",
  },
] as const)(
  "maps $providerCode to a safe public error",
  async ({
    providerCode,
    expectedStatus,
    expectedCode,
  }) => {
    mocks.analyzePullRequest.mockRejectedValue(
      new JevClientError(
        providerCode,
        "Sensitive internal provider details.",
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Update session validation",
          diff: "-verify(token)\n+decode(token)",
        }),
      }),
    );

    expect(response.status).toBe(expectedStatus);

    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: expectedCode,
      },
    });
  },
);

it("returns a generic response for unexpected failures", async () => {
  mocks.analyzePullRequest.mockRejectedValue(
    new Error("Sensitive implementation details."),
  );

  const response = await POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Update session validation",
        diff: "-verify(token)\n+decode(token)",
      }),
    }),
  );

  expect(response.status).toBe(500);

  await expect(response.json()).resolves.toEqual({
    error: {
      code: "internal_error",
      message: "DiffGuard could not complete the analysis.",
    },
  });
});
});
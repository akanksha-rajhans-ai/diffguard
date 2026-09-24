import { ZodError } from "zod";

import { JevClientError } from "@/server/analysis/jev/client";
import { analyzePullRequest } from "@/server/analysis/service";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "The request body must contain valid JSON.",
    );
  }

  try {
    const analysis = await analyzePullRequest(body, {
      apiKey: process.env.JEV_API_KEY ?? "",
      model: process.env.JEV_MODEL ?? "jev-latest",
    });

    return Response.json(
      { analysis },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: {
            code: "invalid_request",
            message: "The analysis request is invalid.",
            issues: error.issues.map((issue) => ({
              path: issue.path,
              message: issue.message,
            })),
          },
        },
        { status: 400 },
      );
    }

    if (error instanceof JevClientError) {
      return mapJevError(error);
    }

    return errorResponse(
      500,
      "internal_error",
      "DiffGuard could not complete the analysis.",
    );
  }
}

function mapJevError(error: JevClientError): Response {
  switch (error.code) {
    case "configuration":
      return errorResponse(
        503,
        "service_unavailable",
        "The analysis service is not configured.",
      );

    case "timeout":
      return errorResponse(
        504,
        "provider_timeout",
        "The analysis provider took too long to respond.",
      );

    case "rate_limit":
      return errorResponse(
        503,
        "provider_busy",
        "The analysis provider is temporarily busy.",
      );

    case "authentication":
    case "network":
    case "upstream":
    case "invalid_response":
      return errorResponse(
        502,
        "provider_error",
        "The analysis provider could not complete the request.",
      );
  }
}

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
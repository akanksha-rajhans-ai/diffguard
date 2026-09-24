import { createAuthenticationRiskDemo } from "@/server/analysis/demo/authentication-risk";

export const runtime = "nodejs";

export function GET(): Response {
  return Response.json(
    {
      analysis: createAuthenticationRiskDemo(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
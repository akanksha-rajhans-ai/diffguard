import type {
  Judgment,
  PullRequestAnalysis,
  ReviewSignals,
} from "@/domain/analysis";

import { evaluateReviewPolicy } from "../policy";

function judgment<T extends string>(
  value: NoInfer<T>,
  probabilities: Record<T, number>,
  confidence = 0.9,
): Judgment<T> {
  return {
    value,
    probabilities,
    confidence,
  };
}

export function createAuthenticationRiskDemo(): PullRequestAnalysis {
  const signals: ReviewSignals = {
    overallRisk: judgment(
      "high",
      {
        low: 0.02,
        medium: 0.14,
        high: 0.69,
        critical: 0.15,
      },
      0.88,
    ),

    primaryChangeArea: judgment(
      "authentication",
      {
        ui: 0.01,
        api: 0.04,
        authentication: 0.88,
        database: 0.01,
        infrastructure: 0.01,
        dependencies: 0.01,
        documentation: 0.01,
        mixed: 0.03,
      },
      0.93,
    ),

    blastRadius: judgment(
      "service",
      {
        isolated: 0.03,
        component: 0.16,
        service: 0.72,
        system: 0.09,
      },
      0.84,
    ),

    testAssessment: judgment(
      "missing",
      {
        strong: 0.03,
        partial: 0.13,
        missing: 0.82,
        not_applicable: 0.02,
      },
      0.91,
    ),

    rollbackDifficulty: judgment(
      "moderate",
      {
        easy: 0.21,
        moderate: 0.68,
        hard: 0.11,
      },
      0.78,
    ),

    securitySensitive: judgment(
      "yes",
      {
        yes: 0.97,
        no: 0.03,
      },
      0.96,
    ),
  };

  return {
    pullRequest: {
      id: "demo-auth-verification-bypass",
      repository: "acme/customer-portal",
      number: 184,
      title: "Reduce authentication middleware latency",
      description:
        "Simplifies session parsing on protected routes.",
      author: "maya-chen",
      baseBranch: "main",
      headBranch: "perf/faster-session-parsing",
      additions: 2,
      deletions: 6,
      changedFiles: 2,
      diff: `diff --git a/src/auth/session.ts b/src/auth/session.ts
--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -18,6 +18,2 @@ export async function getSession(token: string) {
-  return verifySession(
-    token,
-    env.SESSION_SECRET
-  );
+  return decodeJwt(token) as Session;
 }`,
    },

    signals,
    decision: evaluateReviewPolicy(signals),

    metadata: {
      mode: "demo",
      provider: "fixture",
      analyzedAt: new Date().toISOString(),
    },
  };
}
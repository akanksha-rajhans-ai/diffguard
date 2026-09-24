import { randomUUID } from "node:crypto";

import type { PullRequestAnalysis } from "@/domain/analysis";

import { buildJevRequest } from "./jev/build-request";
import {
  requestJevAssessment,
  type FetchLike,
} from "./jev/client";
import { normalizeJevResponse } from "./jev/normalize-response";
import { evaluateReviewPolicy } from "./policy";
import { analyzeRequestSchema } from "./request-schema";

interface AnalysisServiceDependencies {
  apiKey: string;
  model: string;
  fetchImpl?: FetchLike;
}

export async function analyzePullRequest(
  input: unknown,
  dependencies: AnalysisServiceDependencies,
): Promise<PullRequestAnalysis> {
  const request = analyzeRequestSchema.parse(input);
  const startedAt = performance.now();

  const jevRequest = buildJevRequest(
    request,
    dependencies.model,
  );

  const jevResponse = await requestJevAssessment(jevRequest, {
    apiKey: dependencies.apiKey,
    fetchImpl: dependencies.fetchImpl,
  });

  const assessment = normalizeJevResponse(jevResponse);
  const decision = evaluateReviewPolicy(assessment.signals);

  return {
    pullRequest: {
      id: randomUUID(),
      title: request.title,
      description: request.description,
      diff: request.diff,
    },

    signals: assessment.signals,
    decision,

    metadata: {
      mode: "live",
      provider: "jev",
      model: assessment.model,
      durationMs: Math.round(performance.now() - startedAt),
      inputTokens: assessment.usage.inputTokens,
      outputTokens: assessment.usage.outputTokens,
      analyzedAt: new Date().toISOString(),
    },
  };
}
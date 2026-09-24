import type {
  Judgment,
  ReviewSignals,
} from "@/domain/analysis";

import type { JevSystemOneResponse } from "./response-schema";

interface ChoiceAnswer<T extends string> {
  choice: T;
  confidence: number;
  probabilities: Record<T, number>;
}

function toJudgment<T extends string>(
  answer: ChoiceAnswer<T>,
): Judgment<T> {
  return {
    value: answer.choice,
    confidence: answer.confidence,
    probabilities: answer.probabilities,
  };
}

export interface NormalizedJevAssessment {
  signals: ReviewSignals;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export function normalizeJevResponse(
  response: JevSystemOneResponse,
): NormalizedJevAssessment {
  return {
    signals: {
      overallRisk: toJudgment(response.answers.overallRisk),
      primaryChangeArea: toJudgment(
        response.answers.primaryChangeArea,
      ),
      blastRadius: toJudgment(response.answers.blastRadius),
      testAssessment: toJudgment(
        response.answers.testAssessment,
      ),
      rollbackDifficulty: toJudgment(
        response.answers.rollbackDifficulty,
      ),
      securitySensitive: toJudgment(
        response.answers.securitySensitive,
      ),
    },

    model: response.model,

    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
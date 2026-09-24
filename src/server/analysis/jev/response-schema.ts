import { z } from "zod";

import {
  binaryDecisions,
  blastRadii,
  changeAreas,
  riskLevels,
  rollbackDifficulties,
  testAssessments,
} from "@/domain/analysis";

const probabilitySchema = z.number().min(0).max(1);

function createChoiceAnswerSchema<
  const T extends readonly [string, ...string[]],
>(choices: T) {
  const choiceSchema = z.enum(choices);

  return z
    .object({
      type: z.literal("choice"),
      choice: choiceSchema,
      confidence: probabilitySchema,
      probabilities: z.record(choiceSchema, probabilitySchema),
    })
    .superRefine((answer, context) => {
      const probabilities = Object.values(
        answer.probabilities as Record<string, number>,
        );

        const total = probabilities.reduce(
        (sum, probability) => sum + probability,
        0,
        );

      if (Math.abs(total - 1) > 0.05) {
        context.addIssue({
          code: "custom",
          path: ["probabilities"],
          message: "Choice probabilities must sum to approximately 1.",
        });
      }
    });
}

export const jevSystemOneResponseSchema = z.object({
  model: z.string().min(1),

  answers: z.object({
    overallRisk: createChoiceAnswerSchema(riskLevels),
    primaryChangeArea: createChoiceAnswerSchema(changeAreas),
    blastRadius: createChoiceAnswerSchema(blastRadii),
    testAssessment: createChoiceAnswerSchema(testAssessments),
    rollbackDifficulty: createChoiceAnswerSchema(rollbackDifficulties),
    securitySensitive: createChoiceAnswerSchema(binaryDecisions),
  }),

  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
});

export type JevSystemOneResponse = z.infer<
  typeof jevSystemOneResponseSchema
>;
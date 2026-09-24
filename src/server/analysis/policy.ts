import type {
  ReviewDecision,
  ReviewSignals,
  TriggeredRule,
} from "@/domain/analysis";

const OVERALL_RISK_WEIGHTS = {
  low: 5,
  medium: 20,
  high: 40,
  critical: 60,
} as const;

const TEST_WEIGHTS = {
  strong: 0,
  partial: 4,
  missing: 12,
  not_applicable: 0,
} as const;

const BLAST_RADIUS_WEIGHTS = {
  isolated: 0,
  component: 3,
  service: 8,
  system: 13,
} as const;

const ROLLBACK_WEIGHTS = {
  easy: 0,
  moderate: 3,
  hard: 7,
} as const;

const LOW_CONFIDENCE_THRESHOLD = 0.6;

function expectedContribution<T extends string>(
  probabilities: Record<T, number>,
  weights: Record<T, number>,
): number {
  const entries = Object.entries(probabilities) as Array<
    [T, number]
  >;

  return Math.round(
    entries.reduce(
      (total, [key, probability]) =>
        total + probability * weights[key],
      0,
    ),
  );
}

export function evaluateReviewPolicy(
  signals: ReviewSignals,
): ReviewDecision {
  const triggeredRules: TriggeredRule[] = [];

  const overallRiskContribution = expectedContribution(
    signals.overallRisk.probabilities,
    OVERALL_RISK_WEIGHTS,
  );

  triggeredRules.push({
    id: "overall-risk",
    label: "Overall assessed risk",
    explanation:
      "Contribution is calculated from the complete risk probability distribution.",
    contribution: overallRiskContribution,
  });

  const securityContribution = Math.round(
    signals.securitySensitive.probabilities.yes * 15,
  );

  if (securityContribution > 0) {
    triggeredRules.push({
      id: "security-sensitive",
      label: "Security-sensitive change",
      explanation:
        "Security-sensitive changes receive additional review weight.",
      contribution: securityContribution,
    });
  }

  const testContribution = expectedContribution(
    signals.testAssessment.probabilities,
    TEST_WEIGHTS,
  );

  if (testContribution > 0) {
    triggeredRules.push({
      id: "test-coverage",
      label: "Insufficient test coverage",
      explanation:
        "Partial or missing tests increase the chance that defects reach production.",
      contribution: testContribution,
    });
  }

  const blastRadiusContribution = expectedContribution(
    signals.blastRadius.probabilities,
    BLAST_RADIUS_WEIGHTS,
  );

  if (blastRadiusContribution > 0) {
    triggeredRules.push({
      id: "blast-radius",
      label: "Broad blast radius",
      explanation:
        "Changes affecting a service or system require more scrutiny.",
      contribution: blastRadiusContribution,
    });
  }

  const rollbackContribution = expectedContribution(
    signals.rollbackDifficulty.probabilities,
    ROLLBACK_WEIGHTS,
  );

  if (rollbackContribution > 0) {
    triggeredRules.push({
      id: "rollback-difficulty",
      label: "Rollback difficulty",
      explanation:
        "Changes that are difficult to reverse carry greater operational risk.",
      contribution: rollbackContribution,
    });
  }

  const lowestConfidence = Math.min(
    ...Object.values(signals).map(
      (signal) => signal.confidence,
    ),
  );

  if (lowestConfidence < LOW_CONFIDENCE_THRESHOLD) {
    triggeredRules.push({
      id: "low-confidence",
      label: "Uncertain assessment",
      explanation:
        "At least one judgment has low confidence and should be checked by a human.",
      contribution: 5,
    });
  }

  const riskScore = Math.min(
    100,
    triggeredRules.reduce(
      (total, rule) => total + rule.contribution,
      0,
    ),
  );

  const securityAndTestsOverride =
    signals.securitySensitive.probabilities.yes >= 0.65 &&
    signals.testAssessment.probabilities.missing >= 0.5;

  const criticalRiskOverride =
    signals.overallRisk.probabilities.critical >= 0.35;

  const hasLowConfidence = lowestConfidence < LOW_CONFIDENCE_THRESHOLD;

  let action: ReviewDecision["action"];

  if (
    riskScore >= 70 ||
    securityAndTestsOverride ||
    criticalRiskOverride
  ) {
    action = "block_until_addressed";
  } else if (
    riskScore >= 30 ||
    signals.securitySensitive.probabilities.yes >= 0.5 ||
    hasLowConfidence
  ) {
    action = "focused_review";
  } else {
    action = "standard_review";
  }

  return {
    action,
    riskScore,
    triggeredRules,
  };
}
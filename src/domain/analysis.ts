export const riskLevels = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof riskLevels)[number];

export const changeAreas = [
  "ui",
  "api",
  "authentication",
  "database",
  "infrastructure",
  "dependencies",
  "documentation",
  "mixed",
] as const;
export type ChangeArea = (typeof changeAreas)[number];

export const blastRadii = [
  "isolated",
  "component",
  "service",
  "system",
] as const;
export type BlastRadius = (typeof blastRadii)[number];

export const testAssessments = [
  "strong",
  "partial",
  "missing",
  "not_applicable",
] as const;
export type TestAssessment = (typeof testAssessments)[number];

export const rollbackDifficulties = ["easy", "moderate", "hard"] as const;
export type RollbackDifficulty = (typeof rollbackDifficulties)[number];

export const binaryDecisions = ["yes", "no"] as const;
export type BinaryDecision = (typeof binaryDecisions)[number];

export const reviewActions = [
  "standard_review",
  "focused_review",
  "block_until_addressed",
] as const;
export type ReviewAction = (typeof reviewActions)[number];

export type ProbabilityDistribution<T extends string> = Record<T, number>;

export interface Judgment<T extends string> {
  value: T;
  probabilities: ProbabilityDistribution<T>;
  confidence: number;
}

export interface PullRequestSnapshot {
  id: string;
  title: string;
  description: string;
  diff: string;
  repository?: string;
  number?: number;
  author?: string;
  baseBranch?: string;
  headBranch?: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
}

export interface ReviewSignals {
  overallRisk: Judgment<RiskLevel>;
  primaryChangeArea: Judgment<ChangeArea>;
  blastRadius: Judgment<BlastRadius>;
  testAssessment: Judgment<TestAssessment>;
  rollbackDifficulty: Judgment<RollbackDifficulty>;
  securitySensitive: Judgment<BinaryDecision>;
}

export interface TriggeredRule {
  id: string;
  label: string;
  explanation: string;
  contribution: number;
}

export interface ReviewDecision {
  action: ReviewAction;
  riskScore: number;
  triggeredRules: TriggeredRule[];
}

export interface AnalysisMetadata {
  mode: "demo" | "live";
  provider: "fixture" | "jev";
  model?: string;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  analyzedAt: string;
}

export interface PullRequestAnalysis {
  pullRequest: PullRequestSnapshot;
  signals: ReviewSignals;
  decision: ReviewDecision;
  metadata: AnalysisMetadata;
}
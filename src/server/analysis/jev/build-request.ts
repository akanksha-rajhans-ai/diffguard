import type { AnalyzeRequest } from "../request-schema";

interface JevChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
}

export interface JevSystemOneRequest {
  model: string;
  state: {
    title: string;
    description: string;
    diff: string;
  };
  questions: Record<string, JevChoiceQuestion>;
}

export function buildJevRequest(
  input: AnalyzeRequest,
  model: string,
): JevSystemOneRequest {
  return {
    model,

    state: {
      title: input.title,
      description: input.description,
      diff: input.diff,
    },

    questions: {
      overallRisk: {
        type: "choice",
        instructions:
          "Assess the overall review risk of merging this pull request as shown.",
        criteria: {
          low: "Localized, routine change with little potential for harm.",
          medium:
            "Meaningful change requiring normal review attention, but with limited potential impact.",
          high: "Change could cause a serious defect, outage, data issue, or security weakness.",
          critical:
            "Change presents an immediate or widespread security, data-loss, or production risk.",
        },
      },

      primaryChangeArea: {
        type: "choice",
        instructions:
          "Identify the primary engineering area affected by this pull request.",
        criteria: {
          ui: "User-interface presentation or interaction code.",
          api: "Application API, request handling, or service contract.",
          authentication:
            "Identity, authentication, authorization, sessions, or access control.",
          database:
            "Database schema, queries, persistence, or data migration.",
          infrastructure:
            "Deployment, networking, cloud resources, CI, or runtime configuration.",
          dependencies:
            "Third-party libraries, package versions, or dependency configuration.",
          documentation: "Documentation-only changes.",
          mixed: "Several engineering areas are materially affected.",
        },
      },

      blastRadius: {
        type: "choice",
        instructions:
          "Estimate how broadly a defect in this pull request could affect the system.",
        criteria: {
          isolated: "Only one narrow code path or internal utility.",
          component: "One application component or feature.",
          service: "A full service or most of its users.",
          system: "Multiple services, the entire system, or all users.",
        },
      },

      testAssessment: {
        type: "choice",
        instructions:
          "Assess whether the shown tests adequately cover the behavior changed by this pull request.",
        criteria: {
          strong:
            "Tests cover the important success, failure, and edge-case behavior.",
          partial:
            "Some relevant tests exist, but important behavior is not covered.",
          missing:
            "No meaningful tests for the changed behavior are shown.",
          not_applicable:
            "The change reasonably does not require automated test coverage.",
        },
      },

      rollbackDifficulty: {
        type: "choice",
        instructions:
          "Estimate how difficult it would be to safely reverse this change after deployment.",
        criteria: {
          easy: "A code-only revert restores the previous behavior safely.",
          moderate:
            "Rollback requires coordination, configuration changes, or careful verification.",
          hard: "Rollback may be destructive, irreversible, or require data repair.",
        },
      },

      securitySensitive: {
        type: "choice",
        instructions:
          "Decide whether this pull request changes security-sensitive behavior.",
        criteria: {
          yes: "It affects authentication, authorization, secrets, trust boundaries, validation, or sensitive data.",
          no: "It does not materially affect security-sensitive behavior.",
        },
      },
    },
  };
}
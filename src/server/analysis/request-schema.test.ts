import { describe, expect, it } from "vitest";

import {
  MAX_DIFF_CHARACTERS,
  analyzeRequestSchema,
} from "./request-schema";

describe("analyzeRequestSchema", () => {
  it("accepts a valid request and applies defaults", () => {
    const diff = "diff --git a/a.ts b/a.ts\n+export const enabled = true;\n";

    const result = analyzeRequestSchema.parse({
      title: "  Enable the feature  ",
      diff,
    });

    expect(result).toEqual({
      title: "Enable the feature",
      description: "",
      diff,
    });
  });

  it("rejects a blank diff", () => {
    const result = analyzeRequestSchema.safeParse({
      title: "Update authentication",
      diff: "   \n",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["diff"]);
    }
  });

  it("rejects an oversized diff", () => {
    const result = analyzeRequestSchema.safeParse({
      title: "Large generated change",
      diff: "x".repeat(MAX_DIFF_CHARACTERS + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected properties", () => {
    const result = analyzeRequestSchema.safeParse({
      title: "Update authentication",
      diff: "+const secure = true;",
      apiKey: "must-not-be-accepted",
    });

    expect(result.success).toBe(false);
  });
});
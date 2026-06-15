// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { describe, expect, it } from "vitest";
import { DEFAULT_GATE_POLICY, evaluateGate, parseGateLevel } from "./gate.js";
import type { CompilerResult } from "./result.js";
import { loadResultFixture } from "./fixtures.test-helper.js";

describe("evaluateGate against real compiler output", () => {
  it("fails loan-preapproval at the default warning level and lists the reason", () => {
    const verdict = evaluateGate(loadResultFixture("loan-preapproval"));
    expect(verdict.passed).toBe(false);
    expect(verdict.violations.some((v) => v.code === "severity-threshold")).toBe(true);
    expect(verdict.findingCounts.warning).toBe(5);
    expect(verdict.findingCounts.info).toBe(1);
  });

  it("passes loan-preapproval when only errors should fail", () => {
    const verdict = evaluateGate(loadResultFixture("loan-preapproval"), {
      ...DEFAULT_GATE_POLICY,
      failOn: "error",
    });
    expect(verdict.passed).toBe(true);
    expect(verdict.violations).toHaveLength(0);
  });

  it("passes a clean, determinism-compliant model", () => {
    const verdict = evaluateGate(loadResultFixture("runtime-bound"));
    expect(verdict.passed).toBe(true);
  });
});

const baseResult = (overrides: Partial<CompilerResult["summary"]>): CompilerResult =>
  ({
    metadata: {
      compilerVersion: "0.1.0",
      timestamp: "2026-01-01T00:00:00.000Z",
      modelId: "m",
      degraded: false,
    },
    structuralFindings: [],
    semanticFindings: [],
    summary: {
      structuralErrors: 0,
      semanticErrors: 0,
      warnings: 0,
      determinismCompliance: true,
      runtimeProfileMissing: false,
      contractCoverageRatio: 0,
      decisionAnalysisStatus: "complete",
      governanceTier: "tier-1",
      maturitySignal: { totalEvaluationPoints: 0, deterministicTotal: 0, portableTotal: 0 },
      ...overrides,
    },
  }) as CompilerResult;

describe("evaluateGate structural predictability checks", () => {
  it("fails when the model is not determinism-compliant", () => {
    const verdict = evaluateGate(baseResult({ determinismCompliance: false }));
    expect(verdict.passed).toBe(false);
    expect(verdict.violations.map((v) => v.code)).toContain("determinism-noncompliant");
  });

  it("fails when the runtime profile is missing, unless allowed", () => {
    const result = baseResult({ runtimeProfileMissing: true });
    expect(evaluateGate(result).passed).toBe(false);
    const allowed = evaluateGate(result, { ...DEFAULT_GATE_POLICY, requireRuntimeProfile: false });
    expect(allowed.passed).toBe(true);
  });

  it("can fail on degraded analysis when configured", () => {
    const result = { ...baseResult({}), metadata: { ...baseResult({}).metadata, degraded: true } };
    expect(evaluateGate(result).passed).toBe(true);
    const strict = evaluateGate(result, { ...DEFAULT_GATE_POLICY, failOnDegraded: true });
    expect(strict.violations.map((v) => v.code)).toContain("analysis-degraded");
  });
});

describe("parseGateLevel", () => {
  it("accepts known levels", () => {
    expect(parseGateLevel("error")).toBe("error");
    expect(parseGateLevel("warning")).toBe("warning");
    expect(parseGateLevel("info")).toBe("info");
  });

  it("throws on an unknown level", () => {
    expect(() => parseGateLevel("blocker")).toThrow(/unknown gate level/);
  });
});

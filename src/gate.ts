// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { allFindings, type CompilerResult, type Severity } from "./result.js";

/**
 * Severity threshold for the pipeline gate. The gate fails when any finding at
 * or above this severity is present (and, independently, on the structural
 * predictability checks below). Ordered most-to-least strict.
 */
export type GateLevel = "error" | "warning" | "info";

export const GATE_LEVELS: readonly GateLevel[] = ["error", "warning", "info"];

const SEVERITY_RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };
const LEVEL_RANK: Record<GateLevel, number> = { error: 3, warning: 2, info: 1 };

export interface GatePolicy {
  /**
   * Fail when a finding of this severity (or stricter) exists. Default
   * `warning`: errors and warnings break the build, info findings do not.
   */
  readonly failOn: GateLevel;
  /**
   * Fail when the model is not determinism-compliant for its governance tier.
   * Default `true` — this is the core DPG predictability gate.
   */
  readonly requireDeterminismCompliance: boolean;
  /**
   * Fail when the analysis ran without a resolved runtime profile (the
   * determinism verdict is then unreliable). Default `true`.
   */
  readonly requireRuntimeProfile: boolean;
  /**
   * Fail when the compiler degraded (could not fully analyze the model).
   * Default `false` — degraded analysis still yields a usable signal.
   */
  readonly failOnDegraded: boolean;
}

export const DEFAULT_GATE_POLICY: GatePolicy = {
  failOn: "warning",
  requireDeterminismCompliance: true,
  requireRuntimeProfile: true,
  failOnDegraded: false,
};

export interface GateViolation {
  /** Stable code so CI logs and annotations can branch on the reason. */
  readonly code:
    | "severity-threshold"
    | "determinism-noncompliant"
    | "runtime-profile-missing"
    | "analysis-degraded";
  readonly message: string;
}

export interface GateVerdict {
  readonly passed: boolean;
  readonly policy: GatePolicy;
  readonly violations: readonly GateViolation[];
  /** Count of findings at each severity, for the summary line. */
  readonly findingCounts: Readonly<Record<Severity, number>>;
}

const countBySeverity = (result: CompilerResult): Record<Severity, number> => {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const finding of allFindings(result)) {
    counts[finding.severity] += 1;
  }
  return counts;
};

/**
 * Evaluates a compiler result against a gate policy and returns a verdict with
 * every reason it failed (not just the first), so a single CI run surfaces all
 * the governance problems to fix.
 */
export const evaluateGate = (
  result: CompilerResult,
  policy: GatePolicy = DEFAULT_GATE_POLICY,
): GateVerdict => {
  const findingCounts = countBySeverity(result);
  const violations: GateViolation[] = [];

  const threshold = LEVEL_RANK[policy.failOn];
  const offending = allFindings(result).filter((f) => SEVERITY_RANK[f.severity] >= threshold);
  if (offending.length > 0) {
    const breakdown = (["error", "warning", "info"] as const)
      .filter((s) => SEVERITY_RANK[s] >= threshold && findingCounts[s] > 0)
      .map((s) => `${findingCounts[s]} ${s}`)
      .join(", ");
    violations.push({
      code: "severity-threshold",
      message: `gate level is "${policy.failOn}": found ${breakdown}`,
    });
  }

  if (policy.requireDeterminismCompliance && !result.summary.determinismCompliance) {
    violations.push({
      code: "determinism-noncompliant",
      message: `model is not determinism-compliant for governance tier "${result.summary.governanceTier}"`,
    });
  }

  if (policy.requireRuntimeProfile && result.summary.runtimeProfileMissing) {
    violations.push({
      code: "runtime-profile-missing",
      message: "analysis ran without a resolved runtime profile; determinism verdict is unreliable",
    });
  }

  if (policy.failOnDegraded && result.metadata.degraded === true) {
    violations.push({
      code: "analysis-degraded",
      message: "compiler degraded; the model could not be fully analyzed",
    });
  }

  return {
    passed: violations.length === 0,
    policy,
    violations,
    findingCounts,
  };
};

const isGateLevel = (value: string): value is GateLevel =>
  (GATE_LEVELS as readonly string[]).includes(value);

/** Parses a `--fail-on` value, throwing on an unknown level. */
export const parseGateLevel = (value: string): GateLevel => {
  if (!isGateLevel(value)) {
    throw new Error(`unknown gate level "${value}"; expected one of ${GATE_LEVELS.join(", ")}`);
  }
  return value;
};

// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { allFindings, type CompilerResult, type Finding, type Severity } from "./result.js";
import type { GateVerdict } from "./gate.js";

/**
 * The determinism-profile report — the CLI's stable JSON output contract.
 *
 * It distills a compiler result down to what a terminal user or CI gate needs:
 * the inputs, the headline determinism verdict, the maturity quadrant signal,
 * and the findings. Consumers branch on `schema`/`schemaVersion`.
 */
export interface DeterminismProfileReport {
  readonly schema: "dpg.cli/determinism-profile";
  readonly schemaVersion: 2;
  readonly source: string;
  readonly profileId: string;
  readonly policyId: string;
  readonly governanceTier: string;
  readonly generatedAt: string;
  readonly verdict: {
    readonly determinismCompliance: boolean;
    readonly runtimeProfileMissing: boolean;
    readonly degraded: boolean;
  };
  readonly maturity: {
    readonly totalEvaluationPoints: number;
    /** Percentage of evaluation points that are deterministic (0–100). */
    readonly deterministicTotal: number;
    /** Percentage that are engine-portable (0–100). */
    readonly portableTotal: number;
  };
  readonly findings: {
    readonly errors: number;
    readonly warnings: number;
    readonly info: number;
    readonly items: readonly Finding[];
  };
  /** Present only when the report was produced as part of a gate run. */
  readonly gate?: {
    readonly passed: boolean;
    readonly failOn: string;
    readonly violations: readonly { readonly code: string; readonly message: string }[];
  };
}

export interface BuildReportInput {
  readonly source: string;
  readonly profileId: string;
  readonly policyId: string;
  readonly result: CompilerResult;
  readonly gate?: GateVerdict;
  /** Injectable clock for deterministic tests. */
  readonly now?: () => Date;
}

const countBySeverity = (result: CompilerResult): Record<Severity, number> => {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const finding of allFindings(result)) {
    counts[finding.severity] += 1;
  }
  return counts;
};

/** Assembles the report document from a compiler result. Pure. */
export const buildReport = (input: BuildReportInput): DeterminismProfileReport => {
  const now = input.now ?? (() => new Date());
  const { result } = input;
  const counts = countBySeverity(result);

  return {
    schema: "dpg.cli/determinism-profile",
    schemaVersion: 2,
    source: input.source,
    profileId: input.profileId,
    policyId: input.policyId,
    governanceTier: result.summary.governanceTier,
    generatedAt: now().toISOString(),
    verdict: {
      determinismCompliance: result.summary.determinismCompliance,
      runtimeProfileMissing: result.summary.runtimeProfileMissing,
      degraded: result.metadata.degraded === true,
    },
    maturity: {
      totalEvaluationPoints: result.summary.maturitySignal.totalEvaluationPoints,
      deterministicTotal: result.summary.maturitySignal.deterministicTotal,
      portableTotal: result.summary.maturitySignal.portableTotal,
    },
    findings: {
      errors: counts.error,
      warnings: counts.warning,
      info: counts.info,
      items: allFindings(result),
    },
    ...(input.gate
      ? {
          gate: {
            passed: input.gate.passed,
            failOn: input.gate.policy.failOn,
            violations: input.gate.violations.map((v) => ({ code: v.code, message: v.message })),
          },
        }
      : {}),
  };
};

const SEVERITY_TAG: Record<Severity, string> = {
  error: "ERROR",
  warning: "WARN ",
  info: "INFO ",
};

/** Renders the report as JSON. */
export const renderJson = (report: DeterminismProfileReport): string =>
  JSON.stringify(report, null, 2);

/** Renders the report as a compact, human-readable text block. */
export const renderText = (report: DeterminismProfileReport): string => {
  const lines: string[] = [];
  lines.push(`DPG determinism profile — ${report.source}`);
  lines.push(
    `  profile: ${report.profileId}   policy: ${report.policyId}   tier: ${report.governanceTier}`,
  );
  lines.push(
    `  determinism-compliant: ${report.verdict.determinismCompliance ? "yes" : "no"}` +
      (report.verdict.runtimeProfileMissing ? "   (runtime profile missing)" : "") +
      (report.verdict.degraded ? "   (analysis degraded)" : ""),
  );
  lines.push(
    `  maturity: ${report.maturity.deterministicTotal}% deterministic, ` +
      `${report.maturity.portableTotal}% portable ` +
      `(${report.maturity.totalEvaluationPoints} evaluation points)`,
  );
  lines.push(
    `  findings: ${report.findings.errors} error(s), ` +
      `${report.findings.warnings} warning(s), ${report.findings.info} info`,
  );
  for (const finding of report.findings.items) {
    const at = finding.targetId ? ` [${finding.targetId}]` : "";
    lines.push(`  ${SEVERITY_TAG[finding.severity]} ${finding.message}${at}`);
  }
  if (report.gate) {
    lines.push("");
    lines.push(`  gate (fail-on ${report.gate.failOn}): ${report.gate.passed ? "PASS" : "FAIL"}`);
    for (const violation of report.gate.violations) {
      lines.push(`    - ${violation.message}`);
    }
  }
  return lines.join("\n");
};

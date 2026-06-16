// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { DefaultAnalysisEngine, type AnalysisEngine } from "../engine.js";
import {
  DEFAULT_GATE_POLICY,
  evaluateGate,
  parseGateLevel,
  type GateLevel,
  type GatePolicy,
} from "../gate.js";
import { buildReport, renderJson, renderText } from "../report.js";
import type { CommandDeps, CommandIo, OutputFormat } from "./analyze.js";

export interface GateOptions {
  readonly profileId: string;
  readonly policyId: string;
  readonly format: OutputFormat;
  /** Severity at or above which the gate fails. */
  readonly failOn: GateLevel;
  /** When true, an unresolved runtime profile is tolerated. */
  readonly allowMissingProfile: boolean;
  readonly governanceTier?: string;
}

export const GATE_DEFAULTS: GateOptions = {
  profileId: "camunda-7",
  policyId: "baseline-tier-1",
  format: "text",
  failOn: DEFAULT_GATE_POLICY.failOn,
  allowMissingProfile: false,
};

const basename = (file: string): string => file.split(/[\\/]/).pop() ?? file;
const modelIdFor = (file: string): string => basename(file).replace(/\.[^.]+$/, "");

/**
 * Implements `dpg gate <file>` — the pipeline gate.
 *
 * Analyzes the model, evaluates it against the gate policy, prints the report,
 * and exits non-zero when the gate fails so CI stops the pipeline.
 *
 * @returns 0 when the gate passes, 1 when it fails, 2 on usage error.
 */
export const runGate = async (
  file: string | undefined,
  options: GateOptions,
  io: CommandIo,
  deps: CommandDeps = {},
): Promise<number> => {
  if (file === undefined || file.length === 0) {
    io.stderr("error: missing required argument <file>");
    io.stderr("usage: dpg gate <file> [--fail-on error|warning|info] [--allow-missing-profile]");
    return 2;
  }

  const engine: AnalysisEngine = deps.engine ?? new DefaultAnalysisEngine();
  let result;
  try {
    result = await engine.analyze({
      file,
      modelId: modelIdFor(file),
      profileId: options.profileId,
      policyId: options.policyId,
      governanceTier: options.governanceTier,
    });
  } catch (error) {
    io.stderr(`error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  const policy: GatePolicy = {
    ...DEFAULT_GATE_POLICY,
    failOn: options.failOn,
    requireRuntimeProfile: !options.allowMissingProfile,
  };
  const verdict = evaluateGate(result, policy);

  const report = buildReport({
    source: file,
    profileId: options.profileId,
    policyId: options.policyId,
    result,
    gate: verdict,
    now: deps.now,
  });
  io.stdout(options.format === "json" ? renderJson(report) : renderText(report));

  if (!verdict.passed) {
    io.stderr(`gate failed for ${file}:`);
    for (const violation of verdict.violations) {
      io.stderr(`  - [${violation.code}] ${violation.message}`);
    }
    return 1;
  }
  return 0;
};

export { parseGateLevel };

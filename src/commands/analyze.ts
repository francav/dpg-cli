// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { DefaultAnalysisEngine, type AnalysisEngine } from "../engine.js";
import { buildReport, renderJson, renderText } from "../report.js";

export type OutputFormat = "json" | "text";

export interface AnalyzeOptions {
  /** Runtime profile id to analyze against. Defaults to `camunda-7`. */
  readonly profileId: string;
  /** Governance policy id to analyze against. Defaults to `baseline-tier-1`. */
  readonly policyId: string;
  /** Output format. Defaults to `json`. */
  readonly format: OutputFormat;
  /** Optional governance tier passed through to the analysis engine. */
  readonly governanceTier?: string;
}

export const ANALYZE_DEFAULTS: AnalyzeOptions = {
  profileId: "camunda-7",
  policyId: "baseline-tier-1",
  format: "json",
};

export interface CommandIo {
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

export interface CommandDeps {
  readonly engine?: AnalysisEngine;
  readonly now?: () => Date;
}

const basename = (file: string): string => file.split(/[\\/]/).pop() ?? file;
const modelIdFor = (file: string): string => basename(file).replace(/\.[^.]+$/, "");

/**
 * Implements `dpg analyze <file>`.
 *
 * Runs the analysis engine over the process model (or a pre-computed compiler
 * result) and prints a determinism-profile report — JSON by default, or a
 * human-readable block with `--format text`.
 *
 * @returns a process exit code (0 on success, non-zero on usage/IO error).
 */
export const runAnalyze = async (
  file: string | undefined,
  options: AnalyzeOptions,
  io: CommandIo,
  deps: CommandDeps = {},
): Promise<number> => {
  if (file === undefined || file.length === 0) {
    io.stderr("error: missing required argument <file>");
    io.stderr("usage: dpg analyze <file> [--profile <id>] [--policy <id>] [--format json|text]");
    return 2;
  }

  const engine = deps.engine ?? new DefaultAnalysisEngine();
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
    return 1;
  }

  const report = buildReport({
    source: file,
    profileId: options.profileId,
    policyId: options.policyId,
    result,
    now: deps.now,
  });
  io.stdout(options.format === "text" ? renderText(report) : renderJson(report));
  return 0;
};

// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import {
  ANALYZE_DEFAULTS,
  runAnalyze,
  type CommandDeps,
  type CommandIo,
  type OutputFormat,
} from "./commands/analyze.js";
import { GATE_DEFAULTS, parseGateLevel, runGate } from "./commands/gate.js";

export const CLI_NAME = "dpg";

export type { DeterminismProfileReport } from "./report.js";
export { buildReport, renderJson, renderText } from "./report.js";
export type { CompilerResult, Finding } from "./result.js";
export { asCompilerResult } from "./result.js";
export { evaluateGate, DEFAULT_GATE_POLICY } from "./gate.js";
export type { GatePolicy, GateVerdict, GateLevel } from "./gate.js";
export type { AnalysisEngine, AnalyzeRequest } from "./engine.js";
export { DefaultAnalysisEngine } from "./engine.js";
export { runAnalyze } from "./commands/analyze.js";
export { runGate } from "./commands/gate.js";
export type { CommandIo, CommandDeps };

const usage = (): string =>
  [
    `usage: ${CLI_NAME} <command> [options]`,
    "",
    "commands:",
    "  analyze <file>   emit a determinism-profile report for a process model",
    "  gate <file>      fail (exit 1) when the model violates the gate policy",
    "  help             show this help",
    "",
    "common options:",
    `  --profile <id>   runtime profile id (default: ${ANALYZE_DEFAULTS.profileId})`,
    `  --policy <id>    governance policy id (default: ${ANALYZE_DEFAULTS.policyId})`,
    "  --format <fmt>   output format: json | text",
    "",
    "gate options:",
    `  --fail-on <lvl>  fail on this severity or stricter (default: ${GATE_DEFAULTS.failOn})`,
    "  --allow-missing-profile  do not fail when no runtime profile resolves",
    "",
    "An input ending in .json is treated as a pre-computed compiler result;",
    "BPMN/DMN models are analyzed via the optional @dpg/compiler-node engine.",
  ].join("\n");

/**
 * Pulls a `--flag value` pair out of an argument list, returning the value (or
 * undefined) and the remaining positional/unknown arguments.
 */
const takeOption = (args: string[], flag: string): [string | undefined, string[]] => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return [undefined, args];
  }
  const value = args[index + 1];
  const rest = [...args.slice(0, index), ...args.slice(index + 2)];
  return [value, rest];
};

/** Pulls a boolean `--flag` out of an argument list. */
const takeFlag = (args: string[], flag: string): [boolean, string[]] => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return [false, args];
  }
  return [true, [...args.slice(0, index), ...args.slice(index + 1)]];
};

const parseFormat = (value: string | undefined, fallback: OutputFormat): OutputFormat => {
  if (value === undefined) {
    return fallback;
  }
  if (value !== "json" && value !== "text") {
    throw new Error(`unknown format "${value}"; expected json or text`);
  }
  return value;
};

const firstPositional = (args: string[]): string | undefined =>
  args.find((arg) => !arg.startsWith("-"));

/**
 * Parses argv and dispatches to a command. This is the testable core of the
 * CLI; the `bin` wrapper only supplies `process.argv` and the exit code.
 *
 * @param argv arguments after the node executable and script (i.e. `argv.slice(2)`).
 * @returns the process exit code.
 */
export const run = async (
  argv: string[],
  io: CommandIo,
  deps: CommandDeps = {},
): Promise<number> => {
  const [command, ...rest] = argv;

  try {
    switch (command) {
      case undefined:
      case "help":
      case "--help":
      case "-h":
        io.stdout(usage());
        return 0;
      case "analyze": {
        const [profileId, a1] = takeOption(rest, "--profile");
        const [policyId, a2] = takeOption(a1, "--policy");
        const [format, a3] = takeOption(a2, "--format");
        return await runAnalyze(
          firstPositional(a3),
          {
            profileId: profileId ?? ANALYZE_DEFAULTS.profileId,
            policyId: policyId ?? ANALYZE_DEFAULTS.policyId,
            format: parseFormat(format, ANALYZE_DEFAULTS.format),
          },
          io,
          deps,
        );
      }
      case "gate": {
        const [profileId, a1] = takeOption(rest, "--profile");
        const [policyId, a2] = takeOption(a1, "--policy");
        const [format, a3] = takeOption(a2, "--format");
        const [failOn, a4] = takeOption(a3, "--fail-on");
        const [allowMissingProfile, a5] = takeFlag(a4, "--allow-missing-profile");
        return await runGate(
          firstPositional(a5),
          {
            profileId: profileId ?? GATE_DEFAULTS.profileId,
            policyId: policyId ?? GATE_DEFAULTS.policyId,
            format: parseFormat(format, GATE_DEFAULTS.format),
            failOn: failOn === undefined ? GATE_DEFAULTS.failOn : parseGateLevel(failOn),
            allowMissingProfile,
          },
          io,
          deps,
        );
      }
      default:
        io.stderr(`error: unknown command: ${command}`);
        io.stderr(usage());
        return 2;
    }
  } catch (error) {
    io.stderr(`error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
};

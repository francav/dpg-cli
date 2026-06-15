// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildProfile } from "../profile.js";

export interface AnalyzeOptions {
  /** Runtime profile id to analyze against. Defaults to `camunda-7`. */
  readonly profileId: string;
  /** Governance policy id to analyze against. Defaults to `baseline-tier-1`. */
  readonly policyId: string;
}

export const ANALYZE_DEFAULTS: AnalyzeOptions = {
  profileId: "camunda-7",
  policyId: "baseline-tier-1",
};

export interface CommandIo {
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

/**
 * Implements `dpg analyze <file>`.
 *
 * Reads the process file (failing clearly if it is missing) and prints a JSON
 * determinism profile to stdout. The profile is a stub in this scaffold; the
 * command surface, file handling, and output contract are real.
 *
 * @returns a process exit code (0 on success, non-zero on usage/IO error).
 */
export const runAnalyze = async (
  file: string | undefined,
  options: AnalyzeOptions,
  io: CommandIo,
): Promise<number> => {
  if (file === undefined || file.length === 0) {
    io.stderr("error: missing required argument <file>");
    io.stderr("usage: dpg analyze <file> [--profile <id>] [--policy <id>]");
    return 2;
  }

  const absolute = resolve(file);
  try {
    // Read to validate the file exists and is readable; the scaffold does not
    // yet parse it. A later work unit feeds the contents to the compiler.
    await readFile(absolute, "utf8");
  } catch {
    io.stderr(`error: cannot read process file: ${file}`);
    return 1;
  }

  const profile = buildProfile({
    source: file,
    profileId: options.profileId,
    policyId: options.policyId,
  });
  io.stdout(JSON.stringify(profile, null, 2));
  return 0;
};

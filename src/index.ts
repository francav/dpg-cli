// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França
import { ANALYZE_DEFAULTS, runAnalyze, type CommandIo } from "./commands/analyze.js";

export const CLI_NAME = "dpg";

export type { DeterminismProfile } from "./profile.js";
export { buildProfile } from "./profile.js";
export { runAnalyze } from "./commands/analyze.js";

const usage = (): string =>
  [
    `usage: ${CLI_NAME} <command> [options]`,
    "",
    "commands:",
    "  analyze <file>   emit a JSON determinism profile for a process file",
    "  help             show this help",
    "",
    "analyze options:",
    `  --profile <id>   runtime profile id (default: ${ANALYZE_DEFAULTS.profileId})`,
    `  --policy <id>    governance policy id (default: ${ANALYZE_DEFAULTS.policyId})`,
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

/**
 * Parses argv and dispatches to a command. This is the testable core of the
 * CLI; the `bin` wrapper only supplies `process.argv` and the exit code.
 *
 * @param argv arguments after the node executable and script (i.e. `argv.slice(2)`).
 * @returns the process exit code.
 */
export const run = async (argv: string[], io: CommandIo): Promise<number> => {
  const [command, ...rest] = argv;

  switch (command) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      io.stdout(usage());
      return 0;
    case "analyze": {
      const [profileId, afterProfile] = takeOption(rest, "--profile");
      const [policyId, positionals] = takeOption(afterProfile, "--policy");
      const file = positionals.find((arg) => !arg.startsWith("-"));
      return runAnalyze(
        file,
        {
          profileId: profileId ?? ANALYZE_DEFAULTS.profileId,
          policyId: policyId ?? ANALYZE_DEFAULTS.policyId,
        },
        io,
      );
    }
    default:
      io.stderr(`error: unknown command: ${command}`);
      io.stderr(usage());
      return 2;
  }
};

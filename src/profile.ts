// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Shape of the JSON determinism profile emitted by `dpg analyze`.
 *
 * This is the CLI's stable output contract. In this scaffold the profile is a
 * stub: it records the inputs and a not-yet-analyzed status. A later work unit
 * wires the real compiler in behind the same shape so consumers (and CI gates)
 * can depend on this surface today.
 */
export interface DeterminismProfile {
  /** Identifies the document shape so consumers can branch on version. */
  readonly schema: "dpg.cli/determinism-profile";
  /** Semantic version of the profile document shape. */
  readonly schemaVersion: 1;
  /** The analyzed source file, as given on the command line. */
  readonly source: string;
  /** Runtime profile id the analysis was run against. */
  readonly profileId: string;
  /** Governance policy id the analysis was run against. */
  readonly policyId: string;
  /**
   * Analysis status. The scaffold always reports `not-implemented`; a later
   * work unit replaces this with `analyzed` once the compiler is wired in.
   */
  readonly status: "not-implemented" | "analyzed";
  /** ISO-8601 timestamp of when the profile was generated. */
  readonly generatedAt: string;
}

export interface BuildProfileOptions {
  readonly source: string;
  readonly profileId: string;
  readonly policyId: string;
  /** Injectable clock for deterministic tests. */
  readonly now?: () => Date;
}

/**
 * Builds the stub determinism profile for a source file.
 *
 * Pure and side-effect free so it can be unit-tested without touching disk; the
 * `analyze` command is responsible for reading the file and printing the result.
 */
export const buildProfile = (options: BuildProfileOptions): DeterminismProfile => {
  const now = options.now ?? (() => new Date());
  return {
    schema: "dpg.cli/determinism-profile",
    schemaVersion: 1,
    source: options.source,
    profileId: options.profileId,
    policyId: options.policyId,
    status: "not-implemented",
    generatedAt: now().toISOString(),
  };
};

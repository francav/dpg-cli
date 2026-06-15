// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

/**
 * Local, structural view of the L2 compiler's public result boundary.
 *
 * The CLI is self-contained: it does not take a build-time dependency on the
 * compiler. Instead it models the *boundary contract* it consumes here, so the
 * report and gate logic type-check, build, and unit-test on their own (against
 * captured real compiler output). At runtime the analysis engine produces a
 * value of this shape — either by dynamically loading the compiler when it is
 * installed, or by reading a pre-computed result document.
 *
 * Only the fields the CLI actually reads are modeled; the real result carries
 * more. `unknown`-typed escape hatches keep us tolerant of compiler additions.
 */

export type Severity = "error" | "warning" | "info";

export interface Finding {
  readonly id: string;
  readonly category: string;
  readonly severity: Severity;
  readonly confidence?: number;
  readonly message: string;
  readonly targetId?: string;
  readonly policyClause?: string;
  readonly ruleId?: string;
  readonly remediation?: string;
}

export interface MaturitySignal {
  readonly totalEvaluationPoints: number;
  readonly deterministicTotal: number;
  readonly portableTotal: number;
  readonly deterministicAgnostic?: number;
  readonly deterministicBound?: number;
  readonly policyDependentAgnostic?: number;
  readonly policyDependentBound?: number;
  readonly nonDeterministicAgnostic?: number;
  readonly nonDeterministicBound?: number;
}

export interface ResultSummary {
  readonly structuralErrors: number;
  readonly semanticErrors: number;
  readonly warnings: number;
  readonly determinismCompliance: boolean;
  readonly runtimeProfileMissing: boolean;
  readonly contractCoverageRatio: number;
  readonly decisionAnalysisStatus: string;
  readonly governanceTier: string;
  readonly maturitySignal: MaturitySignal;
}

export interface ResultMetadata {
  readonly compilerVersion: string;
  readonly timestamp: string;
  readonly modelId: string;
  readonly policyId?: string;
  readonly policyVersion?: string;
  readonly runtimeProfileId?: string;
  readonly runtimeProfileVersion?: string;
  readonly governanceTier?: string;
  readonly degraded?: boolean;
  readonly inputHashes?: Readonly<Record<string, string>>;
}

export interface ContractCoverageEntry {
  readonly boundaryId: string;
  readonly missingContract?: boolean;
  readonly risk?: string;
}

/** Structural view of the compiler's `CompilerResult`. */
export interface CompilerResult {
  readonly metadata: ResultMetadata;
  readonly structuralFindings: readonly Finding[];
  readonly semanticFindings: readonly Finding[];
  readonly summary: ResultSummary;
  readonly contractCoverage?: readonly ContractCoverageEntry[];
  readonly [key: string]: unknown;
}

const SEVERITIES: ReadonlySet<string> = new Set<Severity>(["error", "warning", "info"]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFinding = (value: unknown): value is Finding =>
  isObject(value) &&
  typeof value.id === "string" &&
  typeof value.category === "string" &&
  typeof value.message === "string" &&
  typeof value.severity === "string" &&
  SEVERITIES.has(value.severity);

/**
 * Narrows an arbitrary parsed document to a {@link CompilerResult}, validating
 * the fields the CLI relies on. Used when reading a pre-computed result file so
 * a malformed document fails loudly instead of producing a bogus gate verdict.
 */
export const asCompilerResult = (value: unknown): CompilerResult => {
  if (!isObject(value)) {
    throw new Error("compiler result must be a JSON object");
  }
  if (!isObject(value.summary)) {
    throw new Error("compiler result is missing a `summary` object");
  }
  if (!isObject(value.metadata)) {
    throw new Error("compiler result is missing a `metadata` object");
  }
  if (!Array.isArray(value.structuralFindings) || !Array.isArray(value.semanticFindings)) {
    throw new Error(
      "compiler result must carry `structuralFindings` and `semanticFindings` arrays",
    );
  }
  for (const finding of [...value.structuralFindings, ...value.semanticFindings]) {
    if (!isFinding(finding)) {
      throw new Error("compiler result contains a malformed finding");
    }
  }
  return value as CompilerResult;
};

/** All findings (structural + semantic) flattened, in a stable order. */
export const allFindings = (result: CompilerResult): readonly Finding[] => [
  ...result.structuralFindings,
  ...result.semanticFindings,
];

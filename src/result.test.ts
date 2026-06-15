// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { describe, expect, it } from "vitest";
import { allFindings, asCompilerResult } from "./result.js";
import { loadResultFixture } from "./fixtures.test-helper.js";

describe("asCompilerResult", () => {
  it("accepts genuine captured compiler output", () => {
    expect(() => loadResultFixture("loan-preapproval")).not.toThrow();
  });

  it("flattens structural and semantic findings in order", () => {
    const result = loadResultFixture("loan-preapproval");
    expect(allFindings(result)).toHaveLength(
      result.structuralFindings.length + result.semanticFindings.length,
    );
  });

  it("rejects a non-object document", () => {
    expect(() => asCompilerResult(42)).toThrow(/must be a JSON object/);
  });

  it("rejects a document missing summary/metadata", () => {
    expect(() => asCompilerResult({ summary: {}, structuralFindings: [] })).toThrow();
    expect(() =>
      asCompilerResult({ summary: {}, metadata: {}, structuralFindings: [], semanticFindings: [] }),
    ).not.toThrow();
  });

  it("rejects a malformed finding", () => {
    expect(() =>
      asCompilerResult({
        summary: {},
        metadata: {},
        structuralFindings: [],
        semanticFindings: [{ id: "x", category: "c", message: "m", severity: "bogus" }],
      }),
    ).toThrow(/malformed finding/);
  });
});

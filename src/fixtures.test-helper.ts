// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { asCompilerResult, type CompilerResult } from "./result.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "test", "fixtures");

/**
 * Loads a captured real compiler-result vector from `test/fixtures`. These are
 * genuine `compileModel()` output (captured by the conformance suite), so the
 * report and gate are exercised against the real boundary, not a mock.
 */
export const loadResultFixture = (name: string): CompilerResult => {
  const raw = readFileSync(join(fixturesDir, `${name}.result.json`), "utf8");
  return asCompilerResult(JSON.parse(raw));
};

export const fixturePath = (name: string): string => join(fixturesDir, `${name}.result.json`);

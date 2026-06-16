// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { asCompilerResult, type CompilerResult } from "./result.js";

/** What the engine needs to analyze one process model. */
export interface AnalyzeRequest {
  /** Path to the BPMN/DMN model, or to a pre-computed compiler-result JSON. */
  readonly file: string;
  readonly modelId: string;
  readonly profileId: string;
  readonly policyId: string;
  readonly governanceTier?: string;
}

/**
 * Produces a {@link CompilerResult} for a request. The CLI depends on this
 * interface, never on a concrete compiler — so the report/gate are testable in
 * isolation and the heavy L2 dependency stays optional and swappable.
 */
export interface AnalysisEngine {
  analyze(request: AnalyzeRequest): Promise<CompilerResult>;
}

/**
 * Shape of the compiler entrypoint we load dynamically. Mirrors
 * `@dpg/compiler-node`'s `compileFromFiles` without importing it at build time.
 */
interface CompilerNodeModule {
  compileFromFiles(options: {
    modelId: string;
    governanceTier?: string;
    bpmnPath: string;
    dmnPath?: string;
  }): Promise<unknown>;
}

const COMPILER_MODULE = "@dpg/compiler-node";

const isDmn = (file: string): boolean => extname(file).toLowerCase() === ".dmn";
const isJson = (file: string): boolean => extname(file).toLowerCase() === ".json";

/**
 * Default engine. When the input is a pre-computed `*.json` compiler result it
 * is read and validated directly (zero dependencies — this is the path the
 * shipped CLI and its CI gate rely on). Otherwise it dynamically loads the
 * optional L2 compiler to analyze a BPMN/DMN model; if the compiler is not
 * installed it fails with an actionable message.
 */
export class DefaultAnalysisEngine implements AnalysisEngine {
  async analyze(request: AnalyzeRequest): Promise<CompilerResult> {
    const absolute = resolve(request.file);
    if (isJson(request.file)) {
      const text = await readFile(absolute, "utf8");
      return asCompilerResult(JSON.parse(text));
    }
    const compiler = await loadCompiler();
    const result = await compiler.compileFromFiles({
      modelId: request.modelId,
      governanceTier: request.governanceTier,
      bpmnPath: isDmn(request.file) ? request.file : absolute,
      dmnPath: isDmn(request.file) ? absolute : undefined,
    });
    return asCompilerResult(result);
  }
}

const loadCompiler = async (): Promise<CompilerNodeModule> => {
  try {
    const mod = (await import(COMPILER_MODULE)) as Partial<CompilerNodeModule>;
    if (typeof mod.compileFromFiles !== "function") {
      throw new Error("loaded module does not export compileFromFiles");
    }
    return mod as CompilerNodeModule;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `cannot analyze a BPMN/DMN model: the optional "${COMPILER_MODULE}" engine is not installed (${detail}).\n` +
        `Install it, or pass a pre-computed compiler-result JSON file to analyze.`,
    );
  }
};

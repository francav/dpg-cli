// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { describe, expect, it } from "vitest";
import { run } from "./index.js";
import type { CommandIo } from "./commands/analyze.js";
import type { AnalysisEngine } from "./engine.js";
import { loadResultFixture, fixturePath } from "./fixtures.test-helper.js";

interface Captured {
  readonly io: CommandIo;
  readonly out: string[];
  readonly err: string[];
}

const capture = (): Captured => {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: { stdout: (line) => out.push(line), stderr: (line) => err.push(line) },
  };
};

/** Engine that returns a fixed fixture, ignoring the request file. */
const fixtureEngine = (name: string): AnalysisEngine => ({
  analyze: async () => loadResultFixture(name),
});

const fixedClock = () => new Date("2026-01-01T00:00:00.000Z");

describe("run help", () => {
  it("prints usage for help and exits 0", async () => {
    const { io, out } = capture();
    expect(await run(["help"], io)).toBe(0);
    const text = out.join("\n");
    expect(text).toContain("usage: dpg");
    expect(text).toContain("analyze <file>");
    expect(text).toContain("gate <file>");
  });

  it("rejects an unknown command with exit code 2", async () => {
    const { io, err } = capture();
    expect(await run(["bogus"], io)).toBe(2);
    expect(err.join("\n")).toContain("unknown command");
  });
});

describe("run analyze", () => {
  it("requires a file argument", async () => {
    const { io, err } = capture();
    expect(await run(["analyze"], io)).toBe(2);
    expect(err.join("\n")).toContain("<file>");
  });

  it("emits a v2 determinism-profile report from a compiler result", async () => {
    const { io, out } = capture();
    const code = await run(["analyze", "loan-preapproval.bpmn"], io, {
      engine: fixtureEngine("loan-preapproval"),
      now: fixedClock,
    });
    expect(code).toBe(0);
    const report = JSON.parse(out.join("\n")) as Record<string, unknown>;
    expect(report.schema).toBe("dpg.cli/determinism-profile");
    expect(report.schemaVersion).toBe(2);
    expect(report.source).toBe("loan-preapproval.bpmn");
    expect((report.verdict as Record<string, unknown>).determinismCompliance).toBe(true);
    expect((report.findings as Record<string, unknown>).warnings).toBe(5);
  });

  it("renders text output with --format text", async () => {
    const { io, out } = capture();
    const code = await run(["analyze", "x.bpmn", "--format", "text"], io, {
      engine: fixtureEngine("loan-preapproval"),
      now: fixedClock,
    });
    expect(code).toBe(0);
    const text = out.join("\n");
    expect(text).toContain("DPG determinism profile");
    expect(text).toContain("determinism-compliant: yes");
  });

  it("reads a pre-computed compiler-result JSON via the default engine", async () => {
    const { io, out } = capture();
    const code = await run(["analyze", fixturePath("runtime-bound")], io, { now: fixedClock });
    expect(code).toBe(0);
    const report = JSON.parse(out.join("\n")) as Record<string, unknown>;
    expect((report.findings as Record<string, unknown>).warnings).toBe(0);
  });

  it("fails with exit 1 when the input cannot be read", async () => {
    const { io, err } = capture();
    expect(await run(["analyze", "missing.json"], io)).toBe(1);
    expect(err.join("\n")).toContain("error:");
  });

  it("rejects an unknown --format with exit 2", async () => {
    const { io, err } = capture();
    expect(await run(["analyze", "x.bpmn", "--format", "yaml"], io)).toBe(2);
    expect(err.join("\n")).toContain("unknown format");
  });
});

describe("run gate", () => {
  it("fails (exit 1) when warnings are present at the default fail-on level", async () => {
    const { io, out, err } = capture();
    const code = await run(["gate", "loan.bpmn"], io, {
      engine: fixtureEngine("loan-preapproval"),
      now: fixedClock,
    });
    expect(code).toBe(1);
    expect(out.join("\n")).toContain("gate (fail-on warning): FAIL");
    expect(err.join("\n")).toContain("gate failed");
  });

  it("passes (exit 0) for the same model when --fail-on error", async () => {
    const { io, out } = capture();
    const code = await run(["gate", "loan.bpmn", "--fail-on", "error"], io, {
      engine: fixtureEngine("loan-preapproval"),
      now: fixedClock,
    });
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("gate (fail-on error): PASS");
  });

  it("passes (exit 0) for a clean, determinism-compliant model", async () => {
    const { io } = capture();
    const code = await run(["gate", "ok.bpmn"], io, {
      engine: fixtureEngine("runtime-bound"),
      now: fixedClock,
    });
    expect(code).toBe(0);
  });

  it("emits a JSON report carrying the gate verdict with --format json", async () => {
    const { io, out } = capture();
    await run(["gate", "loan.bpmn", "--format", "json"], io, {
      engine: fixtureEngine("loan-preapproval"),
      now: fixedClock,
    });
    const report = JSON.parse(out.join("\n")) as Record<string, unknown>;
    const gate = report.gate as Record<string, unknown>;
    expect(gate.passed).toBe(false);
    expect(gate.failOn).toBe("warning");
    expect(Array.isArray(gate.violations)).toBe(true);
  });

  it("rejects an unknown --fail-on level with exit 2", async () => {
    const { io, err } = capture();
    expect(await run(["gate", "x.bpmn", "--fail-on", "critical"], io)).toBe(2);
    expect(err.join("\n")).toContain("unknown gate level");
  });

  it("requires a file argument", async () => {
    const { io, err } = capture();
    expect(await run(["gate"], io)).toBe(2);
    expect(err.join("\n")).toContain("<file>");
  });
});

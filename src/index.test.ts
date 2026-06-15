// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildProfile, run } from "./index.js";
import type { CommandIo } from "./commands/analyze.js";

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

describe("buildProfile", () => {
  it("produces a stub profile with the inputs and a fixed clock", () => {
    const profile = buildProfile({
      source: "process.bpmn",
      profileId: "camunda-7",
      policyId: "baseline-tier-1",
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(profile).toEqual({
      schema: "dpg.cli/determinism-profile",
      schemaVersion: 1,
      source: "process.bpmn",
      profileId: "camunda-7",
      policyId: "baseline-tier-1",
      status: "not-implemented",
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("run", () => {
  it("prints usage for help and exits 0", async () => {
    const { io, out } = capture();
    expect(await run(["help"], io)).toBe(0);
    const text = out.join("\n");
    expect(text).toContain("usage: dpg");
    expect(text).toContain("analyze <file>");
  });

  it("rejects an unknown command with exit code 2", async () => {
    const { io, err } = capture();
    expect(await run(["bogus"], io)).toBe(2);
    expect(err.join("\n")).toContain("unknown command");
  });

  it("requires a file argument for analyze", async () => {
    const { io, err } = capture();
    expect(await run(["analyze"], io)).toBe(2);
    expect(err.join("\n")).toContain("<file>");
  });

  it("fails with exit 1 when the file cannot be read", async () => {
    const { io, err } = capture();
    expect(await run(["analyze", "does-not-exist.bpmn"], io)).toBe(1);
    expect(err.join("\n")).toContain("cannot read");
  });
});

describe("run analyze (integration)", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "dpg-cli-"));
    file = join(dir, "process.bpmn");
    await writeFile(file, "<definitions/>", "utf8");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("emits a JSON determinism profile for a readable file", async () => {
    const { io, out } = capture();
    expect(await run(["analyze", file], io)).toBe(0);
    const parsed = JSON.parse(out.join("\n")) as Record<string, unknown>;
    expect(parsed.schema).toBe("dpg.cli/determinism-profile");
    expect(parsed.source).toBe(file);
    expect(parsed.profileId).toBe("camunda-7");
    expect(parsed.policyId).toBe("baseline-tier-1");
    expect(parsed.status).toBe("not-implemented");
  });

  it("honors --profile and --policy overrides", async () => {
    const { io, out } = capture();
    expect(
      await run(["analyze", file, "--profile", "camunda-8", "--policy", "baseline-tier-2"], io),
    ).toBe(0);
    const parsed = JSON.parse(out.join("\n")) as Record<string, unknown>;
    expect(parsed.profileId).toBe("camunda-8");
    expect(parsed.policyId).toBe("baseline-tier-2");
  });
});

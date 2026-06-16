// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França

import { describe, expect, it } from "vitest";
import { buildReport, renderJson, renderText } from "./report.js";
import { evaluateGate } from "./gate.js";
import { loadResultFixture } from "./fixtures.test-helper.js";

const fixedClock = () => new Date("2026-01-01T00:00:00.000Z");

describe("buildReport", () => {
  it("distills a real compiler result into the v2 report contract", () => {
    const report = buildReport({
      source: "loan-preapproval.bpmn",
      profileId: "camunda-7",
      policyId: "baseline-tier-2",
      result: loadResultFixture("loan-preapproval"),
      now: fixedClock,
    });
    expect(report.schema).toBe("dpg.cli/determinism-profile");
    expect(report.schemaVersion).toBe(2);
    expect(report.governanceTier).toBe("tier-2");
    expect(report.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(report.verdict.determinismCompliance).toBe(true);
    expect(report.maturity.totalEvaluationPoints).toBe(9);
    expect(report.findings.warnings).toBe(5);
    expect(report.findings.info).toBe(1);
    expect(report.findings.items).toHaveLength(6);
    expect(report.gate).toBeUndefined();
  });

  it("embeds the gate verdict when a gate result is supplied", () => {
    const result = loadResultFixture("loan-preapproval");
    const report = buildReport({
      source: "loan-preapproval.bpmn",
      profileId: "camunda-7",
      policyId: "baseline-tier-2",
      result,
      gate: evaluateGate(result),
      now: fixedClock,
    });
    expect(report.gate?.passed).toBe(false);
    expect(report.gate?.failOn).toBe("warning");
  });
});

describe("renderers", () => {
  it("renderJson round-trips", () => {
    const report = buildReport({
      source: "x.bpmn",
      profileId: "camunda-7",
      policyId: "baseline-tier-1",
      result: loadResultFixture("runtime-bound"),
      now: fixedClock,
    });
    expect(JSON.parse(renderJson(report))).toEqual(report);
  });

  it("renderText is human-readable and lists findings", () => {
    const report = buildReport({
      source: "loan.bpmn",
      profileId: "camunda-7",
      policyId: "baseline-tier-2",
      result: loadResultFixture("loan-preapproval"),
      now: fixedClock,
    });
    const text = renderText(report);
    expect(text).toContain("DPG determinism profile — loan.bpmn");
    expect(text).toContain("findings: 0 error(s), 5 warning(s), 1 info");
    expect(text).toContain("WARN");
  });
});

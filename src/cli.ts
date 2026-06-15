#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Victor França
import { run } from "./index.js";

const exitCode = await run(process.argv.slice(2), {
  stdout: (line) => process.stdout.write(`${line}\n`),
  stderr: (line) => process.stderr.write(`${line}\n`),
});

process.exitCode = exitCode;

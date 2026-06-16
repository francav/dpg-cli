# @dpg/cli

Command-line tools for **Deterministic Process Governance (DPG)** — analyze process models and gate
pipelines on behavioral-predictability criteria from the terminal or CI.

## Commands

```sh
dpg analyze <file> [--profile <id>] [--policy <id>] [--format json|text]
dpg gate <file> [--fail-on error|warning|info] [--allow-missing-profile] [--format text|json]
dpg help
```

### `analyze`

Produces a **determinism-profile report** for a process model: the inputs, the determinism verdict,
the maturity quadrant signal (deterministic / portable percentages), and the findings. Output is JSON
by default (the stable `dpg.cli/determinism-profile` v2 contract) or a human-readable block with
`--format text`.

### `gate`

Runs `analyze`, then evaluates the result against a **gate policy** and **exits non-zero** when the
model violates it — so a CI pipeline stops on governance regressions. The gate fails when:

- any finding at or above `--fail-on` is present (default `warning`),
- the model is not determinism-compliant for its governance tier,
- the analysis ran without a resolved runtime profile (unless `--allow-missing-profile`).

Exit codes: `0` the gate passes, `1` the gate fails, `2` a usage or analysis error.

## Inputs

The CLI is self-contained. An input ending in `.json` is treated as a pre-computed compiler-result
document and gated directly — the zero-dependency path used in CI. To analyze a `.bpmn` / `.dmn`
model directly, install the optional `@dpg/compiler-node` engine alongside the CLI; the CLI loads it
on demand.

## GitHub Action

This repo ships a composite action under [`action/`](./action) that runs the gate in a workflow:

```yaml
- run: npm install -g @dpg/cli
- uses: francav/dpg-cli/action@main
  with:
    files: process/model.bpmn
    fail-on: warning
```

See [`examples/sample-repo`](./examples/sample-repo) for a worked CI example that gates a sample repo.

## Develop

Requires Node.js >= 20 and npm.

```sh
npm install
npm run build
npm test
```

## License

[Apache-2.0](./LICENSE). Copyright 2026 Victor França.

## Contributing

A contribution guide will follow.

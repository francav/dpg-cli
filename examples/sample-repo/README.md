# Sample repo — DPG determinism gate

A minimal example showing how the **Deterministic Process Governance (DPG)** CLI gates a repository's
process models in CI. The repo-level workflow `.github/workflows/gate-sample.yml` builds and links the
CLI, then runs `dpg gate` over the artifacts in [`process/`](./process):

- `runtime-bound.result.json` — a clean, determinism-compliant model. The gate **passes**.
- `loan-preapproval.result.json` — a model that carries governance warnings. The gate **fails** at the
  default level (`--fail-on warning`) and **passes** when only errors should block (`--fail-on error`).

The files here are pre-computed compiler-result documents, so the gate runs with zero heavyweight
dependencies — the realistic CI path. To gate BPMN/DMN models directly, install the optional
`@dpg/compiler-node` engine alongside the CLI and point `dpg gate` at the `.bpmn` / `.dmn` file.

## Run it locally

```sh
# from the repo root, after `npm ci && npm run build && npm link`
dpg gate examples/sample-repo/process/runtime-bound.result.json
dpg gate examples/sample-repo/process/loan-preapproval.result.json            # exits 1
dpg gate examples/sample-repo/process/loan-preapproval.result.json --fail-on error
```

## Use the GitHub Action

```yaml
- uses: actions/checkout@v4
- run: npm install -g @dpg/cli
- uses: francav/dpg-cli/action@main
  with:
    files: process/loan-preapproval.result.json
    fail-on: warning
```

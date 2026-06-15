# @dpg/cli

Command-line tools for **Deterministic Process Governance (DPG)** — analyze process models and gate
pipelines on behavioral-predictability criteria from the terminal or CI.

## Status

Early development (0.1.0). The command surface is scaffolded: `dpg analyze <file>` reads a process
file and emits a JSON determinism profile. The profile is currently a stub (`status:
"not-implemented"`); a later release wires in the analysis behind the same output contract.

## Usage

```sh
dpg analyze <file> [--profile <id>] [--policy <id>]
dpg help
```

`analyze` validates that the process file is readable and prints a JSON determinism profile to
stdout. `--profile` selects the runtime profile id (default `camunda-7`) and `--policy` selects the
governance policy id (default `baseline-tier-1`).

Exit codes: `0` success, `1` the file cannot be read, `2` a usage error.

## Develop

Requires Node.js >= 18 and npm.

```sh
npm install
npm run build
npm test
```

## License

[Apache-2.0](./LICENSE). Copyright 2026 Victor França.

## Contributing

A contribution guide will follow.

# Tooling notes

## Formatter decision for this skeleton

ADR 0050 records Oxlint + Oxfmt as the initial preference, with a fallback if the Oxc formatter path creates workflow or compatibility risk.

For this implementation skeleton:

- `pnpm lint` uses Oxlint.
- `pnpm format` and `pnpm format:check` use Prettier.

Reason: Oxfmt is not yet wired as a stable standalone workspace formatter in this repository, while the immediate completion condition requires a deterministic format gate across TypeScript, React, CSS, Markdown, YAML, and GitHub Actions workflow files. Prettier is used as a conservative formatter fallback for the skeleton so CI can enforce a no-diff format gate now.

This does not change ADR 0050's preferred direction. Revisit Oxfmt once the repository can pin and run it consistently for all relevant file types without weakening `pnpm format:check`.

## Biome fallback condition

If Oxlint plus the chosen formatter creates repeated CI instability, unsupported file coverage, or editor integration friction, switch lint/format tooling to Biome in a dedicated tooling change. Do not mix multiple formatters over the same file set.

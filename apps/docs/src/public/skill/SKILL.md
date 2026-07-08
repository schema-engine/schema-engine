---
name: schema-engine
description: |
  Schema Engine is a JSON-driven form layer for the Ecopages framework.
  Use this skill when an agent is asked to scaffold, configure, validate,
  or extend Schema Engine projects — including the @schema-engine/forms,
  @schema-engine/forms-react, @schema-engine/actions, and
  @schema-engine/registry packages.
---

# Schema Engine

Schema Engine turns form definitions into a single source of truth: type-safe,
Zod-validated, and powered by your existing component library.

## Repository

- https://github.com/andeeplus/schema-engine
- License: MIT
- Built on: Ecopages, TypeScript, React, Zod

## Packages

| Package | Role |
| --- | --- |
| `@schema-engine/forms` | Headless form engine: JSON config, validation rules, constraint logic |
| `@schema-engine/forms-react` | React adapter: components, layouts, steppers, hooks |
| `@schema-engine/actions` | Domain-agnostic sequential action system |
| `@schema-engine/registry` | Base registry used by the other packages |

## Documentation map

The canonical documentation is at `/docs` on the deployed site and lives
under `src/content/docs/` in the repository. The catch-all page renders any
`/docs/<section>/<slug>` URL.

| Section | Path prefix |
| --- | --- |
| Getting started | `/docs/getting-started` |
| `@schema-engine/forms` | `/docs/packages/forms` |
| `@schema-engine/forms-react` | `/docs/packages/forms-react` |
| `@schema-engine/actions` | `/docs/packages/actions` |
| `@schema-engine/registry` | `/docs/packages/registry` |
| Examples | `/docs/examples` |

For machine consumption, the full LLM-exported corpus lives at
`/llms.txt` (index) and `/docs-llm/<section>/<slug>.md` (page bodies).

## Reference skills

- `reference/getting-started.md` — install, configure, first form
- `reference/core.md` — JSON config, validation rules, constraints
- `reference/integrations.md` — React adapter, RHF bridge, layouts, steppers
- `reference/processors-and-plugins.md` — action plugins, custom validators
- `reference/server.md` — server-rendered form submission
- `reference/styling.md` — Tailwind, shadcn, theming
- `reference/full-stack.md` — end-to-end sample apps

## Building locally

```bash
bun install
bun dev
```

The docs site runs on port 3000.

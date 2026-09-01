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

| Package                      | Role                                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| `@schema-engine/forms`       | Headless form engine: JSON config, validation rules, constraint logic |
| `@schema-engine/forms-react` | React adapter: components, view recipes, hooks                        |
| `@schema-engine/actions`     | Domain-agnostic sequential action system                              |
| `@schema-engine/registry`    | Base registry used by the other packages                              |

## Documentation map

The canonical documentation is at `/docs` on the deployed site and lives
under `src/content/docs/` in the repository. The catch-all page renders any
`/docs/<section>/<slug>` URL.

| Section                      | Path prefix                          |
| ---------------------------- | ------------------------------------ |
| Getting started              | `/docs/getting-started/introduction` |
| `@schema-engine/forms`       | `/docs/forms/overview`               |
| `@schema-engine/forms-react` | `/docs/forms-react/overview`         |
| `@schema-engine/actions`     | `/docs/actions/overview`             |
| `@schema-engine/registry`    | `/docs/registry/overview`            |
| Examples                     | `/docs/examples/basic-form`          |

For machine consumption, the full LLM-exported corpus lives at
`/llms.txt` (index) and `/llms-content/<section>/<slug>.txt` (page bodies).

## Reference

- `reference/getting-started.md` — repository layout, docs workflow, and live previews

## Building locally

```bash
bun install
bun dev
```

The docs site runs on port 3000.

---
name: schema-engine
description: |
    Schema Engine is a JSON-driven, type-safe form system. Use this skill when
    an agent is asked to scaffold, configure, validate, or extend Schema Engine
    projects — including @schema-engine/forms, @schema-engine/forms-react,
    @schema-engine/forms-radiant, @schema-engine/actions, and
    @schema-engine/registry.
---

# Schema Engine

Schema Engine turns form definitions into a single source of truth: type-safe,
Zod Mini-validated, and powered by your existing component library.

## Repository

- https://github.com/andeeplus/schema-engine
- License: MIT
- Built on: TypeScript, React, Zod Mini, and Standard Schema registrations. The docs app uses Ecopages.

## Packages

| Package                        | Role                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `@schema-engine/forms`         | Headless engine: JSON config, validation, constraints, recipe specs                    |
| `@schema-engine/forms-react`   | React adapter: renderer, hooks, RHF bridge. No default visual recipes                  |
| `@schema-engine/forms-radiant` | Radiant adapter: renderer plus in-package recipes bound by `createRadiantFormEngine()` |
| `@schema-engine/actions`       | Domain-agnostic sequential action system                                               |
| `@schema-engine/registry`      | Base registry used by the other packages                                               |

React default shells and blocks live in the shadcn registry item
`schema-engine-form-recipes` (source: `registry/shared/forms/recipes`). Specs
live in `@schema-engine/forms/recipes`.

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
pnpm install
pnpm dev:docs
```

# Schema Engine — getting started skill

This skill is the entry point for an agent working with the Schema
Engine repository. Read it first.

## What this repo is

Schema Engine is a JSON-driven form system. Visual chrome is not in the
core engine: specs live in `@schema-engine/forms/recipes`, React
implementations in the shadcn registry, Radiant implementations in
`@schema-engine/forms-radiant`.

First-party packages:

- `forms` — headless engine: JSON config, validation, constraints, recipe specs
- `forms-react` — React adapter: renderer, hooks, RHF bridge. Headless factory (no default recipes)
- `forms-radiant` — Radiant adapter: renderer plus in-package recipes
- `actions` — domain-agnostic sequential action execution
- `registry` — base registry used by the other packages

## Repo layout

```
schema-engine/
├── apps/
│   └── docs/        # Ecopages docs site
├── packages/
│   ├── actions/
│   ├── forms/
│   ├── forms-react/
│   ├── forms-radiant/
│   └── registry/
└── registry/        # shadcn catalogs (elements + default React recipes)
```

The docs app uses `@ecopages/ecopages-jsx`. MDX pages include interactive
form islands backed by one shared engine in
`apps/docs/src/lib/form-engine-setup.ts`.

## First 60 seconds

1. `pnpm install`
2. `pnpm dev:docs` to start the docs site

## When you reach for the docs site

- Pages are MDX files under `apps/docs/src/content/docs/`.
  Frontmatter `group` and `order` control the sidebar.
- The catch-all route is `apps/docs/src/pages/docs/[...slug]/index.tsx`.
- For code examples, prefer real config snippets. Interactive previews use
  `FormRendererIsland` and `apps/docs/src/lib/form-engine-setup.ts`.
- View recipe source for agents: `registry/shared/forms/recipes`.
  The View recipes page also has copy tabs, which are not in `llms.txt`.

## Wiring a form into the docs app

- The single form engine instance lives at `apps/docs/src/lib/form-engine-setup.ts`.
- Register elements and recipes explicitly:
  `createReactFormComposer().addElements(...).addRecipes(...).build()`.
- Form elements and React recipes come from `registry/shared/forms`,
  aliased as `@/components/schema-engine/forms/*`.
- The shadcn primitives those sources import (`@/components/ui/*`) are not
  owned by this repo. `registry/ui-stubs` stands in for typecheck and tests.

## More

- The full docs site lives at `/docs`.
- LLM exports are at `/llms.txt` and `/llms-content/<section>/<slug>.txt`.
- The Ecopages framework docs are at <https://ecopages.app/docs>.

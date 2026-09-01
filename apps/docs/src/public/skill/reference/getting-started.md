# Schema Engine — getting started skill

This skill is the entry point for an agent working with the Schema
Engine repository. Read it first.

## What this repo is

Schema Engine is a JSON-driven form layer on top of the Ecopages
framework. The repository currently contains one docs app and four first-party packages:

- `forms` — headless form engine: JSON config, validation rules,
  constraint logic.
- `forms-react` — React adapter: components, view recipes, hooks,
  React Hook Form bridge.
- `actions` — domain-agnostic sequential action execution system.
- `registry` — base registry used by the other three packages.

## Repo layout

```
schema-engine/
├── apps/
│   └── docs/     # Ecopages docs site: this app
└── packages/
    ├── actions/   # @schema-engine/actions
    ├── forms/     # @schema-engine/forms
    ├── forms-react/  # @schema-engine/forms-react
    └── registry/  # @schema-engine/registry
```

The `/docs` app uses the JSX plugin (`@ecopages/ecopages-jsx`). Its MDX
pages include interactive form islands backed by one shared engine setup.

## First 60 seconds

1. `pnpm install`
2. `cd apps/docs && pnpm dev` to start the docs site

## When you reach for the docs site

- Pages are MDX files under `apps/docs/src/content/docs/`.
  Frontmatter `group` and `order` control the sidebar.
- The catch-all route is `apps/docs/src/pages/docs/[...slug]/index.tsx`.
  The Ecopages content collection discovers new MDX files automatically.
- For code examples, prefer real config snippets. Interactive previews use
  `FormRendererIsland` and the shared setup in
  `apps/docs/src/lib/form-engine-setup.ts`.

## Wiring a form into the docs app

- The single form engine instance lives at `apps/docs/src/lib/form-engine-setup.ts`. Every demo imports it.
- New components go through the builder: `createReactFormComposer().addElement(...).build()`.
- Form elements come from the registry sources in `registry/shared/forms`, aliased as
  `@/components/schema-engine/forms/*`.
- The shadcn primitives those elements import (`@/components/ui/*`) are not owned by this repo. `registry/ui-stubs`
  stands in for them so the registry can be typechecked and unit-tested; an app that renders forms needs a real shadcn
  install.

## More

- The full docs site lives at `/docs`.
- LLM exports are at `/llms.txt` and `/llms-content/<section>/<slug>.txt`.
- The Ecopages framework docs are at <https://ecopages.app/docs>.

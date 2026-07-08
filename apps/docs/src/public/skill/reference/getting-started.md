# Schema Engine — getting started skill

This skill is the entry point for an agent working with the Schema
Engine monorepo. Read it first.

## What this repo is

Schema Engine is a JSON-driven form layer on top of the Ecopages
framework. The monorepo has four first-party packages:

- `forms` — headless form engine: JSON config, validation rules,
  constraint logic.
- `forms-react` — React adapter: components, layouts, steppers, hooks,
  React Hook Form bridge.
- `actions` — domain-agnostic sequential action execution system.
- `registry` — base registry used by the other three packages.

## Repo layout

```
schema-engine/
├── apps/
│   ├── www/      # React app: live demos, marketing pages
│   └── docs/     # Ecopages docs site: this app
└── packages/
    ├── actions/   # @schema-engine/actions
    ├── forms/     # @schema-engine/forms
    ├── forms-react/  # @schema-engine/forms-react
    └── registry/  # @schema-engine/registry
```

The `/www` app uses the React plugin (`@ecopages/react`) and renders
live form demos. The `/docs` app uses the JSX plugin
(`@ecopages/ecopages-jsx`) and is body-only — the docs site shows the
JSON config in MDX and links to `/www` for the running form.

## First 60 seconds

1. `bun install`
2. `bun run dev:www` to start the React app (the one with the live forms)
3. `cd apps/docs && bun run dev` to start the docs site

## When you reach for the docs site

- The manifest lives at `apps/docs/src/content/docs/content.meta.ts`.
  Edit it to add, remove, or reorder pages.
- The catch-all route is `apps/docs/src/pages/docs/[...slug]/index.tsx`.
  One source of truth, single static path table.
- New MDX files need to be:
  1. Imported in `apps/docs/src/content/docs/content.ts`.
  2. Listed in `content.meta.ts` with a section, slug, title, description.
- For code examples, prefer real config snippets over `LivePreview` /
  `CodePreview` components — the docs site can't run React during SSR.

## When you reach for the www app

- The single form engine instance lives at
  `apps/www/src/lib/form-engine-setup.ts`. Every demo imports it.
- New components go through the builder: `createReactFormComposer().addElement(...).build()`.
- The shadcn UI primitives live under `apps/www/src/components/ui/*` —
  there are 48 of them. Don't bring them into the docs app.

## More

- The full docs site lives at `/docs` in any running app.
- LLM exports are at `/llms.txt` and `/docs-llm/<section>/<slug>.md`.
- The Ecopages framework docs are at <https://ecopages.app/docs>.

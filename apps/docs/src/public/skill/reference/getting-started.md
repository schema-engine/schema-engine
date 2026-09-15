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

The docs app uses `@ecopages/ecopages-jsx` for the site chrome. Forms React
previews mount through a client island, same pattern as Radiant.

## First 60 seconds

1. `pnpm install`
2. `pnpm dev:docs` to start the docs site

## When you reach for the docs site

- Pages are MDX files under `apps/docs/src/content/docs/`.
  Frontmatter `group` and `order` control the sidebar.
- The catch-all route is `apps/docs/src/pages/docs/[...slug]/index.tsx`.
- For code examples, prefer real config snippets. Default interactive previews
  use Radiant `FormRendererPreview` with a `FormConfig` from
  `apps/docs/src/lib/form-configs/` (`FormConfigCode` serializes the
  same object for the snippet). Forms React pages use `ReactFormPreview`, the
  Radiant-styled demo kit in `apps/docs/src/components/react-form-demo/`,
  importing the same shared configs when the demo matches another page.
- View recipe source for agents: `registry/shared/forms/recipes`.
  The View recipes page also has copy tabs, which are not in `llms.txt`.

## Wiring a form into the docs app

- The default Radiant form engine instance lives at
  `apps/docs/src/lib/form-engine-setup.ts` and is created with
  `createRadiantFormEngine({ elements: schemaFormRegistrations, actions })`.
  Demo action plugins are shared with Forms React via
  `apps/docs/src/lib/docs-demo-actions.ts`.
- The Forms React preview engine lives at
  `apps/docs/src/components/react-form-demo/demo-engine.ts`.
  Forms React MDX entries import `ReactFormPreview`, which client-mounts
  `FormRenderer` from `@schema-engine/forms-react` as a React island.
- Custom fields use `defineInput({ $type, schema, metadata, render })`.
  Authors supply schema input; the component receives schema output.
- Custom containers declare `elements: elementChildrenSchema` and render with
  `<FormElements elements={config.elements} namePrefix={config.name} />`.
  Field paths are a render-time scope; do not clone child configs.
- Form elements and React recipes come from `registry/shared/forms`,
  aliased as `@/components/schema-engine/forms/*`. `@/components/ui/*` resolves
  to the Forms React Storybook kit for those previews.
- The catch-all docs route registers island scripts and styles from each MDX
  entry's imports, so Forms React pages do not load Radiant preview assets
  and vice versa.

## More

- The full docs site lives at `/docs`.
- LLM exports are at `/llms.txt` and `/llms-content/<section>/<slug>.txt`.
- The Ecopages framework docs are at <https://ecopages.app/docs>.

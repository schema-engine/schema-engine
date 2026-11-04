# Docs

EcoPages docs site with EcoPages JSX MDX content and Radiant UI chrome.

The Ecopages 0.6 CLI requires Node.js 24 or newer.

## Structure

- `src/content/docs/**` — EcoPages JSX MDX entries with frontmatter (`title`, `description`, `group`, `order`), including Radiant and React demos. The Capabilities group documents cross-adapter behavior; recipes remain layout-only. Imported eco components and CSS are discovered automatically from top-level MDX imports; no `config.dependencies` block is needed. `FormRendererPreview` is a regular JSX page component (default integration, not an island): the form tree SSRs as light DOM and the base and docs layout client scripts bind its live engine after initial load and client-side navigation. React demos (`/docs/forms-react/**`) mount `ReactFormPreview` from `src/components/react-form-demo/` as React islands. Shared demo configurations live in `src/lib/form-configs/` (one module per form story; import the same object from multiple MDX pages when the demo is identical). Pages pass that object to live previews and `FormConfigCode`, which serializes it for the snippet, so demos and examples cannot drift. `.radiant.mdx` and `.react.mdx` are explicit MDX flavors for Radiant and React content. Typed in-app authoring is documented under Forms → Core concepts (Authoring modes) and Form engine setup (`defineForm` vs portable JSON).
- `src/lib/docs-nav.ts` — grouped navigation from content entries.
- `src/layouts/docs-layout` — shared Radiant UI sidebar, TOC, and pagination.
- `src/pages/docs/[...slug]/index.tsx` — catch-all route for MDX content.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm generate:llms
pnpm check-types
pnpm test:e2e
```

`pnpm check-types` builds the site first, because the content processor writes the
`ecopages:content/*` module types during the build, then type-checks `src` and
`test`. Root `pnpm build:lib` runs it through `turbo check-types`, so it builds
the site too. Unused components that no longer type-check are excluded in `tsconfig.json`.

`pnpm test:e2e` builds the site, serves the production preview on a free port, and
runs Playwright checks that the getting-started Forms React embed ships its
serialized config, hydrates, keeps typed values, and surfaces validation after
submit, and that the Radiant previews on the homepage and sequential-actions page submit and reset after direct or client-side navigation. Set `DOCS_E2E_BASE_URL` to test an already running server instead of
starting a preview (the site is still built first); setup fails when that server
does not answer within five seconds. Install the
browser once with `pnpm exec playwright install chromium` inside `apps/docs` if
Playwright reports a missing executable.

Open `/docs/getting-started/introduction` after starting the dev server.

`pnpm dev` rebuilds the Radiant and React form packages before EcoPages starts.
The docs app consumes their published workspace entrypoints, so restart the dev
server after changing either package source.

React registry sources declare their JSX runtime explicitly and resolve Forms React through package exports. Keep provider and hook imports on the same package graph; source aliases in registry configuration create a second set of contexts when the app consumes built packages. For the same reason, `@schema-engine/forms-react` and its subpaths stay out of the React plugin's `runtimeModules`; the `@remarks` on the config in [eco.config.ts](./eco.config.ts) explains why.

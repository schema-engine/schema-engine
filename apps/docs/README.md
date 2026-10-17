# Docs

EcoPages docs site with EcoPages JSX MDX content and Radiant UI chrome.

## Structure

- `src/content/docs/**` — EcoPages JSX MDX entries with frontmatter (`title`, `description`, `group`, `order`), including Radiant and React demos. The Capabilities group documents cross-adapter behavior; recipes remain layout-only. Imported eco components and CSS are discovered automatically from top-level MDX imports; no `config.dependencies` block is needed. `FormRendererPreview` is a regular JSX page component (default integration, not an island): the form tree SSRs as light DOM and the base-layout client runtime wires its live engine after initial load and client-side navigation. React demos (`/docs/forms-react/**`) mount `ReactFormPreview` from `src/components/react-form-demo/` as React islands. Shared demo configurations live in `src/lib/form-configs/` (one module per form story; import the same object from multiple MDX pages when the demo is identical). Pages pass that object to live previews and `FormConfigCode`, which serializes it for the snippet, so demos and examples cannot drift. `.radiant.mdx` and `.react.mdx` are explicit MDX flavors for Radiant and React content. Typed in-app authoring is documented under Forms → Core concepts (Authoring modes) and Form engine setup (`defineForm` vs portable JSON).
- `src/lib/docs-nav.ts` — grouped navigation from content entries.
- `src/layouts/docs-layout` — shared Radiant UI sidebar, TOC, and pagination.
- `src/pages/docs/[...slug]/index.tsx` — catch-all route for MDX content.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm generate:llms
pnpm test:e2e
```

`pnpm test:e2e` builds the site, serves the production preview, and runs Playwright
checks that Forms React doc embeds hydrate (React island host + hydration script)
and that the getting-started demo surfaces validation after submit. Install the
browser once with `pnpm exec playwright install chromium` inside `apps/docs` if
Playwright reports a missing executable.

Open `/docs/getting-started/introduction` after starting the dev server.

`pnpm dev` rebuilds the Radiant and React form packages before EcoPages starts.
The docs app consumes their published workspace entrypoints, so restart the dev
server after changing either package source.

React registry sources declare their JSX runtime explicitly and resolve Forms React through package exports. Keep provider and hook imports on the same package graph; source aliases in registry configuration create a second set of contexts when the app consumes built packages. For the same reason, do not list `@schema-engine/forms-react` or its subpaths in the React plugin's `runtimeModules`: Ecopages builds each entry as a separate vendor, so every subpath would bundle its own copy of the contexts.

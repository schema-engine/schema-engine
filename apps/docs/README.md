# Docs

EcoPages docs site with EcoPages JSX MDX content, Radiant UI chrome, and explicit React pages.

## Structure

- `src/content/docs/**` — EcoPages JSX MDX entries with frontmatter (`title`, `description`, `group`, `order`), including Radiant demos. The Capabilities group documents cross-adapter behavior; recipes remain layout-only. Declare imported preview components in `export const config.dependencies.components`; the content API resolves their assets. `FormRendererPreview` is a regular JSX page component (default integration, not an island): the form tree SSRs as light DOM and the base-layout client runtime wires its live engine after initial load and client-side navigation. Demo configurations are declared in a `<page>.config.ts` module next to the MDX and passed as a prop; `FormConfigCode` serializes the same object for the snippet, so demos and examples cannot drift. `.radiant.mdx` is an explicit EcoPages-JSX-owned MDX flavor; React demos (`/docs/forms-react/**`) mount `ReactFormPreview` from `src/components/react-form-demo/` as React islands from eco JSX route pages and declare their configuration inline in the page.
- `src/pages/docs/forms-react/**/index.react.tsx` — React SSR pages with framework hydration. React files use `@jsxImportSource react`; `.react.tsx` selects the React integration. React does not own MDX. The server config initializes Radiant SSR before any route imports the shared shell, including a first request to a React page.
- `src/lib/explicit-docs-pages.ts` — metadata for explicit docs pages. Register new pages here so navigation, pagination, and LLM exports include them. Explicit metadata wins over content with the same slug, and the catch-all excludes those paths from static generation.
- `src/lib/docs-nav.ts` — navigation merged from content and explicit pages.
- `src/layouts/docs-layout` — shared Radiant UI sidebar, TOC, and pagination.
- `src/pages/docs/[...slug]/index.tsx` — fallback route for MDX content.
- `src/docs-text/**` — text companions for explicit pages, exported alongside MDX to `llms-content`. Update the companion when changing a React guide.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm generate:llms
pnpm exec tsx --test src/lib/explicit-docs-pages.test.ts
```

Open `/docs/getting-started/introduction` after starting the dev server.

`pnpm dev` rebuilds the Radiant and React form packages before EcoPages starts.
The docs app consumes their published workspace entrypoints, so restart the dev
server after changing either package source.

React registry sources declare their JSX runtime explicitly and resolve Forms React through package exports. Keep provider and hook imports on the same package graph; source aliases in registry configuration create a second set of contexts when the app consumes built packages.

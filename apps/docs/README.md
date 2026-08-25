# Docs

Ecopages docs site using content collections, Radiant UI chrome, and a catch-all docs route.

## Structure

- `src/content/docs/**` — MDX entries with frontmatter (`title`, `description`, `group`, `order`)
- `src/lib/content-nav.ts` — grouped sidebar from `ecopages:content/docs`
- `src/layouts/docs-layout` — Radiant UI sidebar, TOC, and pagination
- `src/pages/docs/[...slug]/index.tsx` — catch-all route for all docs pages

## Commands

```bash
bun install
bun dev
bun run generate:llms
```

Open `/docs/getting-started/introduction` after starting the dev server.

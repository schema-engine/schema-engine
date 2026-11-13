# Docs

EcoPages docs site with EcoPages JSX MDX content and Radiant UI chrome.

The Ecopages 0.6 CLI requires Node.js 24 or newer.

## Structure

- `src/content/docs/<section>/<page>.mdx` — EcoPages JSX MDX entries with frontmatter (`title`, `description`, `order`, optional `llms`). The first folder is the sidebar section; its title, icon and position come from the typed `DOCS_SECTION_CONFIG` and `DOCS_SECTION_ORDER` in `src/content/docs.ts` (icons in `src/content/section-icons.tsx`). `test/docs-sections.test.ts` fails when a page sits outside a configured section, nests deeper than one folder, or when a published docs URL loses its page; serve a redirect before removing one from its list. Pages include Radiant and React demos. The Capabilities section documents cross-adapter behavior; Actions documents sequential and parallel dispatch with cooperative cancellation; recipes remain layout-only. Imported eco components and CSS are discovered automatically from top-level MDX imports; no `config.dependencies` block is needed. `FormRendererPreview` is a regular JSX page component (default integration, not an island): the form tree SSRs as light DOM and the base and docs layout client scripts bind its live engine after initial load and client-side navigation. React demos (`/docs/forms-react/**`) mount `ReactFormPreview` from `src/components/react-form-demo/` as React islands. Shared demo configurations live in `src/lib/form-configs/` (one module per form story; import the same object from multiple MDX pages when the demo is identical). Pages pass that object to live previews and `FormConfigCode`, which serializes it for the snippet, so demos and examples cannot drift. All content is plain `.mdx`. React demos embed `ReactFormPreview` through the Ecopages JSX `EcoEmbed` plus a client hydration script, because `@ecopages/react/eco-embed` returns a React node that an Ecopages JSX file cannot render (checked on Ecopages 0.7.0). Typed in-app authoring is documented under Forms → Core concepts (Authoring modes) and Form engine setup (`defineForm` vs portable JSON). The custom-validation guide demonstrates an illustrative validator and the built-in debounced async rule; unit checks execute both snippets.
- `src/content/docs/styling/` — the Styling section: overview (with the "which tool do I use" table), layout themes, appearance axes, theming and recipes. `registry/registries.mdx` covers read-only and mutable registries and the catalog.
- `src/lib/recipes/` — the files the recipes page runs and shows: each recipe's CSS, the `tone` host axis and compiled `brandTheme`, the two engines that share it, and a custom recipe shell for React (`brand-frame.react.tsx`) and Radiant (`brand-frame.radiant.tsx`). Files import only packages (and each other with `./`), so they can be pasted into an app. `catalog.ts` lists the recipes; the configs live in `src/lib/form-configs/recipes.ts`.
- `src/components/recipe-demo/` — `RecipeDemo`: the live demo(s) of a recipe, then a tab per source. The config tab is serialized from the object the demo renders (`formConfigToCode`), the file tabs are the text of the files the demo runs (`readRecipeSource`), and a `.form.yaml` tab is written from the config with `stringifyYaml`, so a snippet cannot drift from its demo. A demo can name a Radiant engine with `data-docs-engine`; `preview-engine-binding.ts` assigns that engine on the client. The docs Radiant and React engines are both built on `brandTheme`. Recipes that use `fieldSet`, a wizard or the shared-theme engines render in Radiant only, because the React demo kit has no such elements or engines; the contact card, size tokens and custom shell render in both.
- `src/components/action-flow/` — interactive action playgrounds on the Actions overview. Each card dispatches through `ActionDispatcher` from `@schema-engine/actions`: tap a node to run that action, or the result to run the sequence. Motion respects the visitor's reduced-motion preference.
- `src/lib/docs-nav.ts` — sidebar sections built from content entries and `DOCS_SECTION_CONFIG`, plus the flat item list used for previous and next links.
- `src/components/code-tabs` — every instance needs a unique, id-safe `name` that prefixes its tab and panel ids; copy status clears after 2 seconds and failures are announced. Source tabs preserve plain-text indentation and copy the selected file verbatim; highlighted tabs retain their rendered markup and separate clipboard text.
- `src/layouts/docs-layout` — shared Radiant UI sidebar, TOC, and pagination, rendered on the server from the current route (`currentHref`).
- `src/pages/docs/[...slug]/index.tsx` — catch-all route for MDX content; sets the page `url` that drives the canonical link, the Markdown alternate and the Copy for LLM link.
- `src/mdx/` — MDX plugin factory (`createDocsMdxPlugins`). Fenced code gets a copy button (`transformerCopyButton` plus `rehype-pretty-copy-compatibility.ts`, which moves the button out of the scrolling `pre`), build-time heading ids (`rehype-heading-ids.ts`, same slug as `RuiToc`) and the shared Shiki themes (`shiki-themes.ts`). The click handler lives in `layouts/base-layout/code-copy.ts`, copied byte for byte from the Ecopages docs starter: the visible text reads Copy, then Copied or Try again for 1.2 s, the accessible name stays "Copy code", and the result is announced through the visually hidden `role="status"` region that `BaseLayout` renders at the end of `<body>`, so it survives browser-router navigation. Callouts use `RuiAlert variant="info" layout="banner" class="unstyled"`.
- `src/lib/docs/` — `site-meta.ts` (site name, origin, canonical, OG image, sitemap extras) and `docs-llm-url.ts`; both are copied from the Ecopages docs starter, with Schema Engine values and the starter's `/docs-llm/<section>/<slug>.md` export scheme. `ECOPAGES_BASE_URL` overrides the origin.
- `scripts/generate-llm-docs.ts` — writes `llms.txt` and `docs-llm/<section>/<slug>.md` into `src/public` in sidebar order, staged and swapped in only after every write succeeds. Frontmatter `llms: false` leaves a page out. Until the first release after 0.1.0 it also writes each page to the previous `llms-content/<slug>.txt` path (not listed in `llms.txt`) so published links keep working.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm generate:llms
pnpm check-types
pnpm test:all
pnpm test:e2e
```

`pnpm check-types` builds the site first, because the content processor writes the
`ecopages:content/*` module types during the build, then type-checks `src` and
`test`. Root `pnpm build:lib` runs it through `turbo check-types`, so it builds
the site too. Unused components that no longer type-check are excluded in `tsconfig.json`.

`pnpm test:all` runs the unit and browser projects (the unit project includes `test/styling-docs.test.ts`, which type-checks and runs the snippets of the styling and registries pages, checks the documented messages against the engine and resolves every internal link and heading fragment) (the root pre-commit `turbo test:all` calls it). `pnpm test:e2e` builds the site, serves the production preview on a free port, and
runs Playwright checks that the getting-started Forms React embed ships its
serialized config, hydrates, keeps typed values, and surfaces validation after
submit, and that the Radiant previews on the homepage and sequential-actions page submit and reset after direct or client-side navigation, and (`styling-pages.e2e.ts`) that every styling page loads, each recipe renders and lays out as documented (in React too for the recipes that have a React demo), and every source tab copies the text it shows. Set `DOCS_E2E_BASE_URL` to test an already running server instead of
starting a preview (the site is still built first); setup fails when that server
does not answer within five seconds. Install the
browser once with `pnpm exec playwright install chromium` inside `apps/docs` if
Playwright reports a missing executable.

Open `/docs/getting-started/introduction` after starting the dev server.

`pnpm dev` rebuilds the Radiant and React form packages before EcoPages starts.
The docs app consumes their published workspace entrypoints, so restart the dev
server after changing either package source.

React registry sources declare their JSX runtime explicitly and resolve Forms React through package exports. Keep provider and hook imports on the same package graph; source aliases in registry configuration create a second set of contexts when the app consumes built packages. For the same reason, `@schema-engine/forms-react` and its subpaths stay out of the React plugin's `runtimeModules`; the `@remarks` on the config in [eco.config.ts](./eco.config.ts) explains why.

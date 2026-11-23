# Contributing

Agent and coding standards live in [AGENTS.md](./AGENTS.md); domain vocabulary in [CONTEXT.md](./CONTEXT.md).

## Setup

```sh
pnpm install
pnpm exec playwright install chromium
```

Node 24 or newer and pnpm 10 are required. The browser tests of `forms-react`, `forms-radiant` and `docs` run in headless Chromium through Vitest browser mode, which is why Playwright's Chromium is installed.

## The pre-commit hook

[`.husky/pre-commit`](./.husky/pre-commit) runs these steps in order and stops at the first failure:

| Step | Command                      | What it checks                                                                                                                           |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `pnpm check-types:scripts`   | Type-checks the `scripts` package.                                                                                                       |
| 2    | `pnpm registry:check`        | The generated shadcn registry files match their sources.                                                                                 |
| 3    | `turbo check-types test:all` | Builds each package's dependencies, type-checks every package (the docs app included), then runs every package's unit and browser tests. |
| 4    | `pnpm lint-staged`           | Runs oxlint and Prettier on the staged files.                                                                                            |

Run the same checks yourself, in the same order:

```sh
pnpm check-types:scripts
pnpm registry:check
pnpm turbo check-types test:all
pnpm lint-staged
```

Type-checking runs in the hook, so a type error in any package or app blocks the commit. It costs about 10 seconds when turbo has the results cached (the docs app re-runs because its check builds the site) and about 40 seconds from a cold cache. To run it alone:

```sh
pnpm turbo check-types
```

Turbo builds a package (`build:lib`) and its sibling dependencies before it type-checks or tests the package, because the packages import themselves by name and that resolves to `dist`. So these commands work from a checkout with no `dist` folders, and a package's own build never runs beside its checks. To work on one package, filter turbo to it:

```sh
pnpm turbo test:all --filter=@schema-engine/forms-react
pnpm turbo check-types --filter=@schema-engine/forms-react
```

`pnpm --filter <package> test:all` skips turbo and so skips the sibling builds. It works only after `pnpm turbo build:lib` has built them.

Turbo caches `test:all` and `check-types` results. Add `--force` to run them again regardless of the cache.

Never skip the hook with `--no-verify` or `HUSKY=0`. If it fails, the failure is real or it is a bug in the hook: fix it or file an issue.

## Storybook

`forms-react` and `forms-radiant` each have a Storybook of their fields, recipes and layouts. Run one from the repository root:

```sh
pnpm dev:react-storybook     # forms-react, http://localhost:6006
pnpm dev:radiant-storybook   # forms-radiant, http://localhost:6007
pnpm build:react-storybook
pnpm build:radiant-storybook
```

The stories double as browser tests: `pnpm turbo test:all --filter=@schema-engine/forms-react` runs the `forms-react` ones, and `pnpm turbo test:storybook --filter=@schema-engine/forms-radiant` runs the Radiant ones.

## The docs app

`apps/docs` is the documentation site, built with Ecopages, Radiant UI and MDX. [Its README](./apps/docs/README.md) lists what lives where. Start it with `pnpm dev:docs`, build it with `pnpm build:docs`, and run its end-to-end tests with `pnpm test:e2e:docs`. A few things about it are not obvious from a docs page:

- **Previews use Radiant** because the site itself is Ecopages and Radiant UI, so a Radiant form needs no extra setup there. React demos use a small Radiant-styled kit (`apps/docs/src/components/react-form-demo/`) that mirrors the `rui-*` classes, so both renderers look alike next to each other. The live demos of a recipe render its config with these kits, and the recipe's own files run in its browser tests.
- **Radiant previews get their engine on the client.** A live engine object cannot be serialized into server-rendered markup, so `apps/docs/src/lib/preview-engine-binding.ts` assigns it to every `se-form-renderer` after load and after each client-side navigation.
- **The shadcn example renders copied source.** `apps/docs/scripts/copy-registry-demo.ts` copies the registry's `input` field and `card` recipe into `apps/docs/src/generated/shadcn` with the target paths and import rewrites `shadcn add` applies, and writes the components as `.react.tsx`, the extension the docs' React integration owns. It does not run the CLI. Only the page that shows the example loads its engine and stylesheets.
- **A recipe is a folder** under `apps/docs/src/lib/examples/` with a page of the same name in `apps/docs/src/content/docs/examples/`. `apps/docs/test/examples.test.ts` fails a recipe whose page does not show every file word for word, whose files import anything but packages and each other, or that has no test.
- **Every TypeScript fence of a page is type-checked** by `apps/docs/test/docs-snippets.test.ts`. A fence with `title="name.ts"` is a file that later fences of its page can import, and a fragment that cannot compile goes in its allow-list with the reason.
- **The skill and the `llms` exports are generated** into `apps/docs/src/public` from the packages and the pages, so they are never edited there.

## Browser tests

- In `forms-react` and `forms-radiant`, each browser project runs at most two test files at a time, and a package's projects run one after another (`unit`, then `browser`, then `storybook`), set by `browserProjectLimits` in [`scripts/vitest-browser-limits.ts`](./scripts/vitest-browser-limits.ts). `forms-react`'s `test:all` includes its storybook project; `forms-radiant`'s does not (`pnpm turbo test:storybook --filter=@schema-engine/forms-radiant` runs it). `docs` runs its files one at a time (`fileParallelism: false`) and starts after both packages finish. Turbo runs `forms-react` and `forms-radiant` in parallel, so up to four browser files can run together. A project that ran a file per core made tests time out whenever the machine was busy.
- Prefer `userEvent.fill` over `userEvent.type` when a test only needs a value in the field. `type` makes Playwright calls for every character (a keydown and a keyup), so a long string can exhaust the 15 s test timeout on a busy machine. Storybook `play` functions use Storybook's own `userEvent`, which acts inside the page and has no `fill`; this applies to the Vitest `userEvent` only. Use `type` and `keyboard` when the keystrokes are the behaviour under test.
- Do not fix a slow test by raising its timeout or adding retries; find what is slow.

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

Turbo builds each package's sibling dependencies (`build:lib`) before it type-checks or tests the package, so these commands work from a checkout with no `dist` folders. To work on one package, filter turbo to it:

```sh
pnpm turbo test:all --filter=@schema-engine/forms-react
pnpm turbo check-types --filter=@schema-engine/forms-react
```

`pnpm --filter <package> test:all` skips turbo and so skips the sibling builds. It works only after `pnpm turbo build:lib` has built them.

Turbo caches `test:all` and `check-types` results. Add `--force` to run them again regardless of the cache.

Never skip the hook with `--no-verify` or `HUSKY=0`. If it fails, the failure is real or it is a bug in the hook: fix it or file an issue.

## Browser tests

- In `forms-react` and `forms-radiant`, each browser project runs at most two test files at a time, and a package's projects run one after another (`unit`, then `browser`, then `storybook`), set by `browserProjectLimits` in [`scripts/vitest-browser-limits.ts`](./scripts/vitest-browser-limits.ts). `forms-react`'s `test:all` includes its storybook project; `forms-radiant`'s does not (`pnpm turbo test:storybook --filter=@schema-engine/forms-radiant` runs it). `docs` runs its files one at a time (`fileParallelism: false`) and starts after both packages finish. Turbo runs `forms-react` and `forms-radiant` in parallel, so up to four browser files can run together. A project that ran a file per core made tests time out whenever the machine was busy.
- Prefer `userEvent.fill` over `userEvent.type` when a test only needs a value in the field. `type` makes Playwright calls for every character (a keydown and a keyup), so a long string can exhaust the 15 s test timeout on a busy machine. Storybook `play` functions use Storybook's own `userEvent`, which acts inside the page and has no `fill`; this applies to the Vitest `userEvent` only. Use `type` and `keyboard` when the keystrokes are the behaviour under test.
- Do not fix a slow test by raising its timeout or adding retries; find what is slow.

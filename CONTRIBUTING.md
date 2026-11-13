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

| Step | Command                    | What it checks                                                                        |
| ---- | -------------------------- | ------------------------------------------------------------------------------------- |
| 1    | `pnpm check-types:scripts` | Type-checks the `scripts` package.                                                    |
| 2    | `pnpm registry:check`      | The generated shadcn registry files match their sources.                              |
| 3    | `turbo test:all`           | Builds each package's dependencies, then runs every package's unit and browser tests. |
| 4    | `pnpm lint-staged`         | Runs oxlint and Prettier on the staged files.                                         |

Run the same checks yourself, in the same order:

```sh
pnpm check-types:scripts
pnpm registry:check
pnpm test:all
pnpm lint-staged
```

Type-checking the whole workspace is not part of the hook because it also builds the docs app. Run it before opening a pull request:

```sh
pnpm turbo check-types
```

Turbo builds each package's sibling dependencies (`build:lib`) before it type-checks or tests the package, so these commands work from a checkout with no `dist` folders. To work on one package, filter to it:

```sh
pnpm --filter @schema-engine/forms-react test:all
pnpm --filter @schema-engine/forms-react check-types
```

Turbo caches `test:all` and `check-types` results. Add `--force` to run them again regardless of the cache.

Never skip the hook with `--no-verify` or `HUSKY=0`. If it fails, the failure is real or it is a bug in the hook: fix it or file an issue.

## Browser tests

- Browser projects run at most two test files at a time and run one after another (`unit`, then `browser`, then `storybook`), set by `browserProjectLimits` in [`scripts/vitest-browser-limits.ts`](./scripts/vitest-browser-limits.ts). A project that runs a file per core made tests time out whenever the machine was busy.
- Prefer `userEvent.fill` over `userEvent.type` when a test only needs a value in the field. `type` sends one command to the browser per character, so a long string can exhaust the 15 s test timeout on a busy machine. Use `type` and `keyboard` when the keystrokes are the behaviour under test.
- Do not fix a slow test by raising its timeout or adding retries; find what is slow.

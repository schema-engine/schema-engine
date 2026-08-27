# shadcn stubs

Registry sources import `@/components/ui/*` and `@/lib/utils` — files that belong to the **consumer's** shadcn install,
not to this repo. These stubs stand in for that install so `registry/*` can be typechecked and unit-tested here without
any app in the workspace owning a UI kit.

They are deliberately minimal: each one forwards its props to a native element so rendering works, and accepts the
superset of props the three bases pass (`variant`, `size`, `asChild`, `render`, …) so typechecking works. They are not
styled and are never published — no registry item references them.

A base can override a stub in `registry/<base>/ui-stubs/` when its wrappers expect a different prop shape; React Aria
does this because its wrappers pass `isSelected` / `selectedKey` instead of `checked` / `value`.

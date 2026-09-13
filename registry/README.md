# Schema Engine shadcn registry

The registry ships three component-base ports. Pick the aggregate that matches your shadcn project base. Install only one aggregate per app.

React JSX sources explicitly declare `@jsxImportSource react` so mixed-runtime apps compile them correctly. Shared registry imports resolve `@schema-engine/forms-react` through its package exports, keeping providers and hooks on the same runtime instance.

Form elements and view recipes live in `registry/shared/forms`. Each base only owns Schema Engine primitives (and React Aria wrapper overlays).

## Base UI (default)

```sh
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-form
```

## Radix UI

```sh
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-form-radix
```

## React Aria

```sh
pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-form-aria
```

Every form element is also available as an individual item (for example `schema-engine-form-input-radix`). Default visual recipes are a separate aggregate: `schema-engine-form-recipes`, `schema-engine-form-recipes-radix`, or `schema-engine-form-recipes-aria`. Installed Schema Engine source lives under `components/schema-engine/forms`; Schema Engine-owned primitives install under `components/ui/schema-engine/components`.

Shells and blocks are consumer-owned registry source and are selected through explicitly registered `view.$type` recipes.

## Source trees

Every file resolves the same way: if a base-specific override exists it wins, otherwise the shared implementation is
used. Wrappers and primitives each have their own pair of directories.

| Kind       | Shared implementation        | Base-specific override           |
| ---------- | ---------------------------- | -------------------------------- |
| Wrappers   | `registry/shared/forms`      | `registry/<base>/overlays/forms` |
| Primitives | `registry/shared/primitives` | `registry/<base>/primitives`     |

| Base       | Overrides                                         | Aggregate item      |
| ---------- | ------------------------------------------------- | ------------------- |
| Base UI    | combobox                                          | `schema-form`       |
| Radix UI   | combobox                                          | `schema-form-radix` |
| React Aria | combobox, phone input, drop zone + 7 RAC overlays | `schema-form-aria`  |

An override must genuinely differ from the shared file it shadows. `pnpm run registry:check` fails on any override that
is byte-identical to its shared original, so a base cannot accumulate copies that silently drift.

All four trees typecheck here. The shadcn primitives these sources import (`@/components/ui/*`, `@/lib/utils`) belong to
the consumer's install, so `registry/ui-stubs` stands in for them — see its README. A base can override a stub in
`registry/<base>/ui-stubs` when its wrappers expect a different prop shape, which is why React Aria has its own.

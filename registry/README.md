# Schema Engine shadcn registry

The registry ships three component-base ports. Pick the aggregate that matches your shadcn project base. Install only one aggregate per app.

Registry field and recipe components are plain React TSX; consumers compile them with their app `jsx` settings (typically `react-jsx`). Shared registry imports resolve `@schema-engine/forms-react` through its package exports, keeping providers and hooks on the same runtime instance.

Form elements and view recipes live in `registry/shared/forms`. Each base only owns Schema Engine primitives (and React Aria wrapper overlays).
The generated root `registry.json` lists all three ports and resolves each source path from the repository root. Shared implementations remain in `registry/shared`; the catalog selects a base-specific override where one exists. This keeps every source path inside the registry root for the shadcn CLI.

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

## Recipe styles

A recipe item ships its CSS beside the components, as `registry:file` entries the shadcn CLI copies to the `target` as given (`@components/schema-engine/forms/recipes/recipes.css` and one file per shell and block that has layout, such as `shells/card-shell.css` or `blocks/form-actions.css`). Nothing imports the CSS for you, so import the entry point once in the app's global stylesheet, after Tailwind, into the `components` layer:

```css
@import 'tailwindcss';
@import './components/schema-engine/forms/recipes/recipes.css' layer(components);
```

The path is relative to your global stylesheet: `./components/schema-engine/forms/recipes/recipes.css` from a Vite `src/index.css`, `../components/schema-engine/forms/recipes/recipes.css` from a Next.js `app/globals.css`. The `layer(components)` keeps the recipe rules below Tailwind utilities; without Tailwind, import the file plain. Every rule sits inside `:where()`, so a host class on the same element wins either way. The card shell, the only shell with styles so far, carries no inline styles and reads the appearance tokens (`--se-space`, `--se-measure`, `--se-border-width`, `--se-shadow`, `--se-surface-background`) that the form's layout theme declares for the `data-se-size` and `data-se-surface` attributes. With the built-in axes and no host theme overrides, one `appearance` config gives the same card geometry here as in Radiant.

The control height of the `size` axis, the field font size and the full-width text input ship separately, as `controls.css` in the `schema-engine-form-field-primitive` item (every form element and the recipes depend on it), at `components/ui/schema-engine/components/controls.css` in a default setup. Import it **unlayered**, after the layered recipes import:

```css
@import 'tailwindcss';
@import './components/schema-engine/forms/recipes/recipes.css' layer(components);
@import './components/ui/schema-engine/components/controls.css';
```

A control that carries `data-se-control` (the input, masked input, phone input and its country button, number field and its steppers, date and date range triggers, the date segments, the single-select trigger, the single-select combobox input or trigger, the submit button and the wizard buttons) reads `var(--se-control-height, revert-layer)`. `compact` and `comfortable` size it (`1.75rem` and `2.25rem` unless the host sets `--se-control-height-compact` or `--se-control-height-comfortable`); no pick or `default` rolls back to the height of your own `ui` component. It has to be unlayered because a shadcn control sets its height with a Tailwind utility (`h-8`), which outranks every `components` layer rule: only an unlayered rule lets the pick win, and `revert-layer` then returns to the utility when nothing is picked. The cost: while a size is picked, a Tailwind height utility you pass to the control loses to this rule, while an unlayered class of yours still wins (the rule sits in `:where()`). A form that mixes controls with and without the attribute mixes heights, so the multi-select trigger and combobox chips, the textarea, the OTP slots, the checkbox, radio and switch controls and the drop zone are left out on purpose: they are not single-line controls.

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

Run `pnpm --filter @schema-engine/registry-files check-types` to check all four
registry source configurations; Turbo includes this workspace in `check-types`.

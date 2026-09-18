---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
---

Grid layout becomes theme-driven pure CSS. The engine owns the grid vocabulary
through a new `grid` option on `createFormEngine`/`createFormEngine` variants:
breakpoint thresholds (`sm`…`2xl`), gap token definitions
(`none | compact | default | loose | wide`), and the default minimum column
width. Forms describe layout with `columns`, `gap`/`gapX`/`gapY`, responsive
entries per breakpoint, and per-field `grid` placement. `grid.gap` no longer
accepts numbers — semantic tokens or raw CSS values only. Renderers generate
the theme-scoped stylesheet (scoped to `data-se-grid-theme`) and emit it inline
during render with the form's CSS variables, so responsive layout is CSS-driven
(media queries), SSR output is styled without FOUC, and hydration is not
required for layout.

The generated stylesheet owns everything that is not a per-form value: neutral
defaults, the breakpoint cascade (each media query falls back through the
narrower slots), and the `initial` resets that stop a nested grid or field
inheriting its parent's placement. Renderers therefore emit only the values an
author actually wrote — an element without a `grid` config carries no inline
style at all.

`placeItems`, `placeContent` and `placeSelf` are resolved into their axis
longhands instead of being declared as CSS shorthands, following the CSS
grammar so a two-keyword axis value such as `safe center` or `first baseline`
stays on one axis. The axis property wins when both are authored. Field
`justify-self`/`align-self` default to `auto` so form-level
`justifyItems`/`alignItems` still applies, and a field host keeps its own
layout: set `--se-field-display-mode` instead of `display`, which responsive
`hidden` toggles against. Gap tokens remain overridable from `:root` — the
engine declares its defaults under `--se-grid-gap-base-*` and reads the public
token with that as the fallback.

Field responsive placement cascades across breakpoints like form columns.
Grid themes are frozen at engine construction as one compiled
`engine.getCompiledGrid()` value (theme plus stylesheet), with
`engine.getGridTheme()` as a convenience getter.
`engine.extend()` no longer accepts a `grid` option (the compiled grid is
inherited). Breakpoint thresholds must preserve named cascade order.
